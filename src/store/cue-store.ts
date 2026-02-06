import { create } from "zustand";
import type { Surface } from "./project-store";
import type { EffectSettings } from "./effects-store";

export interface CueSnapshot {
    surfaces: Surface[];
    effects: Record<string, EffectSettings>;
    timestamp: number;
}

export interface Cue {
    id: string;
    name: string;
    hotkey?: number; // 1-9
    snapshot: CueSnapshot;
    transitionDuration: number; // in seconds
    createdAt: number;
}

interface CueState {
    cues: Cue[];
    activeCueId: string | null;
    isTransitioning: boolean;

    // Actions
    addCue: (name: string, hotkey?: number) => void;
    updateCue: (id: string, updates: Partial<Cue>) => void;
    deleteCue: (id: string) => void;
    triggerCue: (id: string) => void;
    triggerCueByHotkey: (hotkey: number) => void;
    captureSnapshot: () => CueSnapshot;
    restoreSnapshot: (snapshot: CueSnapshot, duration?: number) => void;
}

export const useCueStore = create<CueState>((set, get) => ({
    cues: [],
    activeCueId: null,
    isTransitioning: false,

    addCue: (name, hotkey) => {
        const snapshot = get().captureSnapshot();
        const id = `cue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        set((state) => ({
            cues: [
                ...state.cues,
                {
                    id,
                    name,
                    hotkey,
                    snapshot,
                    transitionDuration: 1.0,
                    createdAt: Date.now(),
                },
            ],
        }));
    },

    updateCue: (id, updates) => {
        set((state) => ({
            cues: state.cues.map((cue) =>
                cue.id === id ? { ...cue, ...updates } : cue
            ),
        }));
    },

    deleteCue: (id) => {
        set((state) => ({
            cues: state.cues.filter((cue) => cue.id !== id),
            activeCueId: state.activeCueId === id ? null : state.activeCueId,
        }));
    },

    triggerCue: (id) => {
        const cue = get().cues.find((c) => c.id === id);
        if (!cue) return;

        set({ activeCueId: id, isTransitioning: true });
        get().restoreSnapshot(cue.snapshot, cue.transitionDuration);

        setTimeout(() => {
            set({ isTransitioning: false });
        }, cue.transitionDuration * 1000);
    },

    triggerCueByHotkey: (hotkey) => {
        const cue = get().cues.find((c) => c.hotkey === hotkey);
        if (cue) {
            get().triggerCue(cue.id);
        }
    },

    captureSnapshot: () => {
        // This will be populated by the component that uses this store
        // We need access to project-store and effects-store
        return {
            surfaces: [],
            effects: {},
            timestamp: Date.now(),
        };
    },

    restoreSnapshot: (snapshot, duration = 0) => {
        // This will be implemented by the component
        // It needs to update project-store and effects-store
        console.log("Restoring snapshot with duration:", duration);
    },
}));
