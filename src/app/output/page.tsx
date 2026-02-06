"use client";

import { ProjectionCanvas } from "@/components/canvas/ProjectionCanvas";

export default function OutputPage() {
    return (
        <div className="h-screen w-screen overflow-hidden bg-black">
            <ProjectionCanvas />
        </div>
    );
}
