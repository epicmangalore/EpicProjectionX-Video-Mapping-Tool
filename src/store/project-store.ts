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
    corners: Vector2[]; // Support N-point polygons
    meshWarp: MeshWarpData | null;
    effects: Effect[];
    visible: boolean;
    locked: boolean;
    audioMappings: AudioMapping[];
}

export interface AudioMapping {
    id: string;
    band: "bass" | "mid" | "treble" | "volume";
    property: string; // e.g., "opacity", "blur", "chromatic"
    min: number;
    max: number;
    enabled: boolean;
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
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    lineHeight?: number;
    letterSpacing?: number;
    textColor?: string;
    textAlign?: "left" | "right" | "center" | "start" | "end";
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
    masterOpacity: number;
    masterBrightness: number;
    blackout: boolean;
    paused: boolean;
    snapToGrid: boolean;
    snapToSurfaces: boolean;
    snapThreshold: number;
    showCanvasFrame: boolean;
    showSafeArea: boolean;
}

interface ProjectStore {
    // State
    surfaces: Surface[];
    mediaAssets: MediaAsset[];
    cues: Cue[];
    projectSettings: ProjectSettings;
    selectedSurfaceIds: string[];
    currentProjectId: number | null;

    // Surface actions
    addSurface: (mediaId?: string) => void;
    updateSurface: (id: string, updates: Partial<Surface>) => void;
    deleteSurface: (id: string) => void;
    duplicateSurface: (id: string) => void;
    toggleVisibility: (id: string) => void;
    toggleLock: (id: string) => void;
    reorderSurface: (id: string, newIndex: number) => void;

    // Selection actions
    selectSurface: (id: string, multi?: boolean) => void;
    deselectAll: () => void;

    // Media actions
    addMediaAsset: (asset: MediaAsset) => void;
    updateMediaAsset: (id: string, updates: Partial<MediaAsset>) => void;
    removeMediaAsset: (id: string) => void;

    // Cue actions
    addCue: (name: string) => void;
    triggerCue: (id: string) => void;
    deleteCue: (id: string) => void;

    // Project actions
    updateProjectSettings: (settings: Partial<ProjectSettings>) => void;
    addCorner: (surfaceId: string, index: number, point: Vector2) => void;
    removeCorner: (surfaceId: string, index: number) => void;
    resetCorners: (surfaceId: string) => void;
    resetProject: () => void;

    // History
    history: HistoryState[];
    future: HistoryState[];
    undo: () => void;
    redo: () => void;
    saveHistory: () => void;
}

interface HistoryState {
    surfaces: Surface[];
    projectSettings: ProjectSettings;
}

