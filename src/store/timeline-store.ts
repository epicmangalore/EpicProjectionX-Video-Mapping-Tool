import { create } from "zustand";
import { persist } from "zustand/middleware";
import gsap from "gsap";
import { useProjectStore, type Surface } from "./project-store";

export interface Keyframe {
    id: string;
    time: number; // in seconds
    surfaceId: string;
    property: string; // e.g., "position.x", "position.y", "scale.x", "scale.y", "rotation", "opacity"
    value: number;
    easing?: string; // GSAP easing function
}

export interface Track {
    surfaceId: string;
    propertyName: string;
    keyframes: Keyframe[];
    isExpanded: boolean;
}

/**
 * While a scene is being restored, GSAP fires onUpdate for every tween between
 * 0 and the target time. Persisting each of those values separately caused
 * hundreds of IndexedDB writes and a ~1s main-thread freeze on scene switch,
 * so collect them here and apply a single batched update once the seek ends.
 */
let isRestoringScene = false;
const pendingSurfaceUpdates = new Map<string, Partial<Surface>>();

function queueSurfaceUpdate(surfaceId: string, updates: Partial<Surface>) {
    const current = pendingSurfaceUpdates.get(surfaceId) || {};
    const merged: Partial<Surface> = { ...current, ...updates };
    if (updates.position) {
        merged.position = current.position
            ? { ...current.position, ...updates.position }
            : updates.position;
    }
    if (updates.scale) {
        merged.scale = current.scale
            ? { ...current.scale, ...updates.scale }
            : updates.scale;
    }
    pendingSurfaceUpdates.set(surfaceId, merged);
}

interface TimelineState {
    // Current playback state
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    loop: boolean;
    snapToGrid: boolean;
    gridSize: number; // in seconds, e.g., 0.1 for 100ms segments

    // Animation Keyframes
    keyframes: Keyframe[];

    // UI State
    zoom: number; // Zoom level, where 1.0 is standard
    expandedSurfaces: string[]; // surfaceIds that are expanded in the track list

    // GSAP timeline instance
    timeline: gsap.core.Timeline | null;

    // Actions
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (time: number) => void;
    setLoop: (loop: boolean) => void;
    setDuration: (duration: number) => void;
    setSnapToGrid: (snap: boolean) => void;
    setZoom: (zoom: number) => void;

    // Keyframe management
    addKeyframe: (keyframe: Omit<Keyframe, "id">) => void;
    updateKeyframe: (id: string, updates: Partial<Keyframe>) => void;
    deleteKeyframe: (id: string) => void;

    // UI Actions
    toggleSurfaceExpanded: (surfaceId: string) => void;

    // Scene management
    loadSceneState: (
        data: { keyframes: Keyframe[]; duration: number; currentTime: number; isPlaying: boolean },
        updateSurface: (id: string, updates: any) => void
    ) => void;

    // Internal
    initTimeline: (updateSurface: (id: string, updates: any) => void) => void;
    updateTimeline: (updateSurface: (id: string, updates: any) => void) => void;
    reset: () => void;
}

