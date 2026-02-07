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
            // Listen for state updates in Output window
            channel.onmessage = (event) => {
                const { type, data } = event.data;
                if (type === "STATE_UPDATE") {
                    console.log("Sync: Received state update");
                    if (data.project) useProjectStore.setState(data.project);
                    if (data.effects) useEffectsStore.setState(data.effects);
                }
            };
        } else {
            // Broadcast state updates from Control window
            const unsubscribeProject = useProjectStore.subscribe((state) => {
                channel.postMessage({
                    type: "STATE_UPDATE",
                    data: {
                        project: state,
                        effects: useEffectsStore.getState(),
                    }
                });
            });

            const unsubscribeEffects = useEffectsStore.subscribe((state) => {
                channel.postMessage({
                    type: "STATE_UPDATE",
                    data: {
                        project: useProjectStore.getState(),
                        effects: state,
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
