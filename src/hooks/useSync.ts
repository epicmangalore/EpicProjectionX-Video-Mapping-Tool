"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/store/project-store";
import { useEffectsStore } from "@/store/effects-store";
import { useOutputStore } from "@/store/output-store";
import { useAudioStore } from "@/store/audio-store";

const SYNC_CHANNEL = "projectionx_sync";

export function useSync() {
    const isOutput = useOutputStore((state) => state.isOutput);

    useEffect(() => {
        const channel = new BroadcastChannel(SYNC_CHANNEL);
        let animationFrameId: number;

        if (isOutput) {
            // Request initial state
            channel.postMessage({ type: "SYNC_REQUEST" });

            // Listen for state updates in Output window
            channel.onmessage = (event) => {
                const { type, data } = event.data;
                if (type === "STATE_UPDATE") {
                    if (data.project) useProjectStore.setState(data.project);
                    if (data.effects) useEffectsStore.setState(data.effects);
                } else if (type === "AUDIO_UPDATE") {
                    if (data.levels) {
                        useAudioStore.getState().setLevels(data.levels);
                    }
                }
            };
        } else {
            // Listen for sync requests from new output windows
            channel.onmessage = (event) => {
                if (event.data.type === "SYNC_REQUEST") {
                    const projectData = {
                        surfaces: useProjectStore.getState().surfaces,
                        mediaAssets: useProjectStore.getState().mediaAssets,
                        cues: useProjectStore.getState().cues,
                        projectSettings: useProjectStore.getState().projectSettings,
                        selectedSurfaceIds: [], // Don't sync selection to output
                        currentProjectId: useProjectStore.getState().currentProjectId
                    };

                    channel.postMessage({
                        type: "STATE_UPDATE",
                        data: {
                            project: projectData,
                            effects: {
                                surfaceEffects: useEffectsStore.getState().surfaceEffects,
                                globalEffects: useEffectsStore.getState().globalEffects
                            },
                        }
                    });
                }
            };

            // Broadcast state updates from Control window
            let lastProjectStateStr = "";
            let lastEffectsStateStr = "";

            const syncState = () => {
                const projectState = useProjectStore.getState();
                const effectsState = useEffectsStore.getState();

                // 1. Sync Project State
                const projectData = {
                    surfaces: projectState.surfaces,
                    mediaAssets: projectState.mediaAssets,
                    cues: projectState.cues,
                    projectSettings: projectState.projectSettings,
                    selectedSurfaceIds: [], // Don't sync selection
                    currentProjectId: projectState.currentProjectId
                };

                const effectsData = {
                    surfaceEffects: effectsState.surfaceEffects,
                    globalEffects: effectsState.globalEffects
                };

                // Simple check to avoid sending identical frames
                // We use JSON stringify for comparison but send the object directly
                // BroadcastChannel handles structured cloning efficiently
                const currentProjectStr = JSON.stringify(projectData);
                const currentEffectsStr = JSON.stringify(effectsData);

                let hasUpdates = false;
                const updateData: any = {};

                if (currentProjectStr !== lastProjectStateStr) {
                    updateData.project = projectData;
                    lastProjectStateStr = currentProjectStr;
                    hasUpdates = true;
                }

                if (currentEffectsStr !== lastEffectsStateStr) {
                    updateData.effects = effectsData;
                    lastEffectsStateStr = currentEffectsStr;
                    hasUpdates = true;
                }

                if (hasUpdates) {
                    channel.postMessage({
                        type: "STATE_UPDATE",
                        data: updateData
                    });
                }

                // 2. Sync Audio Levels (Separate high-frequency channel or same?)
                // Audio updates are high frequency (every frame)
                // We can just fire them if they change significantly or every frame
                const audioState = useAudioStore.getState();
                if (audioState.isEnabled) {
                    channel.postMessage({
                        type: "AUDIO_UPDATE",
                        data: { levels: audioState.levels }
                    });
                }

                animationFrameId = requestAnimationFrame(syncState);
            };

            // Start the sync loop
            syncState();

            return () => {
                cancelAnimationFrame(animationFrameId);
                channel.close();
            };
        }

        return () => {
            channel.close();
        };
    }, [isOutput]);
}
