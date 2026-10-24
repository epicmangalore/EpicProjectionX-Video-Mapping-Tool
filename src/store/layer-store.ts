import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId } from "@/lib/utils";

export type BlendMode = "normal" | "add" | "multiply" | "screen" | "overlay";

export interface Layer {
    id: string;
    name: string;
    activeClipId: string | null;
    opacity: number;
    blendMode: BlendMode;
    speed: number;
    visible: boolean;
    effects: any[]; // To be detailed in Phase 2
}

interface LayerState {
    layers: Layer[];
    activeLayerId: string | null;

    // Actions
    addLayer: () => void;
    removeLayer: (id: string) => void;
    updateLayer: (id: string, updates: Partial<Layer>) => void;
    setActiveLayer: (id: string | null) => void;
    reorderLayers: (startIndex: number, endIndex: number) => void;
    triggerClip: (layerId: string, clipId: string) => void;
}

const DEFAULT_LAYERS: Layer[] = [
    {
        id: "layer-1",
        name: "Layer 1",
        activeClipId: null,
        opacity: 1,
        blendMode: "normal",
        speed: 1,
        visible: true,
        effects: []
    },
    {
        id: "layer-2",
        name: "Layer 2",
        activeClipId: null,
        opacity: 0,
        blendMode: "add",
        speed: 1,
        visible: true,
        effects: []
    }
];

export const useLayerStore = create<LayerState>()(
    persist(
        (set) => ({
            layers: DEFAULT_LAYERS,
            activeLayerId: "layer-1",

            addLayer: () => set((state) => ({
                layers: [
                    ...state.layers,
                    {
                        id: generateId(),
                        name: `Layer ${state.layers.length + 1}`,
                        activeClipId: null,
                        opacity: 0,
                        blendMode: "normal",
                        speed: 1,
                        visible: true,
                        effects: []
                    }
                ]
            })),

            removeLayer: (id) => set((state) => ({
                layers: state.layers.filter((l) => l.id !== id),
                activeLayerId: state.activeLayerId === id ? (state.layers[0]?.id || null) : state.activeLayerId
            })),

            updateLayer: (id, updates) => set((state) => ({
                layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l))
            })),

            setActiveLayer: (id) => set({ activeLayerId: id }),

            reorderLayers: (startIndex, endIndex) => set((state) => {
                const newLayers = [...state.layers];
                const [removed] = newLayers.splice(startIndex, 1);
                newLayers.splice(endIndex, 0, removed);
                return { layers: newLayers };
            }),

            triggerClip: (layerId, clipId) => set((state) => ({
                layers: state.layers.map((l) => (l.id === layerId ? { ...l, activeClipId: clipId } : l))
            }))
        }),
        {
            name: "projectx-layer-storage"
        }
    )
);
