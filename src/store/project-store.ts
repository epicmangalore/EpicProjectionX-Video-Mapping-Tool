import { create } from "zustand";
import { persist } from "zustand/middleware";
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
    corners: Vector2[]; // Output (Target) coordinates
    sourceCorners: Vector2[]; // Input (Source) UV coordinates [0-1 range]
    meshWarp: MeshWarpData | null;
    effects: Effect[];
    visible: boolean;
    locked: boolean;
    startTime: number;
    duration: number;
    aspectRatioLocked?: boolean;
    audioMappings: AudioMapping[];
    border?: {
        enabled: boolean;
        color: string;
        width: number;
        opacity: number;
        glow: number;
        style: "solid" | "dashed" | "dotted";
        animation: "none" | "march" | "pulse" | "breathe" | "flicker";
        animationSpeed: number; // 0-10
    };
    textureSettings?: {
        fit: "cover" | "contain" | "stretch";
        scale: Vector2;
        offset: Vector2;
        rotation: number;
        flipX?: boolean;
        flipY?: boolean;
    };
}

export interface AudioMapping {
    id: string;
    band: "bass" | "mid" | "treble" | "volume";
    property: string; // e.g., "opacity", "blur", "chromatic"
    min: number;
    max: number;
    enabled: boolean;
}

export interface ControlPoint {
    position: Vector2;
    handleLeft?: Vector2; // Relative to position
    handleRight?: Vector2;
    handleTop?: Vector2;
    handleBottom?: Vector2;
}

export interface MeshWarpData {
    gridSize: number; // NxN grid of squares
    controlPoints: ControlPoint[][]; // (N+1)x(N+1) control points
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
    width?: number; // media width in pixels
    height?: number; // media height in pixels
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
    clipboard: Surface | null;

    // Surface actions
    addSurface: (mediaId?: string) => void;
    updateSurface: (id: string, updates: Partial<Surface>) => void;
    deleteSurface: (id: string) => void;
    duplicateSurface: (id: string) => void;
    copySurface: (id: string) => void;
    pasteSurface: () => void;
    toggleVisibility: (id: string) => void;
    toggleLock: (id: string) => void;
    reorderSurface: (id: string, newIndex: number) => void;
    bringToFront: (id: string) => void;
    sendToBack: (id: string) => void;
    flipHorizontal: (id: string) => void;
    flipVertical: (id: string) => void;

