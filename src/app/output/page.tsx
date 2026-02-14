"use client";

import { useEffect } from "react";
import { ProjectionCanvas } from "@/components/canvas/ProjectionCanvas";
import { useSync } from "@/hooks/useSync";
import { useOutputStore } from "@/store/output-store";
import { ProjectHydration } from "@/components/layout/ProjectHydration";
import { VideoContainer } from "@/components/layout/VideoContainer";

export default function OutputPage() {
    const setIsOutput = useOutputStore((state) => state.setIsOutput);

    useEffect(() => {
        setIsOutput(true);
    }, [setIsOutput]);

    useSync();

    return (
        <div className="h-screen w-screen overflow-hidden bg-black">
            <VideoContainer />
            <ProjectHydration />
            <ProjectionCanvas />
        </div>
    );
}
