"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/store/project-store";

export function ProjectHydration() {
    const hydrateMediaAssets = useProjectStore((state) => state.hydrateMediaAssets);
    const hasHydrated = useProjectStore((state) => state._hasHydrated);

    useEffect(() => {
        if (hasHydrated) {
            hydrateMediaAssets();

            // Ensure at least one scene exists (Mandatory Composition)
            const scenes = useProjectStore.getState().scenes;
            if (scenes.length === 0) {
                console.log("Initializing mandatory Scene 1...");
                useProjectStore.getState().addScene("Scene 1");
            }
        }
    }, [hydrateMediaAssets, hasHydrated]);

    return null;
}
