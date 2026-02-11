import { create } from "zustand";

interface PlaybackStore {
    // State
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    loop: boolean;
    bpm: number;
    bpmSyncEnabled: boolean;

    // Actions
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    toggleLoop: () => void;
    setBPM: (bpm: number) => void;
    toggleBPMSync: () => void;
    tapTempo: () => void;
    syncAllVideos: () => void;
}

let lastTapTime = 0;
let tapIntervals: number[] = [];

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
    // Initial state
    isPlaying: false,
    currentTime: 0,
    duration: 60, // Default 60 seconds
    loop: false,
    bpm: 120,
    bpmSyncEnabled: false,

    // Actions
    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

    setCurrentTime: (time) => {
        const { duration, loop } = get();
        let newTime = time;

        if (newTime > duration) {
            newTime = loop ? 0 : duration;
        }
        if (newTime < 0) {
            newTime = 0;
        }

        set({ currentTime: newTime });
    },

    setDuration: (duration) => set({ duration }),
    toggleLoop: () => set((state) => ({ loop: !state.loop })),
    setBPM: (bpm) => set({ bpm }),
    toggleBPMSync: () =>
        set((state) => ({ bpmSyncEnabled: !state.bpmSyncEnabled })),

    tapTempo: () => {
        const now = Date.now();

        if (lastTapTime && now - lastTapTime < 2000) {
            // Within 2 seconds of last tap
            const interval = now - lastTapTime;
            tapIntervals.push(interval);

            // Keep only last 4 taps
            if (tapIntervals.length > 4) {
                tapIntervals.shift();
            }

            // Calculate average BPM
            if (tapIntervals.length >= 2) {
                const avgInterval =
                    tapIntervals.reduce((a, b) => a + b, 0) / tapIntervals.length;
                const bpm = Math.round(60000 / avgInterval);
                set({ bpm });
            }
        } else {
            // Reset if too much time has passed
            tapIntervals = [];
        }

        lastTapTime = now;
    },

    syncAllVideos: () => {
        const { currentTime } = get();

        // Dispatch custom event to force all video elements to sync
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent("force-video-sync", {
                detail: { time: currentTime }
            }));
        }
    },
}));
