"use client";

import { useState } from "react";
import { projectManager } from "@/lib/project-manager";
import { useProjectStore } from "@/store/project-store";
import {
    FileText,
    FolderOpen,
    Save,
    Download,
    Upload,
    Plus,
    ChevronDown,
} from "lucide-react";

export function ProjectMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
    const projectName = useProjectStore((state) => state.projectSettings.name);

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

        // Simple selection (in production, this would be a modal)
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
                    <div className="absolute top-full left-0 mt-1 w-48 glass rounded-md shadow-lg z-50 py-1">
                        <button
                            onClick={handleNew}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Project
                        </button>
                        <button
                            onClick={handleOpen}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <FolderOpen className="w-4 h-4" />
                            Open...
                        </button>
                        <div className="h-px bg-white/10 my-1" />
                        <button
                            onClick={handleSave}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save
                        </button>
                        <button
                            onClick={handleSaveAs}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
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
        </div>
    );
}
