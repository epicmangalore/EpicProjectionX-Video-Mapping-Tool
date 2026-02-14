import { create } from "zustand";
import { persist } from "zustand/middleware";
import gsap from "gsap";

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
                set({ duration: Math.max(300, duration) });
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
                });
                set({ timeline: tl });
                get().updateTimeline(updateSurface);
            },

            loadSceneState: (data, updateSurface) => {
                const { timeline } = get();

                // 1. Update basic state
                set({
                    keyframes: JSON.parse(JSON.stringify(data.keyframes || [])),
                    duration: data.duration || 30,
                    currentTime: data.currentTime || 0,
                    isPlaying: data.isPlaying || false
                });

                // 2. Rebuild the GSAP timeline with new keyframes
                get().updateTimeline(updateSurface);

                // 3. Re-seek the new timeline to the target time
                const newTimeline = get().timeline;
                if (newTimeline) {
                    newTimeline.time(data.currentTime || 0);
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
                                if (parts.length === 2) {
                                    // Handle object properties like position: {x, y}
                                    updateSurface(surfaceId, {
                                        [parts[0]]: { [parts[1]]: target.value }
                                    });
                                } else {
                                    // Handle simple properties like opacity
                                    updateSurface(surfaceId, { [propertyPath]: target.value });
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
            name: 'projectionx-timeline-storage',
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
