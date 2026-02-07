"use client";

import { useProjectStore } from "@/store/project-store";
import { Eye, EyeOff, Lock, Unlock, Layers, Search, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";

export function SurfaceOutliner() {
    const surfaces = useProjectStore((state) => state.surfaces);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const selectSurface = useProjectStore((state) => state.selectSurface);
    const toggleVisibility = useProjectStore((state) => state.toggleVisibility);
    const toggleLock = useProjectStore((state) => state.toggleLock);
    const deleteSurface = useProjectStore((state) => state.deleteSurface);
    const reorderSurface = useProjectStore((state) => state.reorderSurface);

    const [searchQuery, setSearchQuery] = useState("");

    // Sort surfaces by zIndex (reverse so top layers are first in list)
    const sortedSurfaces = [...surfaces]
        .sort((a, b) => b.zIndex - a.zIndex)
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <aside className="w-full h-full flex flex-col pointer-events-auto bg-zinc-950 font-sans text-xs">
            {/* Search Bar */}
            <div className="p-1 border-b border-white/5 bg-zinc-900">
                <div className="relative">
                    <Search className="absolute left-2 top-1.5 w-3 h-3 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="SEARCH"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 rounded px-7 py-1 text-[10px] font-bold text-zinc-300 focus:outline-none focus:border-electric-cyan placeholder:text-zinc-600 uppercase tracking-wide"
                    />
                </div>
            </div>

            {/* Table Header */}
            <div className="flex items-center px-1 py-1 bg-zinc-900 border-b border-white/5 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                <div className="w-6 text-center">#</div>
                <div className="flex-1 px-2">Layer Name</div>
                <div className="w-16 flex justify-end gap-1 px-1">
                    <span className="w-6 text-center">Vis</span>
                    <span className="w-6 text-center">Lock</span>
                </div>
            </div>

            {/* Surface List */}
            <div className="flex-1 overflow-y-auto bg-zinc-950">
                {sortedSurfaces.length === 0 ? (
                    <div className="p-4 text-center text-[10px] text-zinc-600 uppercase tracking-widest mt-10">
                        {searchQuery ? "No Matches" : "Empty"}
                    </div>
                ) : (
                    <div>
                        {sortedSurfaces.map((surface, index) => {
                            const isSelected = selectedIds.includes(surface.id);
                            // Traktor Zebra Striping: Darker alternating rows
                            const bgClass = isSelected
                                ? "bg-electric-cyan/20 text-electric-cyan"
                                : index % 2 === 0 ? "bg-zinc-900/30" : "bg-transparent";

                            const textClass = isSelected ? "text-electric-cyan" : "text-zinc-300";

                            return (
                                <div
                                    key={surface.id}
                                    onClick={() => selectSurface(surface.id)}
                                    className={`group flex items-center h-7 px-1 cursor-pointer transition-colors border-b border-white/5 ${bgClass}`}
                                >
                                    {/* Index / ID */}
                                    <div className="w-6 text-center text-[9px] font-mono opacity-50">
                                        {sortedSurfaces.length - index}
                                    </div>

                                    {/* Surface Name */}
                                    <div className={`flex-1 px-2 text-[10px] font-medium truncate ${textClass} ${!surface.visible ? "opacity-40" : ""}`}>
                                        {surface.name}
                                    </div>

                                    {/* Controls (Right Aligned) */}
                                    <div className="w-16 flex justify-end gap-1 px-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                        {/* Visibility Toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleVisibility(surface.id);
                                            }}
                                            className={`w-6 h-full flex items-center justify-center hover:text-white ${surface.visible ? "text-zinc-400" : "text-zinc-700"}`}
                                        >
                                            {surface.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                        </button>

                                        {/* Lock Toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLock(surface.id);
                                            }}
                                            className={`w-6 h-full flex items-center justify-center hover:text-white ${surface.locked ? "text-electric-orange" : "text-zinc-700"}`}
                                        >
                                            {surface.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        </button>
                                    </div>

                                    {/* Simple Delete (Hover only) - Traktor doesn't have inline delete usually but useful here */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSurface(surface.id);
                                        }}
                                        className="w-4 h-full flex items-center justify-center text-zinc-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-1"
                                    >
                                        <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="p-1 px-2 bg-zinc-900 border-t border-white/5 flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                <span>Total</span>
                <span>{surfaces.length} Items</span>
            </div>
        </aside>
    );
}
