import { create } from "zustand";
import gsap from "gsap";

export interface Keyframe {
    id: string;
    time: number; // in seconds
    surfaceId: string;
    property: string; // e.g., "position.x", "opacity", "effects.brightness"
    value: any;
    easing?: string; // GSAP easing function
}

export interface AnimationClip {
    id: string;
    name: string;
    duration: number; // in seconds
    keyframes: Keyframe[];
}

interface TimelineState {
    // Current playback state
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    loop: boolean;

    // Animation clips
    clips: AnimationClip[];
    activeClipId: string | null;

    // Keyframes
    keyframes: Keyframe[];

    // GSAP timeline instance
    timeline: gsap.core.Timeline | null;

    // Actions
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (time: number) => void;
    setLoop: (loop: boolean) => void;
    setDuration: (duration: number) => void;

    // Keyframe management
    addKeyframe: (keyframe: Omit<Keyframe, "id">) => void;
    updateKeyframe: (id: string, updates: Partial<Keyframe>) => void;
    deleteKeyframe: (id: string) => void;
    getKeyframesForSurface: (surfaceId: string) => Keyframe[];
    getKeyframesAtTime: (time: number, tolerance?: number) => Keyframe[];

    // Clip management
    addClip: (clip: Omit<AnimationClip, "id">) => void;
    updateClip: (id: string, updates: Partial<AnimationClip>) => void;
    deleteClip: (id: string) => void;
    setActiveClip: (id: string | null) => void;

    // Timeline initialization
    initTimeline: () => void;
    updateTimeline: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
    currentTime: 0,
    duration: 30, // Default 30 seconds
    isPlaying: false,
    loop: false,
    clips: [],
    activeClipId: null,
    keyframes: [],
    timeline: null,

    play: () => {
        const { timeline, initTimeline } = get();
        if (!timeline) {
            initTimeline();
        }
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
        const { duration } = get();
        const clampedTime = Math.max(0, Math.min(time, duration));
        get().timeline?.time(clampedTime);
        set({ currentTime: clampedTime });
    },

    setLoop: (loop: boolean) => {
        set({ loop });
        if (get().timeline) {
            get().timeline!.repeat(loop ? -1 : 0);
        }
    },

    setDuration: (duration: number) => {
        set({ duration });
    },

    addKeyframe: (keyframe) => {
        const id = `kf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            keyframes: [...state.keyframes, { ...keyframe, id }].sort((a, b) => a.time - b.time),
        }));
        get().updateTimeline();
    },

    updateKeyframe: (id, updates) => {
        set((state) => ({
            keyframes: state.keyframes
                .map((kf) => (kf.id === id ? { ...kf, ...updates } : kf))
                .sort((a, b) => a.time - b.time),
        }));
        get().updateTimeline();
    },

    deleteKeyframe: (id) => {
        set((state) => ({
            keyframes: state.keyframes.filter((kf) => kf.id !== id),
        }));
        get().updateTimeline();
    },

    getKeyframesForSurface: (surfaceId) => {
        return get().keyframes.filter((kf) => kf.surfaceId === surfaceId);
    },

    getKeyframesAtTime: (time, tolerance = 0.1) => {
        return get().keyframes.filter((kf) => Math.abs(kf.time - time) <= tolerance);
    },

    addClip: (clip) => {
        const id = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            clips: [...state.clips, { ...clip, id }],
        }));
    },

    updateClip: (id, updates) => {
        set((state) => ({
            clips: state.clips.map((clip) => (clip.id === id ? { ...clip, ...updates } : clip)),
        }));
    },

    deleteClip: (id) => {
        set((state) => ({
            clips: state.clips.filter((clip) => clip.id !== id),
            activeClipId: state.activeClipId === id ? null : state.activeClipId,
        }));
    },

    setActiveClip: (id) => {
        set({ activeClipId: id });
        if (id) {
            const clip = get().clips.find((c) => c.id === id);
            if (clip) {
                set({ keyframes: clip.keyframes, duration: clip.duration });
                get().updateTimeline();
            }
        }
    },

    initTimeline: () => {
        const { duration, loop } = get();
        const tl = gsap.timeline({
            paused: true,
            repeat: loop ? -1 : 0,
            onUpdate: () => {
                set({ currentTime: tl.time() });
            },
        });
        set({ timeline: tl });
        get().updateTimeline();
    },

    updateTimeline: () => {
        const { timeline, keyframes } = get();
        if (!timeline) return;

        // Clear existing timeline
        timeline.clear();

        // Group keyframes by surface and property
        const grouped = keyframes.reduce((acc, kf) => {
            const key = `${kf.surfaceId}_${kf.property}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(kf);
            return acc;
        }, {} as Record<string, Keyframe[]>);

        // Create GSAP tweens for each property
        Object.values(grouped).forEach((kfs) => {
            kfs.forEach((kf, index) => {
                if (index === 0) return; // Skip first keyframe (initial state)

                const prevKf = kfs[index - 1];
                const duration = kf.time - prevKf.time;

                // This is a placeholder - actual implementation would need to
                // integrate with the project store to animate surface properties
                timeline.to(
                    {},
                    {
                        duration,
                        ease: kf.easing || "power2.inOut",
                    },
                    prevKf.time
                );
            });
        });
    },
}));
