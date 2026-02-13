import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateId } from "@/lib/utils";
import { idbStorage } from "@/store/idb-storage";
import { getShapePreset } from "@/lib/shapes/ShapeLibrary";
import type { Keyframe } from "./timeline-store";
import type { EffectSettings } from "./effects-store";

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
    shaderEffectIds?: string[]; // Shader effects applied to this surface (processed in order)
    visible: boolean;
    locked: boolean;
    startTime: number;
    duration: number;
    aspectRatioLocked?: boolean;
    audioMappings: AudioMapping[];
    useComposition?: boolean;
    groupId?: string;
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
    compositionMapping?: "local" | "global";
}

export interface AudioMapping {
    id: string;
    band: "bass" | "mid" | "treble" | "volume" | "energy" | "centroid" | "rolloff" | "zcr" | "rms";
    property: string; // e.g., "opacity", "blur", "chromatic", "scale", "rotation", "brightness", "hue"
    min: number;
    max: number;
    enabled: boolean;
    smoothing?: number; // Smoothing factor 0-1 for interpolation
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
    | "edgeBlend"
    | "brightness"
    | "contrast"
    | "saturation"
    | "hue";

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
    // Shader effects
    shaderSource?: string;
    effectId?: string;
    uniforms?: Record<string, number | number[]>;
}

export interface Scene {
    id: string;
    name: string;
    hotkey?: string;
    surfaces: Surface[]; // Canonical storage (not snapshots)
    effects: Record<string, EffectSettings>;
    keyframes: Keyframe[]; // Scene-specific timeline keyframes
    timelineDuration: number; // Scene-specific timeline duration
    transitionDuration: number; // For scene switching
    createdAt: number;
    updatedAt: number;
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
    compositionMediaId?: string | null;
    showComposition?: boolean;
}

interface ProjectStore {
    // State
    // NOTE: surfaces are now stored in scenes[].surfaces, not at root level
    // Backward-compatible derived selector target for legacy callers.
    surfaces: Surface[];
    mediaAssets: MediaAsset[];
    scenes: Scene[];
    activeSceneId: string | null; // Which scene is currently active
    schemaVersion: number; // For migration support
    projectSettings: ProjectSettings;
    selectedSurfaceIds: string[];
    currentProjectId: number | null;
    clipboard: Surface | null;



    // Surface actions
    addSurface: (mediaId?: string) => void;
    addShapeFromPreset: (presetId: string, position: Vector2) => void;
    batchAddSurfaces: (surfaces: Partial<Surface>[]) => void;
    updateSurface: (id: string, updates: Partial<Surface>) => void;
    updateSurfaces: (ids: string[], updates: Partial<Surface>) => void;
    deleteSurface: (id: string) => void;
    duplicateSurfaces: (ids: string[]) => void;
    updateActiveSceneSurfaces: (surfaces: Surface[]) => void;
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
    addMediaAsset: (asset: MediaAsset) => string;
    updateMediaAsset: (id: string, updates: Partial<MediaAsset>) => void;
    removeMediaAsset: (id: string) => Promise<void>;
    clearAllMedia: () => Promise<void>;

    // Scene actions
    addScene: (name: string) => void;
    updateScene: (id: string, updates: Partial<Scene>) => void;
    triggerScene: (id: string) => Promise<void>;
    deleteScene: (id: string) => void;
    switchToScene: (id: string) => Promise<void>;

    // FX actions
    addEffect: (surfaceId: string, type: EffectType) => void;
    removeEffect: (surfaceId: string, effectId: string) => void;
    updateEffect: (surfaceId: string, effectId: string, params: Record<string, number>) => void;
    toggleEffect: (surfaceId: string, effectId: string) => void;
    reorderEffect: (surfaceId: string, effectId: string, newIndex: number) => void;

    // Helper methods
    getActiveSurfaces: () => Surface[];
    getActiveScene: () => Scene | null;

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

