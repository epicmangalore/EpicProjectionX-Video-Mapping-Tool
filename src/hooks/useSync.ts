"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/store/project-store";
import { useEffectsStore } from "@/store/effects-store";
import { useOutputStore } from "@/store/output-store";

const SYNC_CHANNEL = "projectionx_sync";

export function useSync() {
    const isOutput = useOutputStore((state) => state.isOutput);

    useEffect(() => {
        const channel = new BroadcastChannel(SYNC_CHANNEL);

        if (isOutput) {
            // Request initial state
            channel.postMessage({ type: "SYNC_REQUEST" });

            // Listen for state updates in Output window
            channel.onmessage = (event) => {
                const { type, data } = event.data;
                if (type === "STATE_UPDATE") {
                    if (data.project) useProjectStore.setState(data.project);
                    if (data.effects) useEffectsStore.setState(data.effects);
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
                            project: JSON.parse(JSON.stringify(projectData)),
                            effects: JSON.parse(JSON.stringify(useEffectsStore.getState())),
                        }
                    });
                }
            };

            // Broadcast state updates from Control window
            const unsubscribeProject = useProjectStore.subscribe((state) => {
                // Only sync data, not functions
                const projectData = {
                    surfaces: state.surfaces,
                    mediaAssets: state.mediaAssets,
                    cues: state.cues,
                    projectSettings: state.projectSettings,
                    selectedSurfaceIds: [], // Don't sync selection to output to avoid gizmos
                    currentProjectId: state.currentProjectId
                };

                channel.postMessage({
                    type: "STATE_UPDATE",
                    data: {
                        project: JSON.parse(JSON.stringify(projectData)), // Safe strip of any hidden non-serializables
                        effects: JSON.parse(JSON.stringify(useEffectsStore.getState())),
                    }
                });
            });

            const unsubscribeEffects = useEffectsStore.subscribe((state) => {
                const projectData = {
                    surfaces: useProjectStore.getState().surfaces,
                    mediaAssets: useProjectStore.getState().mediaAssets,
                    cues: useProjectStore.getState().cues,
                    projectSettings: useProjectStore.getState().projectSettings,
                    selectedSurfaceIds: [],
                    currentProjectId: useProjectStore.getState().currentProjectId
                };

                channel.postMessage({
                    type: "STATE_UPDATE",
                    data: {
                        project: JSON.parse(JSON.stringify(projectData)),
                        effects: JSON.parse(JSON.stringify(state)),
                    }
                });
            });

            return () => {
                unsubscribeProject();
                unsubscribeEffects();
                channel.close();
            };
        }

        return () => {
            channel.close();
        };
    }, [isOutput]);
}
