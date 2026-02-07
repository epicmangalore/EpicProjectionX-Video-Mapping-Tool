"use client";

import { create } from "zustand";

interface AudioState {
    isEnabled: boolean;
    analyser: AnalyserNode | null;
    audioContext: AudioContext | null;
    source: MediaStreamAudioSourceNode | null;
    dataArray: Uint8Array | null;
    levels: {
        bass: number;
        mid: number;
        treble: number;
        volume: number;
    };

    initAudio: () => Promise<void>;
    stopAudio: () => void;
    updateLevels: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
    isEnabled: false,
    analyser: null,
    audioContext: null,
    source: null,
    dataArray: null,
    levels: {
        bass: 0,
        mid: 0,
        treble: 0,
        volume: 0,
    },

    initAudio: async () => {
        if (get().isEnabled) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);

            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            set({
                isEnabled: true,
                audioContext,
                analyser,
                source,
                dataArray,
            });
        } catch (err) {
            console.error("Failed to initialize audio:", err);
        }
    },

    stopAudio: () => {
        const { source, audioContext } = get();
        if (source) {
            source.disconnect();
            (source.mediaStream as MediaStream).getTracks().forEach(t => t.stop());
        }
        if (audioContext) audioContext.close();

        set({
            isEnabled: false,
            audioContext: null,
            analyser: null,
            source: null,
            dataArray: null,
            levels: { bass: 0, mid: 0, treble: 0, volume: 0 },
        });
    },

    updateLevels: () => {
        const { analyser, dataArray } = get();
        if (!analyser || !dataArray) return;

        analyser.getByteFrequencyData(dataArray as any);

        // Simple frequency bands analysis
        const bufferLength = analyser.frequencyBinCount;

        let bass = 0;
        let mid = 0;
        let treble = 0;
        let total = 0;

        // Bass: 0-20% of spectrum
        for (let i = 0; i < bufferLength * 0.2; i++) bass += dataArray[i];
        bass = bass / (bufferLength * 0.2 * 255);

        // Mid: 20-60%
        for (let i = Math.floor(bufferLength * 0.2); i < bufferLength * 0.6; i++) mid += dataArray[i];
        mid = mid / (bufferLength * 0.4 * 255);

        // Treble: 60-100%
        for (let i = Math.floor(bufferLength * 0.6); i < bufferLength; i++) treble += dataArray[i];
        treble = treble / (bufferLength * 0.4 * 255);

        // Volume: Average of all
        for (let i = 0; i < bufferLength; i++) total += dataArray[i];
        const volume = total / (bufferLength * 255);

        set({
            levels: { bass, mid, treble, volume }
        });
    },
}));
