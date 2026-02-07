"use client";

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/store/project-store";
import { projectManager } from "@/lib/project-manager";

export function useAutoSave(debounceMs: number = 3000) {
    const project = useProjectStore((state) => state);
    const saveTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Don't auto-save if we don't have a projectId yet (unless you want to create a new project on first change)
        if (!project.currentProjectId) return;

        // Debounce save
        if (saveTimer.current) {
            clearTimeout(saveTimer.current);
        }

        saveTimer.current = setTimeout(async () => {
            try {
                console.log("Auto-saving project...");
                await projectManager.saveProject(
                    project.projectSettings.name,
                    project.currentProjectId!
                );
            } catch (error) {
                console.error("Auto-save failed:", error);
            }
        }, debounceMs);

        return () => {
            if (saveTimer.current) {
                clearTimeout(saveTimer.current);
            }
        };
    }, [project.surfaces, project.projectSettings, project.currentProjectId, debounceMs]);
}