const defaultProjectSettings: ProjectSettings = {
    name: "Untitled Project",
    resolution: { width: 1920, height: 1080 },
    fps: 60,
    backgroundColor: "#0a0a0f",
    masterOpacity: 1,
    masterBrightness: 1,
    blackout: false,
    paused: false, // Default to playing
    snapToGrid: true,
    snapToSurfaces: true,
    snapThreshold: 0.05,
    showCanvasFrame: true,
    showSafeArea: false,
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
    // Initial state
    surfaces: [],
    mediaAssets: [],
    cues: [],
    projectSettings: defaultProjectSettings,
    selectedSurfaceIds: [],
    currentProjectId: null,

    // Surface actions
    addSurface: (mediaId) => {
        get().saveHistory();
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
                { x: -0.5, y: 0.5 },  // TL
                { x: 0.5, y: 0.5 },   // TR
                { x: 0.5, y: -0.5 },  // BR
                { x: -0.5, y: -0.5 }, // BL
            ],
            meshWarp: null,
            effects: [],
            visible: true,
            locked: false,
            audioMappings: [],
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
        get().saveHistory();
        set((state) => ({
            surfaces: state.surfaces.filter((s) => s.id !== id),
            selectedSurfaceIds: state.selectedSurfaceIds.filter((sid) => sid !== id),
        }));
    },

    duplicateSurface: (id) => {
        get().saveHistory();
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

    toggleVisibility: (id) => {
        set((state) => ({
            surfaces: state.surfaces.map((s) =>
                s.id === id ? { ...s, visible: !s.visible } : s
            ),
        }));
    },

    toggleLock: (id) => {
        set((state) => ({
            surfaces: state.surfaces.map((s) =>
                s.id === id ? { ...s, locked: !s.locked } : s
            ),
        }));
    },

    reorderSurface: (id, newIndex) => {
        set((state) => {
            const currentSurfaces = [...state.surfaces].sort((a, b) => a.zIndex - b.zIndex);
            const index = currentSurfaces.findIndex(s => s.id === id);
            if (index === -1) return state;

            const [removed] = currentSurfaces.splice(index, 1);
            currentSurfaces.splice(newIndex, 0, removed);

            // Re-assign z-indices based on new order
            const updatedSurfaces = state.surfaces.map(s => {
                const newZ = currentSurfaces.findIndex(cs => cs.id === s.id);
                return { ...s, zIndex: newZ };
            });

            return { surfaces: updatedSurfaces };
        });
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

    updateMediaAsset: (id, updates) => {
        set((state) => ({
            mediaAssets: state.mediaAssets.map((a) =>
                a.id === id ? { ...a, ...updates } : a
            ),
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

    addCorner: (surfaceId, index, point) => {
        get().saveHistory();
        set((state) => ({
            surfaces: state.surfaces.map((s) => {
                if (s.id !== surfaceId) return s;
                const newCorners = [...s.corners];
                newCorners.splice(index, 0, point);
                return { ...s, corners: newCorners };
            }),
        }));
    },

    removeCorner: (surfaceId, index) => {
        get().saveHistory();
        set((state) => ({
            surfaces: state.surfaces.map((s) => {
                if (s.id !== surfaceId || s.corners.length <= 3) return s;
                const newCorners = [...s.corners];
                newCorners.splice(index, 1);
                return { ...s, corners: newCorners };
            }),
        }));
    },

    resetCorners: (surfaceId) => {
        get().saveHistory();
        set((state) => ({
            surfaces: state.surfaces.map((s) => {
                if (s.id !== surfaceId) return s;
                return {
                    ...s,
                    corners: [
                        { x: -0.5, y: 0.5 },
                        { x: 0.5, y: 0.5 },
                        { x: 0.5, y: -0.5 },
                        { x: -0.5, y: -0.5 },
                    ],
                };
            }),
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

    // History Implementation
    history: [],
    future: [],

    saveHistory: () => {
        const { surfaces, projectSettings, history } = get();
        const snapshot = {
            surfaces: JSON.parse(JSON.stringify(surfaces)),
            projectSettings: JSON.parse(JSON.stringify(projectSettings))
        };
        set({
            history: [...history, snapshot].slice(-50),
            future: []
        });
    },

    undo: () => {
        const { history, future, surfaces, projectSettings } = get();
        if (history.length === 0) return;

        const previous = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        const currentSnapshot = {
            surfaces: JSON.parse(JSON.stringify(surfaces)),
            projectSettings: JSON.parse(JSON.stringify(projectSettings))
        };

        set({
            history: newHistory,
            future: [currentSnapshot, ...future].slice(0, 50),
            surfaces: previous.surfaces,
            projectSettings: previous.projectSettings
        });
    },

    redo: () => {
        const { history, future, surfaces, projectSettings } = get();
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);
        const currentSnapshot = {
            surfaces: JSON.parse(JSON.stringify(surfaces)),
            projectSettings: JSON.parse(JSON.stringify(projectSettings))
        };

        set({
            history: [...history, currentSnapshot].slice(-50),
            future: newFuture,
            surfaces: next.surfaces,
            projectSettings: next.projectSettings
        });
    },
}));
