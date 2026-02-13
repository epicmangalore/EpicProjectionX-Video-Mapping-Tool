"use client";

import { useState, useRef } from "react";
import { projectManager } from "@/lib/project-manager";
import { saveProjectFile, loadProjectFile } from "@/lib/project-file-manager";
import { useProjectStore } from "@/store/project-store";
import {
    FileText,
    FolderOpen,
    Save,
    Plus,
    ChevronDown,
    Package,
} from "lucide-react";

export function ProjectMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const projectName = useProjectStore((state) => state.projectSettings.name);
    const updateProjectSettings = useProjectStore((state) => state.updateProjectSettings);
    const projectxInputRef = useRef<HTMLInputElement>(null);

    const handleNew = async () => {
        if (confirm("Create a new project? Unsaved changes will be lost.")) {
            await projectManager.createNewProject();
            setIsOpen(false);
        }
    };

    const handleSaveAs = async () => {
        const name = prompt("Enter project name:", projectName);
        if (name) {
            updateProjectSettings({ name });
            await projectManager.saveProject(name);
            setIsOpen(false);
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
            setIsOpen(false);
        } catch (err: unknown) {
            console.error("Failed to load .projectx:", err);
            alert(`Failed to load project: ${(err as Error).message}`);
        }

        // Reset input so the same file can be selected again
        if (projectxInputRef.current) projectxInputRef.current.value = "";
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-1.5 text-sm glass glass-hover rounded-md flex items-center gap-2"
                data-tour="export-menu"
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

                        <button
                            onClick={handleSaveAs}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4 opacity-50" />
                            Save As...
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

        </div>
    );
}
