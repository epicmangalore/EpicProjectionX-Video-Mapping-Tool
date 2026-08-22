import { create } from "zustand";

export interface MIDIMapping {
    id: string;
    type: "cc" | "note";
    channel: number;
    number: number;
    targetId: string; // The property or action to trigger
    targetType: "property" | "action";
    minValue: number;
    maxValue: number;
}

interface MIDIState {
    enabled: boolean;
    inputs: WebMidi.MIDIInput[];
    outputs: WebMidi.MIDIOutput[];
    mappings: MIDIMapping[];
    isLearning: boolean;
    learningTarget: { id: string; type: "property" | "action" } | null;
    lastMessage: { channel: number; number: number; value: number; type: string } | null;

    // Actions
    initMIDI: () => Promise<void>;
    addMapping: (mapping: MIDIMapping) => void;
    removeMapping: (id: string) => void;
    startLearning: (targetId: string, targetType: "property" | "action") => void;
    stopLearning: () => void;
    processMIDIMessage: (message: WebMidi.MIDIMessageEvent) => void;
}

export const useMIDIStore = create<MIDIState>((set, get) => ({
    enabled: false,
    inputs: [],
    outputs: [],
    mappings: [],
    isLearning: false,
    learningTarget: null,
    lastMessage: null,

    initMIDI: async () => {
        if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) {
            console.warn("WebMIDI is not supported in this browser.");
            return;
        }

        try {
            const access = await navigator.requestMIDIAccess();
            const inputs = Array.from(access.inputs.values());
            const outputs = Array.from(access.outputs.values());

            set({ enabled: true, inputs, outputs });

            inputs.forEach((input) => {
                input.onmidimessage = (msg) => get().processMIDIMessage(msg);
            });

            access.onstatechange = (e) => {
                const newInputs = Array.from(access.inputs.values());
                const newOutputs = Array.from(access.outputs.values());
                set({ inputs: newInputs, outputs: newOutputs });
            };
        } catch (err) {
            console.error("Failed to access MIDI devices:", err);
        }
    },

    addMapping: (mapping) => {
        set((state) => ({ mappings: [...state.mappings, mapping] }));
    },

    removeMapping: (id) => {
        set((state) => ({ mappings: state.mappings.filter((m) => m.id !== id) }));
    },

    startLearning: (targetId, targetType) => {
        set({ isLearning: true, learningTarget: { id: targetId, type: targetType } });
    },

    stopLearning: () => {
        set({ isLearning: false, learningTarget: null });
    },

    processMIDIMessage: (message) => {
        const data = message.data;
        if (!data) return;

        const command = data[0] & 0xf0;
        const channel = (data[0] & 0x0f) + 1;
        const number = data[1];
        const value = data[2];

        const type = command === 0xb0 ? "cc" : command === 0x90 ? "note" : "unknown";

        set({ lastMessage: { channel, number, value, type } });

        // If learning, create a new mapping
        if (get().isLearning && get().learningTarget) {
            const target = get().learningTarget!;
            const mappingId = `midi_${channel}_${number}_${target.id}`;

            // Prevent duplicates
            if (!get().mappings.find(m => m.id === mappingId)) {
                get().addMapping({
                    id: mappingId,
                    type: type as "cc" | "note",
                    channel,
                    number,
                    targetId: target.id,
                    targetType: target.type,
                    minValue: 0,
                    maxValue: 1,
                });
            }
            get().stopLearning();
            return;
        }

        // Process existing mappings
        const mapping = get().mappings.find(
            (m) => m.channel === channel && m.number === number && m.type === type
        );

        if (mapping) {
            // Trigger target action/property update
            console.log(`MIDI Mapping Triggered: ${mapping.targetId} = ${value / 127}`);

            // Handle Layer Control
            if (mapping.targetId.startsWith("layer-")) {
                const parts = mapping.targetId.split(":");
                const layerId = parts[0];
                const property = parts[1]; // opacity, speed

                const layerStore = require("./layer-store").useLayerStore.getState();
                const currentLayer = layerStore.layers.find((l: any) => l.id === layerId);

                if (currentLayer) {
                    if (property === "opacity") {
                        const opacity = (value / 127) * (mapping.maxValue - mapping.minValue) + mapping.minValue;
                        layerStore.updateLayer(layerId, { opacity });
                    } else if (property === "speed") {
                        // Map 0-127 to -4 to 4
                        // Center (63/64) should be 0 or 1 depending on preference, but here we map linearly
                        // Let's assume user maps knob to specific range in UI, but defaults:
                        const normalized = value / 127;
                        const speed = normalized * (mapping.maxValue - mapping.minValue) + mapping.minValue;
                        layerStore.updateLayer(layerId, { speed });
                    }
                }
            }
        }
    },
}));
