"use client";

import { ProjectionCanvas } from "@/components/canvas/ProjectionCanvas";
import { useProjectStore } from "@/store/project-store";
import { generateId } from "@/lib/utils";

export default function Home() {
    const addSurface = useProjectStore((state) => state.addSurface);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const surfaces = useProjectStore((state) => state.surfaces);

    const handleAddTestSurface = () => {
        // Add a test color media asset
        const mediaId = generateId();
        addMediaAsset({
            id: mediaId,
            name: "Test Color",
            type: "color",
            color: "#7c3aed",
        });

        // Add surface with the media
        addSurface(mediaId);
    };
    return (
        <main className="h-screen w-screen overflow-hidden bg-dark-900 flex">
            {/* Left Panel - Media Library */}
            <aside className="w-80 glass border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-electric-purple">Media Library</h2>
                </div>
                <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground">Asset browser coming soon...</p>
                </div>
            </aside>

            {/* Center - Main Canvas */}
            <div className="flex-1 flex flex-col">
                {/* Toolbar */}
                <header className="h-14 glass border-b border-white/10 flex items-center px-4 gap-4">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-electric-purple to-electric-cyan bg-clip-text text-transparent">
                        ProjectionX
                    </h1>
                    <div className="flex-1" />
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddTestSurface}
                            className="px-3 py-1.5 text-sm glass glass-hover rounded-md"
                        >
                            Add Surface ({surfaces.length})
                        </button>
                        <button className="px-3 py-1.5 text-sm glass glass-hover rounded-md">
                            Save
                        </button>
                        <button className="px-3 py-1.5 text-sm bg-electric-purple hover:bg-electric-purple/80 rounded-md transition-colors">
                            Output
                        </button>
                    </div>
                </header>

                {/* Canvas Area */}
                <div className="flex-1 relative bg-dark-900">
                    <ProjectionCanvas />
                </div>

                {/* Bottom Panel - Timeline */}
                <div className="h-48 glass border-t border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">Timeline</h3>
                        <div className="flex gap-2">
                            <button className="p-1.5 glass glass-hover rounded">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="h-24 bg-dark-800/40 rounded border border-white/5 flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">Timeline tracks will appear here</p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Properties */}
            <aside className="w-80 glass border-l border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-electric-cyan">Properties</h2>
                </div>
                <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground">Select a surface to edit properties</p>
                </div>
            </aside>
        </main>
    );
}
