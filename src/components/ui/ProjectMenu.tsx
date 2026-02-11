"use client";

import { useState, useRef } from "react";
import { projectManager } from "@/lib/project-manager";
import { saveProjectFile, loadProjectFile } from "@/lib/project-file-manager";
import { useProjectStore } from "@/store/project-store";
import { ExportDialog } from "@/components/dialogs/ExportDialog";
import {
    FileText,
    FolderOpen,
    Save,
    Download,
    Upload,
    Plus,
    ChevronDown,
    Package,
    FileVideo,
} from "lucide-react";

export function ProjectMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
    const projectName = useProjectStore((state) => state.projectSettings.name);
    const updateProjectSettings = useProjectStore((state) => state.updateProjectSettings);
    const projectxInputRef = useRef<HTMLInputElement>(null);

    const handleNew = async () => {
        if (confirm("Create a new project? Unsaved changes will be lost.")) {
            await projectManager.createNewProject();
            setCurrentProjectId(null);
            setIsOpen(false);
        }
    };

    const handleSave = async () => {
        const name = projectName || "Untitled Project";
        const id = await projectManager.saveProject(name, currentProjectId || undefined);
        setCurrentProjectId(id);
        setIsOpen(false);
    };

    const handleSaveAs = async () => {
        const name = prompt("Enter project name:", projectName);
        if (name) {
            updateProjectSettings({ name });
            const id = await projectManager.saveProject(name);
            setCurrentProjectId(id);
            setIsOpen(false);
        }
    };

    const handleOpen = async () => {
        const projects = await projectManager.listProjects();
        if (projects.length === 0) {
            alert("No saved projects found");
            return;
        }

        const projectList = projects
            .map((p, i) => `${i + 1}. ${p.name} (${new Date(p.updatedAt).toLocaleString()})`)
            .join("\n");

        const selection = prompt(`Select a project:\n${projectList}\n\nEnter number:`);
        if (selection) {
            const index = parseInt(selection) - 1;
            if (index >= 0 && index < projects.length) {
                await projectManager.loadProject(projects[index].id!);
                setCurrentProjectId(projects[index].id!);
                setIsOpen(false);
            }
        }
    };

    // ── .projectx handlers ─────────────────────────────────────────

    const handleSaveProjectX = async () => {
        setIsSaving(true);
        try {
            const name = projectName || "Untitled Project";
            await saveProjectFile(name);
        } catch (err) {
            console.error("Failed to save .projectx:", err);
            alert("Failed to save project file. Check console for details.");
        } finally {
            setIsSaving(false);
            setIsOpen(false);
        }
    };

    const handleSaveProjectXLight = async () => {
        setIsSaving(true);
        try {
            const name = projectName || "Untitled Project";
            await saveProjectFile(name, { includeAssets: false });
        } catch (err) {
            console.error("Failed to save .projectx:", err);
            alert("Failed to save project file. Check console for details.");
        } finally {
            setIsSaving(false);
            setIsOpen(false);
        }
    };

    const handleOpenProjectX = () => {
        projectxInputRef.current?.click();
    };

    const handleProjectXFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await loadProjectFile(file);
            setCurrentProjectId(null); // It's a file-based project now
            setIsOpen(false);
        } catch (err: unknown) {
            console.error("Failed to load .projectx:", err);
            alert(`Failed to load project: ${(err as Error).message}`);
        }

        // Reset input so the same file can be selected again
        if (projectxInputRef.current) projectxInputRef.current.value = "";
    };

    // ── Legacy JSON handlers ───────────────────────────────────────

    const handleExport = async () => {
        if (!currentProjectId) {
            alert("Please save the project first");
            return;
        }

        const json = await projectManager.exportProjectAsJSON(currentProjectId);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${projectName}.projx.json`;
        a.click();
        URL.revokeObjectURL(url);
        setIsOpen(false);
    };

    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,.projx.json";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const text = await file.text();
                const projectData = JSON.parse(text);
                // Validate basic structure
                if (!projectData.surfaces || !projectData.projectSettings) {
                    alert("Invalid project file");
                    return;
                }
                const name = file.name.replace(/\.(projx\.)?json$/, "");
                await projectManager.importProjectFromJSON(name, text);
                alert("Project imported successfully");
                setIsOpen(false);
            }
        };
        input.click();
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-1.5 text-sm glass glass-hover rounded-md flex items-center gap-2"
            >
                <FileText className="w-4 h-4" />
                File
                <ChevronDown className="w-3 h-3" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-56 glass rounded-md shadow-lg z-50 py-1">
                        <button
                            onClick={handleNew}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Project
                        </button>

                        <div className="h-px bg-white/10 my-1" />

                        {/* .projectx file operations */}
                        <button
                            onClick={handleOpenProjectX}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <FolderOpen className="w-4 h-4" />
                            Open .projectx...
                        </button>
                        <button
                            onClick={handleSaveProjectX}
                            disabled={isSaving}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Package className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save as .projectx"}
                            <span className="ml-auto text-[10px] text-zinc-500 font-mono">⌘S</span>
                        </button>
                        <button
                            onClick={handleSaveProjectXLight}
                            disabled={isSaving}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Package className="w-4 h-4 opacity-50" />
                            {isSaving ? "Saving..." : "Save .projectx (no assets)"}
                        </button>

                        <div className="h-px bg-white/10 my-1" />

                        {/* Quick save to IndexedDB */}
                        <button
                            onClick={handleSave}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Quick Save
                        </button>
                        <button
                            onClick={handleOpen}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <FolderOpen className="w-4 h-4 opacity-50" />
                            Quick Load...
                        </button>
                        <button
                            onClick={handleSaveAs}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4 opacity-50" />
                            Save As...
                        </button>

                        <div className="h-px bg-white/10 my-1" />

                        <button
                            onClick={handleExport}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export JSON
                        </button>

                        {/* Export to After Effects/Premiere */}
                        <button
                            onClick={() => {
                                setShowExportDialog(true);
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2 text-electric-cyan"
                        >
                            <FileVideo className="w-4 h-4" />
                            Export to AE/Premiere...
                        </button>
                        <button
                            onClick={handleImport}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Import JSON
                        </button>
                    </div>
                </>
            )}

            {/* Hidden file input for .projectx */}
            <input
                ref={projectxInputRef}
                type="file"
                accept=".projectx"
                className="hidden"
                onChange={handleProjectXFileSelected}
            />

            {/* Export Dialog */}
            <ExportDialog
                isOpen={showExportDialog}
                onClose={() => setShowExportDialog(false)}
            />
        </div>
    );
}
