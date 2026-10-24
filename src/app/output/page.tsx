"use client";

import { useEffect } from "react";
import { ProjectionCanvas } from "@/components/canvas/ProjectionCanvas";
import { useSync } from "@/hooks/useSync";
import { useOutputStore } from "@/store/output-store";
import { ProjectHydration } from "@/components/layout/ProjectHydration";
import { VideoContainer } from "@/components/layout/VideoContainer";
import { ProjectorSetupPanel } from "@/components/output/ProjectorSetupPanel";

export default function OutputPage() {
    const setIsOutput = useOutputStore((state) => state.setIsOutput);

    useEffect(() => {
        setIsOutput(true);
    }, [setIsOutput]);

    useSync();

    return (
        <div className="h-screen w-screen overflow-hidden bg-black" onDoubleClick={(e) => {
            // Allow double-click anywhere in the window to go fullscreen (as per requirements)
            const target = e.target as HTMLElement;
            // Don't trigger if clicking on interactive elements
            if (target.tagName === 'BUTTON' || target.closest('button')) {
                return;
            }
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        }}>
            <VideoContainer />
            <ProjectHydration />
            <ProjectionCanvas />
            <ProjectorSetupPanel />
        </div>
    );
}
