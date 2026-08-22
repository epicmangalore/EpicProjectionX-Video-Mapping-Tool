"use client";

import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";
import { Check, X, RotateCcw, FlipHorizontal, FlipVertical } from "lucide-react";
import { useState, useEffect } from "react";

export function WarpControlBar() {
    const toolMode = useUIStore((state) => state.toolMode);
    const setToolMode = useUIStore((state) => state.setToolMode);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const surfaces = useProjectStore((state) => state.getActiveSurfaces());
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const undo = useProjectStore((state) => state.undo);

    if (toolMode !== "mesh-warp" || selectedIds.length === 0) return null;

    const surface = surfaces.find(s => s.id === selectedIds[0]);
    if (!surface) return null;

    const handleDone = () => {
        setToolMode("select");
    };

    const handleCancel = () => {
        undo(); // Revert to before warp initialization/changes
        setToolMode("select");
    };

    const handleReset = () => {
        updateSurface(surface.id, { meshWarp: null });
        // Re-initialize if they still want to be in warp mode but clean? 
        // Or just null it out.
    };

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-lg p-1 shadow-2xl z-[1000] pointer-events-auto">
            <div className="flex items-center gap-0.5 px-2 border-r border-white/5 mr-1">
                <div className="w-1.5 h-4 bg-white/20 rounded-full mr-2" />
                <button className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors">
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors">
                    <FlipHorizontal className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors">
                    <FlipVertical className="w-4 h-4" />
                </button>
            </div>

            <div className="flex items-center gap-2 px-2">
                <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleDone}
                    className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-black text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