    // Hydration
    hydrateMediaAssets: () => Promise<void>;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

interface HistoryState {
    scenes: Scene[];
    activeSceneId: string | null;
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
    compositionMediaId: null,
    showComposition: false,
};

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set, get) => ({
            // Initial state
            // NOTE: surfaces are now stored in scenes[].surfaces
            mediaAssets: [],
            scenes: [],
            activeSceneId: null,
            schemaVersion: 2, // Current schema version
            projectSettings: defaultProjectSettings,
            selectedSurfaceIds: [],
            currentProjectId: null,
            clipboard: null,
            get surfaces() {
                const { scenes, activeSceneId } = get();
                const activeScene = scenes.find((scene) => scene.id === activeSceneId);
                return activeScene?.surfaces || [];
            },

            // Surface actions
            addSurface: (mediaId) => {
                const { activeSceneId, scenes } = get();

                // Resolve target scene robustly (active -> first existing)
                const resolvedSceneId =
                    activeSceneId && scenes.some((s) => s.id === activeSceneId)
                        ? activeSceneId
                        : scenes[0]?.id ?? null;

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

                const activeScene = scenes.find(s => s.id === resolvedSceneId);
                const surfaceCount = activeScene?.surfaces.length || 0;

                const newSurface: Surface = {
                    id: generateId(),
                    name: `Surface ${surfaceCount + 1}`,
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    scale: initialScale,
                    opacity: 1,
                    zIndex: surfaceCount,
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
                        glow: 0.5,
                        style: "solid" as const,
                        animation: "none" as const,
                        animationSpeed: 1
                    },
                    compositionMapping: "global" as const,
                };

                set((state) => {
                    // If no scene exists yet, bootstrap one so surface creation always works.
                    if (!resolvedSceneId) {
                        const bootstrapScene: Scene = {
                            id: generateId(),
                            name: "Scene 1",
                            surfaces: [newSurface],
                            effects: {},
                            keyframes: [],
                            timelineDuration: 30,
                            transitionDuration: 1.0,
                            hotkey: undefined,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        };

                        return {
                            scenes: [...state.scenes, bootstrapScene],
                            activeSceneId: bootstrapScene.id,
                            selectedSurfaceIds: [newSurface.id],
                        };
                    }

                    return {
                        scenes: state.scenes.map(scene =>
                            scene.id === resolvedSceneId
                                ? { ...scene, surfaces: [...scene.surfaces, newSurface], updatedAt: Date.now() }
                                : scene
                        ),
                        activeSceneId: resolvedSceneId,
                        selectedSurfaceIds: [newSurface.id],
                    };
                });
            },

            addShapeFromPreset: (presetId, position) => {
                const { activeSceneId, scenes } = get();

                // Resolve target scene robustly (active -> first existing)
                // This prevents silent failures when activeSceneId is temporarily null/invalid.
                const resolvedSceneId =
                    activeSceneId && scenes.some((s) => s.id === activeSceneId)
                        ? activeSceneId
                        : scenes[0]?.id ?? null;

                // Get the shape preset
                const preset = getShapePreset(presetId);

                if (!preset) {
                    console.warn('Shape preset not found:', presetId);
                    return;
                }

                get().saveHistory();

                const activeScene = scenes.find(s => s.id === resolvedSceneId);
                const surfaceCount = activeScene?.surfaces.length || 0;

                // Shape presets were authored in px-like values (e.g. 200x200)
                // while surfaces use world-space units (~1x1). Normalize for visibility.
                const normalizedScale: Vector2 = {
                    x: preset.defaultScale.x > 10 ? preset.defaultScale.x / 200 : preset.defaultScale.x,
                    y: preset.defaultScale.y > 10 ? preset.defaultScale.y / 200 : preset.defaultScale.y,
                };

                // Calculate source corners from preset corners
                const sourceCorners: Vector2[] = preset.corners.map((corner: Vector2) => ({
                    x: (corner.x + 0.5), // Convert from -0.5..0.5 to 0..1
                    y: (0.5 - corner.y)  // Flip Y and convert to 0..1
                }));

                const newSurface: Surface = {
                    id: generateId(),
                    name: preset.name,
                    position: position,
                    rotation: 0,
                    scale: normalizedScale,
                    opacity: 1,
                    zIndex: surfaceCount,
                    mediaId: null,
                    blendMode: "normal",
                    corners: preset.corners,
                    sourceCorners: sourceCorners,
                    meshWarp: null,
                    effects: [],
                    visible: true,
                    locked: false,
                    startTime: 0,
                    duration: 5,
                    aspectRatioLocked: false,
                    audioMappings: [],
                    border: {
                        enabled: false,
                        color: "#00ff00",
                        width: 2,
                        opacity: 1,
                        glow: 0.5,
                        style: "solid" as const,
                        animation: "none" as const,
                        animationSpeed: 1
                    },
                    compositionMapping: "global" as const,
                };

                set((state) => {
                    // If no scene exists yet, bootstrap one so shape creation always works.
                    if (!resolvedSceneId) {
                        const bootstrapScene: Scene = {
                            id: generateId(),
                            name: "Scene 1",
                            surfaces: [newSurface],
                            effects: {},
                            keyframes: [],
                            timelineDuration: 30,
                            transitionDuration: 1.0,
                            hotkey: undefined,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        };

                        return {
                            scenes: [...state.scenes, bootstrapScene],
                            activeSceneId: bootstrapScene.id,
                            selectedSurfaceIds: [newSurface.id],
                        };
                    }

                    return {
                        scenes: state.scenes.map(scene =>
                            scene.id === resolvedSceneId
                                ? { ...scene, surfaces: [...scene.surfaces, newSurface], updatedAt: Date.now() }
                                : scene
                        ),
                        activeSceneId: resolvedSceneId,
                        selectedSurfaceIds: [newSurface.id],
                    };
                });
            },

            batchAddSurfaces: (surfaceConfigs: Partial<Surface>[]) => {
                console.log("🛠️ Store batchAddSurfaces called with:", surfaceConfigs);
                const { activeSceneId, scenes } = get();
                if (!activeSceneId) return;

                const activeScene = scenes.find(s => s.id === activeSceneId);
                let surfaceCount = activeScene?.surfaces.length || 0;
                const newSurfaces: Surface[] = [];

                surfaceConfigs.forEach((config) => {
                    const id = generateId();
                    const surface: Surface = {
                        id,
                        name: config.name || `Surface ${surfaceCount + 1}`,
                        position: { x: 0, y: 0 },
                        rotation: 0,
                        scale: { x: 1, y: 1 },
                        opacity: 1,
                        zIndex: surfaceCount,
                        mediaId: config.mediaId || null,
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
                        duration: 5,
                        aspectRatioLocked: false,
                        audioMappings: [],
                        border: {
                            enabled: false,
                            color: "#00ff00",
                            width: 2,
                            opacity: 1,
                            glow: 0.5,
                            style: "solid" as const,
                            animation: "none" as const,
                            animationSpeed: 1
                        },
                        compositionMapping: "global" as const,
                        ...config,
                    };
                    newSurfaces.push(surface);
                    surfaceCount++;
                });

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? { ...scene, surfaces: [...scene.surfaces, ...newSurfaces], updatedAt: Date.now() }
                            : scene
                    ),
                    selectedSurfaceIds: newSurfaces.map(s => s.id),
                }));
            },

            updateSurface: (id, updates) => {
                const { activeSceneId } = get();
                if (!activeSceneId) {
                    console.warn('❌ updateSurface failed: No active scene');
                    return;
                }

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map((s) => {
                                    if (s.id !== id) return s;
                                    return { ...s, ...updates };
                                }),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            updateActiveSceneSurfaces: (surfaces: Surface[]) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? { ...scene, surfaces: JSON.parse(JSON.stringify(surfaces)), updatedAt: Date.now() }
                            : scene
                    ),
                }));
            },

            updateSurfaces: (ids, updates) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                const idSet = new Set(ids);
                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map((s) =>
                                    idSet.has(s.id) ? { ...s, ...updates } : s
                                ),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            deleteSurface: (id) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                get().saveHistory();
                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.filter((s) => s.id !== id),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                    selectedSurfaceIds: state.selectedSurfaceIds.filter((sid) => sid !== id),
                }));
            },

            duplicateSurfaces: (ids) => {
                const { activeSceneId, scenes } = get();
                if (!activeSceneId || ids.length === 0) return;

                get().saveHistory();

                const activeScene = scenes.find(s => s.id === activeSceneId);
                if (!activeScene) return;

                const updatedSurfaces: Surface[] = [];
                const newSurfaces: Surface[] = [];
                const newKeyframes: Keyframe[] = [];

                // 1. Build updated surface list with duplicates inserted below originals
                activeScene.surfaces.forEach(surface => {
                    updatedSurfaces.push(surface);
                    if (ids.includes(surface.id)) {
                        const nextId = generateId();
                        const newSurface: Surface = {
                            ...JSON.parse(JSON.stringify(surface)),
                            id: nextId,
                            name: `${surface.name} (Copy)`,
                            updatedAt: Date.now(),
                        };
                        updatedSurfaces.push(newSurface);
                        newSurfaces.push(newSurface);

                        // 2. Duplicate keyframes at the same time position
                        const associatedKeyframes = (activeScene.keyframes || []).filter(
                            kf => kf.surfaceId === surface.id
                        );

                        associatedKeyframes.forEach(kf => {
                            newKeyframes.push({
                                ...JSON.parse(JSON.stringify(kf)),
                                id: generateId(),
                                surfaceId: nextId,
                                time: kf.time
                            });
                        });
                    }
                });

                if (newSurfaces.length === 0) return;

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: updatedSurfaces,
                                keyframes: [...(scene.keyframes || []), ...newKeyframes],
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                    selectedSurfaceIds: newSurfaces.map(s => s.id),
                }));

                // 3. Update the timeline store immediately
                import("./timeline-store").then(({ useTimelineStore }) => {
                    const scene = get().scenes.find(s => s.id === activeSceneId);
                    if (scene) {
                        useTimelineStore.setState({
                            duration: scene.timelineDuration, // Duration doesn't change for stacking
                            keyframes: JSON.parse(JSON.stringify(scene.keyframes || []))
                        });
                    }
                });
            },

            copySurface: (id) => {
                const { activeSceneId, scenes } = get();
                if (!activeSceneId) return;

                const activeScene = scenes.find(s => s.id === activeSceneId);
                const surface = activeScene?.surfaces.find(s => s.id === id);
                if (surface) {
                    set({ clipboard: JSON.parse(JSON.stringify(surface)) });
                }
            },

            pasteSurface: () => {
                const { clipboard, activeSceneId, scenes } = get();
                if (!clipboard || !activeSceneId) return;

                const activeScene = scenes.find(s => s.id === activeSceneId);
                if (!activeScene) return;

                get().saveHistory();
                const newSurface: Surface = {
                    ...JSON.parse(JSON.stringify(clipboard)),
                    id: generateId(),
                    name: `${clipboard.name} (Pasted)`,
                    position: {
                        x: clipboard.position.x + 0.05,
                        y: clipboard.position.y + 0.05,
                    },
                    zIndex: activeScene.surfaces.length,
                };

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: [...scene.surfaces, newSurface],
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                    selectedSurfaceIds: [newSurface.id],
                }));
            },

            toggleVisibility: (id) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map((s) =>
                                    s.id === id ? { ...s, visible: !s.visible } : s
                                ),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            toggleLock: (id) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map((s) =>
                                    s.id === id ? { ...s, locked: !s.locked } : s
                                ),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            reorderSurface: (id, newIndex) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                set((state) => {
                    const activeScene = state.scenes.find(s => s.id === activeSceneId);
                    if (!activeScene) return state;

                    const currentSurfaces = [...activeScene.surfaces].sort((a, b) => a.zIndex - b.zIndex);
                    const index = currentSurfaces.findIndex(s => s.id === id);
                    if (index === -1) return state;

                    const [removed] = currentSurfaces.splice(index, 1);
                    currentSurfaces.splice(newIndex, 0, removed);

                    // Re-assign z-indices based on new order
                    const updatedSurfaces = activeScene.surfaces.map(s => {
                        const newZ = currentSurfaces.findIndex(cs => cs.id === s.id);
                        return { ...s, zIndex: newZ };
                    });

                    return {
                        scenes: state.scenes.map(scene =>
                            scene.id === activeSceneId
                                ? { ...scene, surfaces: updatedSurfaces, updatedAt: Date.now() }
                                : scene
                        ),
                    };
                });
            },

            bringToFront: (id) => {
                const activeSurfaces = get().getActiveSurfaces();
                get().reorderSurface(id, activeSurfaces.length - 1);
            },

            sendToBack: (id) => {
                get().reorderSurface(id, 0);
            },

            flipHorizontal: (id) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                get().saveHistory();
                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map(s =>
                                    s.id === id ? { ...s, scale: { ...s.scale, x: s.scale.x * -1 } } : s
                                ),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            flipVertical: (id) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                get().saveHistory();
                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map(s =>
                                    s.id === id ? { ...s, scale: { ...s.scale, y: s.scale.y * -1 } } : s
                                ),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
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
                const activeSurfaces = get().getActiveSurfaces();
                set({ selectedSurfaceIds: activeSurfaces.map(s => s.id) });
            },

            // Media actions
            addMediaAsset: (asset: MediaAsset): string => {
                const { mediaAssets } = get();

                // 1. Deduplication Check
                let existingAsset = null;

                if (asset.type === 'color' && asset.color) {
                    existingAsset = mediaAssets.find(a => a.type === 'color' && a.color === asset.color);
                } else if ((asset.type === 'image' || asset.type === 'video') && asset.size && asset.name) {
                    // Match by name and size as a simple heuristic
                    existingAsset = mediaAssets.find(a =>
                        a.type === asset.type &&
                        a.name === asset.name &&
                        a.size === asset.size
                    );
                }

                if (existingAsset) {
                    console.log(`[Deduplication] Using existing ${asset.type} asset: ${existingAsset.id}`);
                    return existingAsset.id;
                }

                set((state) => ({
                    mediaAssets: [...state.mediaAssets, asset],
                }));

                return asset.id;
            },

            updateMediaAsset: (id: string, updates: Partial<MediaAsset>) => {
                set((state) => ({
                    mediaAssets: state.mediaAssets.map((a) =>
                        a.id === id ? { ...a, ...updates } : a
                    ),
                }));
            },

            removeMediaAsset: async (id: string) => {
                get().saveHistory();

                // Get the asset type before deletion for DB cleanup
                const asset = get().mediaAssets.find(a => a.id === id);

                set((state) => ({
                    mediaAssets: state.mediaAssets.filter((a) => a.id !== id),
                    // Also clear from surfaces in all scenes
                    scenes: state.scenes.map(scene => ({
                        ...scene,
                        surfaces: scene.surfaces.map(s =>
                            s.mediaId === id ? { ...s, mediaId: null } : s
                        )
                    }))
                }));

                // Cleanup IndexedDB if it was a file
                if (asset && (asset.type === 'image' || asset.type === 'video')) {
                    try {
                        const { db } = await import("@/lib/db");
                        await db.files.delete(id);
                    } catch (e) {
                        console.error("Failed to delete media from DB:", e);
                    }
                }
            },

            clearAllMedia: async () => {
                get().saveHistory();
                const assetIds = get().mediaAssets
                    .filter(a => a.type === 'image' || a.type === 'video')
                    .map(a => a.id);

                set((state) => ({
                    mediaAssets: [],
                    // Reset all surfaces in all scenes
                    scenes: state.scenes.map(scene => ({
                        ...scene,
                        surfaces: scene.surfaces.map(s => ({ ...s, mediaId: null }))
                    }))
                }));

                // Cleanup IndexedDB
                if (assetIds.length > 0) {
                    try {
                        const { db } = await import("@/lib/db");
                        await db.files.bulkDelete(assetIds);
                    } catch (e) {
                        console.error("Failed to clear media library from DB:", e);
                    }
                }
            },

            // Scene actions
            addScene: (name) => {
                const newScene: Scene = {
                    id: generateId(),
                    name,
                    surfaces: [], // Start with empty surfaces
                    effects: {},
                    keyframes: [],
                    timelineDuration: 30, // Default 30 seconds
                    transitionDuration: 1.0, // Default 1s fade
                    hotkey: undefined,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                set((state) => ({
                    scenes: [...state.scenes, newScene],
                }));

                // Auto-activate via switchToScene to trigger timeline sync
                get().switchToScene(newScene.id);
            },

            updateScene: (id, updates) => {
                set((state) => ({
                    scenes: state.scenes.map((scene) =>
                        scene.id === id
                            ? { ...scene, ...updates, updatedAt: Date.now() }
                            : scene
                    ),
                }));
            },

            triggerScene: async (id) => {
                await get().switchToScene(id);
            },

            deleteScene: (id) => {
                const { scenes, activeSceneId } = get();
                if (scenes.length <= 1) {
                    console.warn("Cannot delete the last scene.");
                    return;
                }

                get().saveHistory();
                const newScenes = scenes.filter((s) => s.id !== id);

                set({ scenes: newScenes });

                if (activeSceneId === id) {
                    get().switchToScene(newScenes[0].id);
                }
            },

            switchToScene: async (id) => {
                // Import first, then re-read latest store state.
                // This avoids race conditions where async scene switching overwrites
                // shape/surface edits that happen while the import resolves.
                const { useTimelineStore } = await import("./timeline-store");

                const { scenes, activeSceneId } = get();
                if (activeSceneId === id) return;

                // 1. Save current timeline state to the OLD scene
                const timelineState = useTimelineStore.getState();
                const updatedScenes = scenes.map(scene => {
                    if (scene.id === activeSceneId) {
                        return {
                            ...scene,
                            keyframes: JSON.parse(JSON.stringify(timelineState.keyframes)),
                            timelineDuration: timelineState.duration,
                            updatedAt: Date.now()
                        };
                    }
                    return scene;
                });

                // 2. Load NEW scene state into the timeline store
                const nextScene = updatedScenes.find(s => s.id === id);
                if (nextScene) {
                    useTimelineStore.setState({
                        keyframes: JSON.parse(JSON.stringify(nextScene.keyframes || [])),
                        duration: nextScene.timelineDuration || 30,
                        currentTime: 0, // Reset playhead on switch
                        isPlaying: false // Pause on switch
                    });
                }

                set({
                    scenes: updatedScenes,
                    activeSceneId: id,
                    selectedSurfaceIds: [], // Clear selection on switch
                });
            },

            // Helper methods
            getActiveSurfaces: () => {
                const { scenes, activeSceneId } = get();
                const activeScene = scenes.find(s => s.id === activeSceneId);
                return activeScene?.surfaces || [];
            },

            getActiveScene: () => {
                const { scenes, activeSceneId } = get();
                return scenes.find(s => s.id === activeSceneId) || null;
            },

            // Project actions
            updateProjectSettings: (settings) => {
                set((state) => ({
                    projectSettings: { ...state.projectSettings, ...settings },
                }));
            },

            addCorner: (surfaceId, index, point) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                get().saveHistory();
                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map((s) => {
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
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            alignSurfaces: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
                const { activeSceneId, selectedSurfaceIds, projectSettings, saveHistory } = get();
                if (selectedSurfaceIds.length === 0 || !activeSceneId) return;

                const surfaces = get().getActiveSurfaces();
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

                    set((state) => ({
                        scenes: state.scenes.map(scene =>
                            scene.id === activeSceneId
                                ? {
                                    ...scene,
                                    surfaces: scene.surfaces.map(s => s.id === surface.id ? { ...s, position: { x: newX, y: newY } } : s),
                                    updatedAt: Date.now(),
                                }
                                : scene
                        ),
                    }));
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
                        case "top": newY = maxY - halfH; break;
                        case "middle": newY = (minY + maxY) / 2; break;
                        case "bottom": newY = minY + halfH; break;
                    }
                    return { id: s.id, position: { x: newX, y: newY } };
                });

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map(s => {
                                    const update = updates.find(u => u.id === s.id);
                                    return update ? { ...s, position: update.position } : s;
                                }),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            removeCorner: (surfaceId, index) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                get().saveHistory();
                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map((s) => {
                                    if (s.id !== surfaceId || s.corners.length <= 3) return s;
                                    const newCorners = [...s.corners];
                                    newCorners.splice(index, 1);

                                    const newSourceCorners = [...s.sourceCorners];
                                    newSourceCorners.splice(index, 1);

                                    return { ...s, corners: newCorners, sourceCorners: newSourceCorners };
                                }),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            resetCorners: (surfaceId) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                get().saveHistory();
                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map((s) => {
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
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            initializeMeshWarp: (surfaceId, gridSize = 3) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                get().saveHistory();
                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map((s) => {
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
                                }),
                                updatedAt: Date.now(),
                            }
                            : scene
                    ),
                }));
            },

            resetProject: () => {
                set({
                    mediaAssets: [],
                    scenes: [],
                    activeSceneId: null,
                    projectSettings: defaultProjectSettings,
                    selectedSurfaceIds: [],
                    currentProjectId: null,
                });
            },

            // History Implementation
            history: [],
            future: [],

            saveHistory: () => {
                const { scenes, activeSceneId, projectSettings, history } = get();
                const snapshot = {
                    scenes: JSON.parse(JSON.stringify(scenes)),
                    activeSceneId,
                    projectSettings: JSON.parse(JSON.stringify(projectSettings))
                };
                set({
                    history: [...history, snapshot].slice(-50),
                    future: []
                });
            },

            undo: () => {
                const { history, future, scenes, activeSceneId, projectSettings } = get();
                if (history.length === 0) return;

                const previous = history[history.length - 1];
                const newHistory = history.slice(0, -1);
                const currentSnapshot = {
                    scenes: JSON.parse(JSON.stringify(scenes)),
                    activeSceneId,
                    projectSettings: JSON.parse(JSON.stringify(projectSettings))
                };

                set({
                    history: newHistory,
                    future: [currentSnapshot, ...future].slice(0, 50),
                    scenes: previous.scenes,
                    activeSceneId: previous.activeSceneId,
                    projectSettings: previous.projectSettings
                });
            },

            redo: () => {
                const { history, future, scenes, activeSceneId, projectSettings } = get();
                if (future.length === 0) return;

                const next = future[0];
                const newFuture = future.slice(1);
                const currentSnapshot = {
                    scenes: JSON.parse(JSON.stringify(scenes)),
                    activeSceneId,
                    projectSettings: JSON.parse(JSON.stringify(projectSettings))
                };

                set({
                    history: [...history, currentSnapshot].slice(-50),
                    future: newFuture,
                    scenes: next.scenes,
                    activeSceneId: next.activeSceneId,
                    projectSettings: next.projectSettings
                });
            },
            // Hydration
            hydrateMediaAssets: async () => {
                const { mediaAssets } = get();
                // Import db dynamically to avoid SSR issues if any
                const { db } = await import("@/lib/db");

                const updates: Record<string, string> = {};
                let hasUpdates = false;

                await Promise.all(mediaAssets.map(async (asset) => {
                    // Only process video/image assets with blob URLs
                    if ((asset.type === 'video' || asset.type === 'image') && asset.url?.startsWith('blob:')) {
                        try {
                            // Check if the current URL is still valid (fast check)
                            const resp = await fetch(asset.url);
                            if (resp.ok) return; // URL is still valid
                        } catch {
                            // URL is likely invalid
                        }

                        // Valid URL not found, try to restore from DB
                        try {
                            const fileRecord = await db.files.get(asset.id);
                            if (fileRecord && fileRecord.blob) {
                                const newUrl = URL.createObjectURL(fileRecord.blob);
                                updates[asset.id] = newUrl;
                                hasUpdates = true;
                                console.log(`Hydrated asset ${asset.id} with new URL: ${newUrl}`);
                            } else {
                                console.warn(`Could not find file record for asset ${asset.id}`);
                            }
                        } catch (e: unknown) {
                            console.error(`Failed to hydrate asset ${asset.id}:`, e);
                        }
                    }
                }));

                if (hasUpdates) {
                    set((state) => ({
                        mediaAssets: state.mediaAssets.map((asset) =>
                            updates[asset.id] ? { ...asset, url: updates[asset.id] } : asset
                        )
                    }));
                    get().saveHistory();
                }
            },
            // FX actions
            addEffect: (surfaceId, type) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                const defaultParams: Record<string, number> = {};
                if (type === "brightness") defaultParams.amount = 0;
                if (type === "contrast") defaultParams.amount = 0;
                if (type === "saturation") defaultParams.amount = 0;
                if (type === "hue") defaultParams.amount = 0;
                if (type === "blur") defaultParams.amount = 0;
                if (type === "chromatic") defaultParams.amount = 0;
                if (type === "rgbShift") defaultParams.amount = 0;

                const newEffect: Effect = {
                    id: generateId(),
                    type,
                    enabled: true,
                    params: defaultParams
                };

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map(s =>
                                    s.id === surfaceId
                                        ? { ...s, effects: [...s.effects, newEffect] }
                                        : s
                                ),
                                updatedAt: Date.now()
                            }
                            : scene
                    )
                }));
            },

            removeEffect: (surfaceId, effectId) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map(s =>
                                    s.id === surfaceId
                                        ? { ...s, effects: s.effects.filter(e => e.id !== effectId) }
                                        : s
                                ),
                                updatedAt: Date.now()
                            }
                            : scene
                    )
                }));
            },

            updateEffect: (surfaceId, effectId, params) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map(s =>
                                    s.id === surfaceId
                                        ? {
                                            ...s,
                                            effects: s.effects.map(e =>
                                                e.id === effectId
                                                    ? { ...e, params: { ...e.params, ...params } }
                                                    : e
                                            )
                                        }
                                        : s
                                ),
                                updatedAt: Date.now()
                            }
                            : scene
                    )
                }));
            },

            toggleEffect: (surfaceId, effectId) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map(s =>
                                    s.id === surfaceId
                                        ? {
                                            ...s,
                                            effects: s.effects.map(e =>
                                                e.id === effectId
                                                    ? { ...e, enabled: !e.enabled }
                                                    : e
                                            )
                                        }
                                        : s
                                ),
                                updatedAt: Date.now()
                            }
                            : scene
                    )
                }));
            },

            reorderEffect: (surfaceId, effectId, newIndex) => {
                const { activeSceneId } = get();
                if (!activeSceneId) return;

                set((state) => ({
                    scenes: state.scenes.map(scene =>
                        scene.id === activeSceneId
                            ? {
                                ...scene,
                                surfaces: scene.surfaces.map(s => {
                                    if (s.id !== surfaceId) return s;
                                    const newEffects = [...s.effects];
                                    const oldIndex = newEffects.findIndex(e => e.id === effectId);
                                    if (oldIndex === -1) return s;
                                    const [removed] = newEffects.splice(oldIndex, 1);
                                    newEffects.splice(newIndex, 0, removed);
                                    return { ...s, effects: newEffects };
                                }),
                                updatedAt: Date.now()
                            }
                            : scene
                    )
                }));
            },
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'projectionx-project-storage',
            storage: createJSONStorage(() => idbStorage),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
            partialize: (state) => ({
                // NOTE: surfaces are now in scenes[].surfaces, not at root
                mediaAssets: state.mediaAssets,
                scenes: state.scenes,
                activeSceneId: state.activeSceneId,
                schemaVersion: state.schemaVersion,
                projectSettings: state.projectSettings,
            }),
            merge: (persistedState, currentState) => {
                // Merge persisted state with current state, ensuring defaults for missing values
                const merged = {
                    ...currentState,
                    ...(persistedState as unknown as Partial<ProjectStore>),
                };

                // Type for old schema with surfaces at root
                type OldSchema = Partial<ProjectStore> & { surfaces?: Surface[] };
                const oldData = merged as OldSchema;

                // Migration from schema v1 to v2
                if (!merged.schemaVersion || merged.schemaVersion < 2) {
                    console.log('[Migration] Migrating from schema v1 to v2');

                    // If surfaces exist at root level, create a default scene
                    if (oldData.surfaces && oldData.surfaces.length > 0) {
                        const defaultScene: Scene = {
                            id: generateId(),
                            name: "Scene 1",
                            surfaces: oldData.surfaces,
                            effects: {},
                            keyframes: [],
                            timelineDuration: 30,
                            transitionDuration: 1.0,
                            hotkey: undefined,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        };

                        merged.scenes = [defaultScene];
                        merged.activeSceneId = defaultScene.id;
                        console.log('[Migration] Created default scene with existing surfaces');
                    }

                    // Convert old snapshot-based scenes to container-based scenes
                    if (merged.scenes && merged.scenes.length > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        merged.scenes = merged.scenes.map((scene: any) => {
                            // If scene has snapshot property, extract it
                            if (scene.snapshot) {
                                return {
                                    id: scene.id,
                                    name: scene.name,
                                    hotkey: scene.hotkey,
                                    surfaces: scene.snapshot.surfaces || [],
                                    effects: scene.snapshot.effects || {},
                                    keyframes: scene.snapshot.keyframes || [],
                                    timelineDuration: scene.snapshot.timelineDuration || 30,
                                    createdAt: scene.createdAt || Date.now(),
                                    updatedAt: Date.now(),
                                };
                            }
                            // If scene already has new format but missing fields, add defaults
                            return {
                                ...scene,
                                effects: scene.effects || {},
                                keyframes: scene.keyframes || [],
                                timelineDuration: scene.timelineDuration || 30,
                                createdAt: scene.createdAt || Date.now(),
                                updatedAt: scene.updatedAt || Date.now(),
                            };
                        });
                        console.log('[Migration] Converted scenes to container model');
                    }

                    // Ensure activeSceneId is valid
                    if (merged.scenes && merged.scenes.length > 0 && !merged.activeSceneId) {
                        merged.activeSceneId = merged.scenes[0].id;
                        console.log('[Migration] Set active scene to first scene');
                    }

                    merged.schemaVersion = 2;
                    console.log('[Migration] Migration complete');
                }

                // Ensure projectSettings has all default values
                if (merged.projectSettings) {
                    merged.projectSettings = {
                        ...defaultProjectSettings,
                        ...merged.projectSettings,
                    };
                }

                // Ensure all surfaces that use composition have a mapping mode, default to global
                // Ensure all surfaces that use composition have a mapping mode, default to global in all scenes
                if (merged.scenes) {
                    merged.scenes = merged.scenes.map((scene: Scene) => ({
                        ...scene,
                        surfaces: (scene.surfaces || []).map((s: Surface) => ({
                            ...s,
                            compositionMapping: s.compositionMapping || (s.useComposition ? "global" : "local")
                        }))
                    }));
                }

                return merged;
            },
        }
    )
);