    // Selection actions
    selectSurface: (id: string, multi?: boolean) => void;
    deselectAll: () => void;
    selectAll: () => void;
    alignSurfaces: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;

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
    initializeMeshWarp: (surfaceId: string, gridSize?: number) => void;
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

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set, get) => ({
            // Initial state
            surfaces: [],
            mediaAssets: [],
            cues: [],
            projectSettings: defaultProjectSettings,
            selectedSurfaceIds: [],
            currentProjectId: null,
            clipboard: null,

            // Surface actions
            addSurface: (mediaId) => {
                get().saveHistory();

                let initialScale = { x: 1, y: 1 };
                if (mediaId) {
                    const media = get().mediaAssets.find(m => m.id === mediaId);
                    if (media && media.width && media.height) {
                        const aspect = media.width / media.height;
                        if (aspect >= 1) {
                            initialScale = { x: aspect, y: 1 };
                        } else {
                            initialScale = { x: 1, y: 1 / aspect };
                        }
                    }
                }

                const newSurface: Surface = {
                    id: generateId(),
                    name: `Surface ${get().surfaces.length + 1}`,
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    scale: initialScale,
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
                    sourceCorners: [
                        { x: 0, y: 1 }, // TL
                        { x: 1, y: 1 }, // TR
                        { x: 1, y: 0 }, // BR
                        { x: 0, y: 0 }, // BL
                    ],
                    meshWarp: null,
                    effects: [],
                    visible: true,
                    locked: false,
                    startTime: 0,
                    duration: 5, // Default 5 seconds
                    aspectRatioLocked: false,
                    audioMappings: [],
                    border: {
                        enabled: false,
                        color: "#00ff00",
                        width: 2,
                        opacity: 1,
                        glow: 0.5
                    },
                };
                set((state) => ({
                    surfaces: [...state.surfaces, newSurface],
                    selectedSurfaceIds: [newSurface.id],
                }));
            },

            updateSurface: (id, updates) => {
                set((state) => ({
                    surfaces: state.surfaces.map((s) => {
                        if (s.id !== id) return s;
                        let merged = { ...s, ...updates };

                        // LEGACY FIX: If corners are updating and look like old format (Y-down or wrong order),
                        // we could normalize here, but let's be safe and just ensure strict order
                        // on any full corner replacement.
                        return merged;
                    }),
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
                    ...JSON.parse(JSON.stringify(surface)),
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

            copySurface: (id) => {
                const surface = get().surfaces.find(s => s.id === id);
                if (surface) {
                    set({ clipboard: JSON.parse(JSON.stringify(surface)) });
                }
            },

            pasteSurface: () => {
                const { clipboard, surfaces } = get();
                if (!clipboard) return;

                get().saveHistory();
                const newSurface: Surface = {
                    ...JSON.parse(JSON.stringify(clipboard)),
                    id: generateId(),
                    name: `${clipboard.name} (Pasted)`,
                    position: {
                        x: clipboard.position.x + 0.05,
                        y: clipboard.position.y + 0.05,
                    },
                    zIndex: surfaces.length,
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

            bringToFront: (id) => {
                const { surfaces, reorderSurface } = get();
                reorderSurface(id, surfaces.length - 1);
            },

            sendToBack: (id) => {
                const { reorderSurface } = get();
                reorderSurface(id, 0);
            },

            flipHorizontal: (id) => {
                get().saveHistory();
                set((state) => ({
                    surfaces: state.surfaces.map(s =>
                        s.id === id ? { ...s, scale: { ...s.scale, x: s.scale.x * -1 } } : s
                    )
                }));
            },

            flipVertical: (id) => {
                get().saveHistory();
                set((state) => ({
                    surfaces: state.surfaces.map(s =>
                        s.id === id ? { ...s, scale: { ...s.scale, y: s.scale.y * -1 } } : s
                    )
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

            selectAll: () => {
                set((state) => ({
                    selectedSurfaceIds: state.surfaces.map(s => s.id)
                }));
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

                        // Add source corner at same index
                        // Default to midpoint of neighbors if possible
                        const newSourceCorners = [...s.sourceCorners];
                        let sourcePoint = { x: 0.5, y: 0.5 };
                        if (newSourceCorners.length >= 2) {
                            const prev = newSourceCorners[(index - 1 + newSourceCorners.length) % newSourceCorners.length];
                            const next = newSourceCorners[index % newSourceCorners.length];
                            sourcePoint = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };
                        }
                        newSourceCorners.splice(index, 0, sourcePoint);

                        return { ...s, corners: newCorners, sourceCorners: newSourceCorners };
                    }),
                }));
            },

            alignSurfaces: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
                const { surfaces, selectedSurfaceIds, projectSettings, saveHistory } = get();
                if (selectedSurfaceIds.length === 0) return;

                saveHistory();

                const selectedSurfaces = surfaces.filter(s => selectedSurfaceIds.includes(s.id));
                const canvasW = projectSettings.resolution.width / 100;
                const canvasH = projectSettings.resolution.height / 100;

                // If single selection, align to canvas
                if (selectedSurfaces.length === 1) {
                    const surface = selectedSurfaces[0];
                    let newX = surface.position.x;
                    let newY = surface.position.y;

                    switch (alignment) {
                        case "left": newX = -(canvasW / 2) + (surface.scale.x / 2); break;
                        case "center": newX = 0; break;
                        case "right": newX = (canvasW / 2) - (surface.scale.x / 2); break;
                        case "top": newY = (canvasH / 2) - (surface.scale.y / 2); break;
                        case "middle": newY = 0; break;
                        case "bottom": newY = -(canvasH / 2) + (surface.scale.y / 2); break;
                    }

                    set({
                        surfaces: surfaces.map(s => s.id === surface.id ? { ...s, position: { x: newX, y: newY } } : s)
                    });
                    return;
                }

                // If multiple selection, align to selection bounds
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                selectedSurfaces.forEach(s => {
                    const halfW = s.scale.x / 2;
                    const halfH = s.scale.y / 2;
                    minX = Math.min(minX, s.position.x - halfW);
                    maxX = Math.max(maxX, s.position.x + halfW);
                    minY = Math.min(minY, s.position.y - halfH);
                    maxY = Math.max(maxY, s.position.y + halfH);
                });

                const updates = selectedSurfaces.map(s => {
                    let newX = s.position.x;
                    let newY = s.position.y;
                    const halfW = s.scale.x / 2;
                    const halfH = s.scale.y / 2;

                    switch (alignment) {
                        case "left": newX = minX + halfW; break;
                        case "center": newX = (minX + maxX) / 2; break;
                        case "right": newX = maxX - halfW; break;
                        case "top": newY = maxY - halfH; break; // Y is up in Three.js? Yes.
                        case "middle": newY = (minY + maxY) / 2; break;
                        case "bottom": newY = minY + halfH; break;
                    }
                    return { id: s.id, position: { x: newX, y: newY } };
                });

                set({
                    surfaces: surfaces.map(s => {
                        const update = updates.find(u => u.id === s.id);
                        return update ? { ...s, position: update.position } : s;
                    })
                });
            },

            removeCorner: (surfaceId, index) => {
                get().saveHistory();
                set((state) => ({
                    surfaces: state.surfaces.map((s) => {
                        if (s.id !== surfaceId || s.corners.length <= 3) return s;
                        const newCorners = [...s.corners];
                        newCorners.splice(index, 1);

                        const newSourceCorners = [...s.sourceCorners];
                        newSourceCorners.splice(index, 1);

                        return { ...s, corners: newCorners, sourceCorners: newSourceCorners };
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
                                { x: -0.5, y: 0.5 },  // TL
                                { x: 0.5, y: 0.5 },   // TR
                                { x: -0.5, y: -0.5 }, // BL
                                { x: 0.5, y: -0.5 },  // BR
                            ],
                            sourceCorners: [
                                { x: 0, y: 1 }, // TL
                                { x: 1, y: 1 }, // TR
                                { x: 0, y: 0 }, // BL
                                { x: 1, y: 0 }, // BR
                            ],
                        };
                    }),
                }));
            },

            initializeMeshWarp: (surfaceId, gridSize = 3) => {
                get().saveHistory();
                set((state) => ({
                    surfaces: state.surfaces.map((s) => {
                        if (s.id !== surfaceId) return s;

                        const controlPoints: ControlPoint[][] = [];
                        for (let row = 0; row <= gridSize; row++) {
                            const rowPoints: ControlPoint[] = [];
                            for (let col = 0; col <= gridSize; col++) {
                                // Linear interpolation between initial corners
                                const tx = col / gridSize;
                                const ty = 1 - row / gridSize;

                                const x = -0.5 + tx;
                                const y = -0.5 + ty;

                                // Initial tangent handles (Photoshop style)
                                // We'll set them to ~1/3 of the segment length
                                const handleLength = 1 / gridSize / 3;

                                rowPoints.push({
                                    position: { x, y },
                                    handleLeft: { x: -handleLength, y: 0 },
                                    handleRight: { x: handleLength, y: 0 },
                                    handleTop: { x: 0, y: handleLength },
                                    handleBottom: { x: 0, y: -handleLength },
                                });
                            }
                            controlPoints.push(rowPoints);
                        }

                        return {
                            ...s,
                            meshWarp: { gridSize, controlPoints }
                        };
                    })
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
        }),
        {
            name: 'projectionx-project-storage',
            partialize: (state) => ({
                surfaces: state.surfaces,
                mediaAssets: state.mediaAssets,
                cues: state.cues,
                projectSettings: state.projectSettings,
            }),
        }
    )
);
