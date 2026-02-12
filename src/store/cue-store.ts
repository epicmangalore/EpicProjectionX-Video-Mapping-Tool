import { create } from "zustand";
import type { Surface } from "./project-store";
import type { EffectSettings } from "./effects-store";
import type { Keyframe } from "./timeline-store";

export interface SceneSnapshot {
    surfaces: Surface[];
    effects: Record<string, EffectSettings>;
    keyframes: Keyframe[];
    timelineDuration: number;
    timestamp: number;
}

export interface Scene {
    id: string;
    name: string;
    hotkey?: number; // 1-9
    snapshot: SceneSnapshot;
    transitionDuration: number; // in seconds
    createdAt: number;
}

interface SceneState {
    scenes: Scene[];
    activeSceneId: string | null;
    isTransitioning: boolean;

    // Actions
    addScene: (name: string, hotkey?: number) => void;
    updateScene: (id: string, updates: Partial<Scene>) => void;
    deleteScene: (id: string) => void;
    triggerScene: (id: string) => void;
    triggerSceneByHotkey: (hotkey: number) => void;
    captureSnapshot: () => SceneSnapshot;
    restoreSnapshot: (snapshot: SceneSnapshot, duration?: number) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
    scenes: [],
    activeSceneId: null,
    isTransitioning: false,

    addScene: (name, hotkey) => {
        const snapshot = get().captureSnapshot();
        const id = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        set((state) => ({
            scenes: [
                ...state.scenes,
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

    updateScene: (id, updates) => {
        set((state) => ({
            scenes: state.scenes.map((scene) =>
                scene.id === id ? { ...scene, ...updates } : scene
            ),
        }));
    },

    deleteScene: (id) => {
        set((state) => ({
            scenes: state.scenes.filter((scene) => scene.id !== id),
            activeSceneId: state.activeSceneId === id ? null : state.activeSceneId,
        }));
    },

    triggerScene: (id) => {
        const scene = get().scenes.find((s) => s.id === id);
        if (!scene) return;

        set({ activeSceneId: id, isTransitioning: true });
        get().restoreSnapshot(scene.snapshot, scene.transitionDuration);

        setTimeout(() => {
            set({ isTransitioning: false });
        }, scene.transitionDuration * 1000);
    },

    triggerSceneByHotkey: (hotkey) => {
        const scene = get().scenes.find((s) => s.hotkey === hotkey);
        if (scene) {
            get().triggerScene(scene.id);
        }
    },

    captureSnapshot: () => {
        // Import stores dynamically to capture current state
        const { useProjectStore } = require("./project-store");
        const { useTimelineStore } = require("./timeline-store");
        const projectState = useProjectStore.getState();
        const timelineState = useTimelineStore.getState();

        return {
            surfaces: JSON.parse(JSON.stringify(projectState.getActiveSurfaces())),
            effects: {},
            keyframes: JSON.parse(JSON.stringify(timelineState.keyframes)),
            timelineDuration: timelineState.duration,
            timestamp: Date.now(),
        };
    },

    restoreSnapshot: (snapshot, duration = 0) => {
        const { useProjectStore } = require("./project-store");
        const { useTimelineStore } = require("./timeline-store");

        // Restore surfaces
        useProjectStore
            .getState()
            .updateActiveSceneSurfaces(JSON.parse(JSON.stringify(snapshot.surfaces)));

        // Restore timeline keyframes and duration
        useTimelineStore.setState({
            keyframes: JSON.parse(JSON.stringify(snapshot.keyframes || [])),
            duration: snapshot.timelineDuration || 30,
        });
    },
}));
