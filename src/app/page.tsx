"use client";

import { ProjectionCanvas } from "@/components/canvas/ProjectionCanvas";
import { MediaLibrary } from "@/components/panels/MediaLibrary";
import { SurfaceProperties } from "@/components/panels/SurfaceProperties";
import { TimelinePanel } from "@/components/panels/TimelinePanel";
import { CueList } from "@/components/panels/CueList";
import { ProjectMenu } from "@/components/ui/ProjectMenu";
import { PerformanceMonitor } from "@/components/ui/PerformanceMonitor";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";
import { useOutputStore } from "@/store/output-store";
import { useHotkeys, APP_HOTKEYS } from "@/hooks/useHotkeys";
import { generateId } from "@/lib/utils";
import { MousePointer2, Move, Grid3x3, Monitor, Layers } from "lucide-react";

export default function Home() {
    const addSurface = useProjectStore((state) => state.addSurface);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const setToolMode = useUIStore((state) => state.setToolMode);
    const toolMode = useUIStore((state) => state.toolMode);
    const openOutputWindow = useOutputStore((state) => state.openOutputWindow);

    // Initialize Global Hotkeys
    useHotkeys([
        { key: APP_HOTKEYS.SELECT_MODE, callback: () => setToolMode("select") },
        { key: APP_HOTKEYS.TRANSFORM_MODE, callback: () => setToolMode("transform") },
        { key: APP_HOTKEYS.CORNER_PIN_MODE, callback: () => setToolMode("corner-pin") },
        { key: APP_HOTKEYS.MESH_WARP_MODE, callback: () => setToolMode("mesh-warp") },
    ]);

    const handleAddTestSurface = () => {
        const mediaId = generateId();
        addMediaAsset({
            id: mediaId,
            name: "Test Color",
            type: "color",
            color: "#7c3aed",
        });
        addSurface(mediaId);
    };

    return (
        <main className="h-screen w-screen overflow-hidden bg-dark-950 flex flex-col text-white">
            {/* Top Toolbar */}
            <header className="h-14 glass border-b border-white/10 flex items-center px-4 gap-4 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-electric-purple to-electric-cyan flex items-center justify-center shadow-lg shadow-electric-purple/20">
                        <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        ProjectionX
                    </h1>
                </div>

                <div className="h-6 w-px bg-white/10 mx-2" />

                {/* File Menu Component */}
                <ProjectMenu />

                <div className="flex-1 flex justify-center">
                    {/* Tool Mode Switcher */}
                    <div className="flex gap-1 glass-dark rounded-lg p-1 border border-white/5">
                        <button
                            onClick={() => setToolMode("select")}
                            className={`p-1.5 rounded-md transition-all ${toolMode === "select"
                                ? "bg-electric-purple shadow-lg shadow-electric-purple/40 text-white"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                                }`}
                            title="Select (V)"
                        >
                            <MousePointer2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setToolMode("transform")}
                            className={`p-1.5 rounded-md transition-all ${toolMode === "transform"
                                ? "bg-electric-purple shadow-lg shadow-electric-purple/40 text-white"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                                }`}
                            title="Transform (T)"
                        >
                            <Move className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setToolMode("corner-pin")}
                            className={`p-1.5 rounded-md transition-all ${toolMode === "corner-pin"
                                ? "bg-electric-purple shadow-lg shadow-electric-purple/40 text-white"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                                }`}
                            title="Corner Pin (C)"
                        >
                            <Grid3x3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setToolMode("mesh-warp")}
                            className={`p-1.5 rounded-md transition-all ${toolMode === "mesh-warp"
                                ? "bg-electric-purple shadow-lg shadow-electric-purple/40 text-white"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                                }`}
                            title="Mesh Warp (M)"
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleAddTestSurface}
                        className="px-4 py-1.5 text-xs font-medium glass glass-hover rounded-lg border border-white/10 transition-all hover:border-white/30"
                    >
                        + New Surface
                    </button>
                    <button
                        onClick={openOutputWindow}
                        className="px-4 py-1.5 text-xs font-bold bg-electric-cyan text-black hover:bg-electric-cyan/80 rounded-lg transition-all shadow-lg shadow-electric-cyan/20 active:scale-95"
                    >
                        LAUNCH OUTPUT
                    </button>
                </div>
            </header>

            {/* Application Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Media & Cues */}
                <div className="w-72 flex flex-col border-r border-white/5 bg-dark-900/50">
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <MediaLibrary />
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="h-1/2 overflow-hidden flex flex-col">
                        <CueList />
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="flex-1 flex flex-col relative">
                    <div className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-dark-800 to-dark-950">
                        {/* 3D Canvas */}
                        <ProjectionCanvas />

                        {/* Performance Monitor Overlay */}
                        <PerformanceMonitor />
                    </div>

                    {/* Bottom Panel: Timeline */}
                    <div className="h-64 border-t border-white/10 relative z-30">
                        <TimelinePanel />
                    </div>
                </div>

                {/* Right Side: Properties */}
                <div className="w-80 border-l border-white/5 bg-dark-900/50 flex flex-col">
                    <SurfaceProperties />
                </div>
            </div>
        </main>
    );
}
