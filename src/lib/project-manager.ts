import { db, type DBProject } from "./db";
import { useProjectStore } from "@/store/project-store";
import { useEffectsStore } from "@/store/effects-store";
import { useTimelineStore } from "@/store/timeline-store";

export interface ProjectData {
    version: string;
    project: ReturnType<typeof useProjectStore.getState>;
    effects: ReturnType<typeof useEffectsStore.getState>;
    timeline: ReturnType<typeof useTimelineStore.getState>;
}

export class ProjectManager {
    private static instance: ProjectManager;

    private constructor() { }

    static getInstance(): ProjectManager {
        if (!ProjectManager.instance) {
            ProjectManager.instance = new ProjectManager();
        }
        return ProjectManager.instance;
    }

    async saveProject(name: string, id?: number): Promise<number> {
        const projectData: ProjectData = {
            version: "1.0.0",
            project: useProjectStore.getState(),
            effects: useEffectsStore.getState(),
            timeline: useTimelineStore.getState(),
        };

        const dbProject: DBProject = {
            id,
            name,
            data: JSON.stringify(projectData),
            updatedAt: Date.now(),
            createdAt: id ? (await db.projects.get(id))?.createdAt || Date.now() : Date.now(),
        };

        if (id) {
            await db.projects.update(id, dbProject);
            return id;
        } else {
            return (await db.projects.add(dbProject)) as number;
        }
    }

    async loadProject(id: number): Promise<void> {
        const dbProject = await db.projects.get(id);
        if (!dbProject) {
            throw new Error("Project not found");
        }

        const projectData: ProjectData = JSON.parse(dbProject.data);

        // Restore all stores
        useProjectStore.setState(projectData.project);
        useEffectsStore.setState(projectData.effects);
        useTimelineStore.setState(projectData.timeline);
    }

    async deleteProject(id: number): Promise<void> {
        await db.projects.delete(id);
        // Also delete associated assets
        await db.assets.where("projectId").equals(id).delete();
    }

    async listProjects(): Promise<DBProject[]> {
        return await db.projects.orderBy("updatedAt").reverse().toArray();
    }

    async exportProjectAsJSON(id: number): Promise<string> {
        const dbProject = await db.projects.get(id);
        if (!dbProject) {
            throw new Error("Project not found");
        }
        return dbProject.data;
    }

    async importProjectFromJSON(name: string, jsonData: string): Promise<number> {
        const projectData: ProjectData = JSON.parse(jsonData);

        const dbProject: DBProject = {
            name,
            data: jsonData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        return (await db.projects.add(dbProject)) as number;
    }

    async createNewProject(name: string = "Untitled Project"): Promise<void> {
        // Reset all stores to default state
        useProjectStore.getState().resetProject();
        useTimelineStore.getState().reset();

        useEffectsStore.setState({
            surfaceEffects: {},
            globalEffects: {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                hue: 0,
                colorTint: { r: 1, g: 1, b: 1 },
                blur: 0,
                chromaticAberration: 0,
                rgbShift: 0,
                blendLeft: 0,
                blendRight: 0,
                blendTop: 0,
                blendBottom: 0,
                blendFeather: 1,
                blendGamma: 2.2,
            },
        });

        // Update project name
        useProjectStore.getState().updateProjectSettings({ name });
    }
}

export const projectManager = ProjectManager.getInstance();
