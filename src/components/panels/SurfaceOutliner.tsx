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
        <aside className="w-64 glass border-r border-white/10 flex flex-col pointer-events-auto">
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-electric-cyan" />
                    <h2 className="text-sm font-semibold text-white">Outliner</h2>
                </div>
                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/50">
                    {surfaces.length}
                </span>
            </div>

            {/* Search Bar */}
            <div className="p-2 border-b border-white/5">
                <div className="relative">
                    <Search className="absolute left-2 top-1.5 w-3 h-3 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search surfaces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded px-7 py-1 text-[11px] focus:outline-none focus:border-electric-cyan/50"
                    />
                </div>
            </div>

            {/* Surface List */}
            <div className="flex-1 overflow-y-auto">
                {sortedSurfaces.length === 0 ? (
                    <div className="p-4 text-center text-xs text-white/30 italic">
                        {searchQuery ? "No matches found" : "No layers yet"}
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {sortedSurfaces.map((surface, index) => {
                            const isSelected = selectedIds.includes(surface.id);

                            return (
                                <div
                                    key={surface.id}
                                    onClick={() => selectSurface(surface.id)}
                                    className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${isSelected ? "bg-electric-cyan/20 border-l-2 border-electric-cyan" : "hover:bg-white/5 border-l-2 border-transparent"
                                        }`}
                                >
                                    {/* Visibility Toggle */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleVisibility(surface.id);
                                        }}
                                        className={`transition-colors ${surface.visible ? "text-white/50 hover:text-white" : "text-electric-cyan"}`}
                                        title={surface.visible ? "Hide Layer" : "Show Layer"}
                                    >
                                        {surface.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    </button>

                                    {/* Surface Name */}
                                    <span className={`flex-1 text-xs truncate ${!surface.visible ? "opacity-30" : "opacity-90"}`}>
                                        {surface.name}
                                    </span>

                                    {/* Quick Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Reorder Up */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (index > 0) reorderSurface(surface.id, sortedSurfaces.length - index);
                                            }}
                                            className="text-white/30 hover:text-white"
                                            title="Bring Forward"
                                        >
                                            <ChevronUp className="w-3 h-3" />
                                        </button>

                                        {/* Lock Toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLock(surface.id);
                                            }}
                                            className={`transition-colors ${surface.locked ? "text-yellow-400" : "text-white/30 hover:text-white"}`}
                                            title={surface.locked ? "Unlock" : "Lock"}
                                        >
                                            {surface.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteSurface(surface.id);
                                            }}
                                            className="text-white/30 hover:text-red-400"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="p-2 border-t border-white/10 bg-black/20">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">
                    Layer Stack
                </p>
            </div>
        </aside>
    );
}