export const useTimelineStore = create<TimelineState>()(
    persist(
        (set, get) => ({
            currentTime: 0,
            duration: 300,
            isPlaying: false,
            loop: false,
            snapToGrid: true,
            gridSize: 0.1,
            keyframes: [],
            zoom: 1.0,
            expandedSurfaces: [],
            timeline: null,

            play: () => {
                get().timeline?.play();
                set({ isPlaying: true });
            },

            pause: () => {
                get().timeline?.pause();
                set({ isPlaying: false });
            },

            stop: () => {
                get().timeline?.pause().time(0);
                set({ isPlaying: false, currentTime: 0 });
            },

            seek: (time: number) => {
                const { duration, timeline, snapToGrid, gridSize } = get();
                let targetTime = Math.max(0, Math.min(time, duration));

                if (snapToGrid) {
                    targetTime = Math.round(targetTime / gridSize) * gridSize;
                }

                timeline?.time(targetTime);
                set({ currentTime: targetTime });
            },

            setLoop: (loop: boolean) => {
                set({ loop });
                if (get().timeline) {
                    get().timeline!.repeat(loop ? -1 : 0);
                }
            },

            setDuration: (duration: number) => {
                set({ duration: Math.min(600, Math.max(300, duration)) });
            },

            setSnapToGrid: (snapToGrid: boolean) => {
                set({ snapToGrid });
            },

            setZoom: (zoom: number) => {
                // Limit zoom to reasonable bounds
                const newZoom = Math.max(0.0001, Math.min(10, zoom));
                set({ zoom: newZoom });
            },

            toggleSurfaceExpanded: (surfaceId: string) => {
                set((state) => ({
                    expandedSurfaces: state.expandedSurfaces.includes(surfaceId)
                        ? state.expandedSurfaces.filter(id => id !== surfaceId)
                        : [...state.expandedSurfaces, surfaceId]
                }));
            },

            addKeyframe: (keyframe) => {
                const id = `kf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                set((state) => ({
                    keyframes: [...state.keyframes, { ...keyframe, id }].sort((a, b) => a.time - b.time),
                }));
            },

            updateKeyframe: (id, updates) => {
                set((state) => ({
                    keyframes: state.keyframes
                        .map((kf) => (kf.id === id ? { ...kf, ...updates } : kf))
                        .sort((a, b) => a.time - b.time),
                }));
            },

            deleteKeyframe: (id) => {
                set((state) => ({
                    keyframes: state.keyframes.filter((kf) => kf.id !== id),
                }));
            },

            initTimeline: (updateSurface) => {
                const { duration, loop } = get();
                const tl = gsap.timeline({
                    paused: true,
                    repeat: loop ? -1 : 0,
                    onUpdate: () => {
                        set({ currentTime: tl.time() });
                    },
                    onComplete: () => {
                        // Sequential playback logic
                        const projectStore = (useProjectStore as any).getState();
                        const { projectSettings, triggerNextScene } = projectStore;

                        if (projectSettings.sequentialPlayback && projectSettings.playingSceneId) {
                            triggerNextScene();
                        }
                    }
                });
                set({ timeline: tl });
                get().updateTimeline(updateSurface);
            },

            loadSceneState: (data, updateSurface) => {
                const { timeline } = get();

                // 1. Update basic state
                set({
                    keyframes: structuredClone(data.keyframes || []),
                    duration: data.duration || 30,
                    currentTime: data.currentTime || 0,
                    isPlaying: data.isPlaying || false
                });

                // 2. Rebuild and seek without writing to the project store on
                // every tween. GSAP renders all tweens up to the target time,
                // which previously produced one persisted store write each.
                const targetTime = data.currentTime || 0;
                pendingSurfaceUpdates.clear();
                isRestoringScene = true;
                try {
                    get().updateTimeline(updateSurface);
                    get().timeline?.time(targetTime);
                } finally {
                    isRestoringScene = false;
                }
                const newTimeline = get().timeline;

                // 3. Apply the final value of every animated track in one write.
                if (pendingSurfaceUpdates.size > 0) {
                    const updates = Object.fromEntries(pendingSurfaceUpdates);
                    pendingSurfaceUpdates.clear();
                    useProjectStore.getState().applySurfaceUpdates(updates);
                }

                if (newTimeline) {
                    if (data.isPlaying) {
                        newTimeline.play();
                    } else {
                        newTimeline.pause();
                    }
                }
            },

            updateTimeline: (updateSurface) => {
                const { timeline, keyframes } = get();
                if (!timeline) return;

                timeline.clear();

                // Ensure timeline has the correct duration even if empty
                // We add a dummy tween that spans the entire duration
                const { duration: projectDuration } = get();
                timeline.to({}, { duration: projectDuration, ease: "none" }, 0);

                // Group keyframes by surface and property
                const grouped = keyframes.reduce((acc, kf) => {
                    const key = `${kf.surfaceId}:${kf.property}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(kf);
                    return acc;
                }, {} as Record<string, Keyframe[]>);

                // Process each property track
                Object.entries(grouped).forEach(([key, kfs]) => {
                    const [surfaceId, propertyPath] = key.split(":");

                    // GSAP target for this specific property
                    const target = { value: kfs[0].value };

                    kfs.forEach((kf, index) => {
                        if (index === 0) {
                            // Start at the first keyframe value
                            timeline.set(target, { value: kf.value }, kf.time);
                            return;
                        }

                        const prevKf = kfs[index - 1];
                        const duration = kf.time - prevKf.time;

                        timeline.to(target, {
                            value: kf.value,
                            duration,
                            ease: kf.easing || "power2.inOut",
                            onUpdate: () => {
                                // Bridge to project store
                                // Split propertyPath (e.g., "position.x" -> ["position", "x"])
                                const parts = propertyPath.split(".");
                                const updates = parts.length === 2
                                    ? { [parts[0]]: { [parts[1]]: target.value } }
                                    : { [propertyPath]: target.value };

                                if (isRestoringScene) {
                                    queueSurfaceUpdate(surfaceId, updates);
                                } else {
                                    updateSurface(surfaceId, updates);
                                }
                            }
                        }, prevKf.time);
                    });
                });
            },

            reset: () => {
                const tl = get().timeline;
                if (tl) {
                    tl.pause().clear();
                }
                set({
                    currentTime: 0,
                    duration: 300,
                    isPlaying: false,
                    loop: false,
                    snapToGrid: true,
                    gridSize: 0.1,
                    keyframes: [],
                    zoom: 1.0,
                    expandedSurfaces: [],
                });
            },
        }),
        {
            name: 'projectx-timeline-storage',
            partialize: (state) => ({
                duration: state.duration,
                loop: state.loop,
                snapToGrid: state.snapToGrid,
                gridSize: state.gridSize,
                zoom: state.zoom,
                keyframes: state.keyframes,
                expandedSurfaces: state.expandedSurfaces,
            }),
        }
    )
);
