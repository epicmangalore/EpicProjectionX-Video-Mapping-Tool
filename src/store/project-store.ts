import { create } from "zustand";
import { generateId } from "@/lib/utils";

export interface Vector2 {
    x: number;
    y: number;
}

export interface Surface {
    id: string;
    name: string;
    position: Vector2;
    rotation: number;
    scale: Vector2;
    opacity: number;
    zIndex: number;
    mediaId: string | null;
    blendMode: BlendMode;
    corners: [Vector2, Vector2, Vector2, Vector2]; // TL, TR, BR, BL
    meshWarp: MeshWarpData | null;
    effects: Effect[];
}

export interface MeshWarpData {
    gridSize: number; // NxN grid
    controlPoints: Vector2[][]; // 2D array of control points
}

export interface Effect {
    id: string;
    type: EffectType;
    enabled: boolean;
    params: Record<string, number>;
}

export type EffectType =
    | "blur"
    | "chromatic"
    | "rgbShift"
    | "kaleidoscope"
    | "pixelate"
    | "wave"
    | "edgeBlend";

export type BlendMode =
    | "normal"
    | "multiply"
    | "screen"
    | "overlay"
    | "additive";

export interface MediaAsset {
    id: string;
    name: string;
    type: "image" | "video" | "color" | "webcam" | "text" | "shader";
    url?: string;
    thumbnail?: string;
    size?: number;
    duration?: number; // for videos
    color?: string; // for color fills
    text?: string; // for text overlays
}

export interface Cue {
    id: string;
    name: string;
    hotkey?: string;
    surfaces: Surface[];
    timelinePosition: number;
}

export interface ProjectSettings {
    name: string;
    resolution: { width: number; height: number };
    fps: number;
    backgroundColor: string;
}

interface ProjectStore {
    // State
    surfaces: Surface[];
    mediaAssets: MediaAsset[];
    cues: Cue[];
    projectSettings: ProjectSettings;
    selectedSurfaceIds: string[];

    // Surface actions
    addSurface: (mediaId?: string) => void;
    updateSurface: (id: string, updates: Partial<Surface>) => void;
    deleteSurface: (id: string) => void;
    duplicateSurface: (id: string) => void;

    // Selection actions
    selectSurface: (id: string, multi?: boolean) => void;
    deselectAll: () => void;

    // Media actions
    addMediaAsset: (asset: MediaAsset) => void;
    removeMediaAsset: (id: string) => void;

    // Cue actions
    addCue: (name: string) => void;
    triggerCue: (id: string) => void;
    deleteCue: (id: string) => void;

    // Project actions
    updateProjectSettings: (settings: Partial<ProjectSettings>) => void;
    resetProject: () => void;
}

const defaultProjectSettings: ProjectSettings = {
    name: "Untitled Project",
    resolution: { width: 1920, height: 1080 },
    fps: 60,
    backgroundColor: "#0a0a0f",
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
    // Initial state
    surfaces: [],
    mediaAssets: [],
    cues: [],
    projectSettings: defaultProjectSettings,
    selectedSurfaceIds: [],

    // Surface actions
    addSurface: (mediaId) => {
        const newSurface: Surface = {
            id: generateId(),
            name: `Surface ${get().surfaces.length + 1}`,
            position: { x: 0, y: 0 },
            rotation: 0,
            scale: { x: 1, y: 1 },
            opacity: 1,
            zIndex: get().surfaces.length,
            mediaId: mediaId || null,
            blendMode: "normal",
            corners: [
                { x: -0.5, y: -0.5 }, // TL
                { x: 0.5, y: -0.5 },  // TR
                { x: 0.5, y: 0.5 },   // BR
                { x: -0.5, y: 0.5 },  // BL
            ],
            meshWarp: null,
            effects: [],
        };
        set((state) => ({
            surfaces: [...state.surfaces, newSurface],
            selectedSurfaceIds: [newSurface.id],
        }));
    },

    updateSurface: (id, updates) => {
        set((state) => ({
            surfaces: state.surfaces.map((s) =>
                s.id === id ? { ...s, ...updates } : s
            ),
        }));
    },

    deleteSurface: (id) => {
        set((state) => ({
            surfaces: state.surfaces.filter((s) => s.id !== id),
            selectedSurfaceIds: state.selectedSurfaceIds.filter((sid) => sid !== id),
        }));
    },

    duplicateSurface: (id) => {
        const surface = get().surfaces.find((s) => s.id === id);
        if (!surface) return;

        const newSurface: Surface = {
            ...surface,
            id: generateId(),
            name: `${surface.name} (Copy)`,
            position: {
                x: surface.position.x + 0.1,
                y: surface.position.y + 0.1,
            },
            zIndex: get().surfaces.length,
        };

        set((state) => ({
            surfaces: [...state.surfaces, newSurface],
            selectedSurfaceIds: [newSurface.id],
        }));
    },

    // Selection actions
    selectSurface: (id, multi = false) => {
        set((state) => {
            if (multi) {
                const isSelected = state.selectedSurfaceIds.includes(id);
                return {
                    selectedSurfaceIds: isSelected
                        ? state.selectedSurfaceIds.filter((sid) => sid !== id)
                        : [...state.selectedSurfaceIds, id],
                };
            }
            return { selectedSurfaceIds: [id] };
        });
    },

    deselectAll: () => {
        set({ selectedSurfaceIds: [] });
    },

    // Media actions
    addMediaAsset: (asset) => {
        set((state) => ({
            mediaAssets: [...state.mediaAssets, asset],
        }));
    },

    removeMediaAsset: (id) => {
        set((state) => ({
            mediaAssets: state.mediaAssets.filter((a) => a.id !== id),
        }));
    },

    // Cue actions
    addCue: (name) => {
        const newCue: Cue = {
            id: generateId(),
            name,
            surfaces: JSON.parse(JSON.stringify(get().surfaces)), // Deep clone
            timelinePosition: 0,
        };
        set((state) => ({
            cues: [...state.cues, newCue],
        }));
    },

    triggerCue: (id) => {
        const cue = get().cues.find((c) => c.id === id);
        if (!cue) return;

        // Restore surfaces from cue
        set({ surfaces: JSON.parse(JSON.stringify(cue.surfaces)) });
    },

    deleteCue: (id) => {
        set((state) => ({
            cues: state.cues.filter((c) => c.id !== id),
        }));
    },

    // Project actions
    updateProjectSettings: (settings) => {
        set((state) => ({
            projectSettings: { ...state.projectSettings, ...settings },
        }));
    },

    resetProject: () => {
        set({
            surfaces: [],
            mediaAssets: [],
            cues: [],
            projectSettings: defaultProjectSettings,
            selectedSurfaceIds: [],
        });
    },
}));
