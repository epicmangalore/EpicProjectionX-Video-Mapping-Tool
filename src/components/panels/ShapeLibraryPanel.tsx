"use client";

import { useState } from "react";
import { X, Search, Shapes } from "lucide-react";
import { SHAPE_PRESETS, getShapeCategories, getShapesByCategory, searchShapes, ShapePreset } from "@/lib/shapes/ShapeLibrary";
import { useProjectStore } from "@/store/project-store";

interface ShapeLibraryPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ShapeLibraryPanel({ isOpen, onClose }: ShapeLibraryPanelProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const addShapeFromPreset = useProjectStore((state) => state.addShapeFromPreset);

    if (!isOpen) return null;

    const categories = ["all", ...getShapeCategories()];

    const filteredShapes = searchQuery
        ? searchShapes(searchQuery)
        : selectedCategory === "all"
            ? SHAPE_PRESETS
            : getShapesByCategory(selectedCategory);

    const handleShapeClick = (preset: ShapePreset) => {
        // Add shape to center of canvas
        addShapeFromPreset(preset.id, { x: 0, y: 0 });
        // Don't close the panel so users can add multiple shapes
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-lg shadow-2xl w-[800px] h-[600px] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-electric-cyan/10 rounded-lg">
                            <Shapes className="h-5 w-5 text-electric-cyan" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Shape Library</h2>
                            <p className="text-xs text-zinc-500">Click a shape to add it to the canvas</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-white/10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search shapes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-electric-cyan"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="px-4 py-3 border-b border-white/10 flex gap-2 overflow-x-auto">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => {
                                setSelectedCategory(category);
                                setSearchQuery("");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                                selectedCategory === category
                                    ? "bg-electric-cyan text-black"
                                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Shape Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredShapes.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                            <div className="text-center">
                                <Shapes className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>No shapes found</p>
                                <p className="text-xs mt-1">Try a different search or category</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-4">
                            {filteredShapes.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => handleShapeClick(preset)}
                                    className="group relative aspect-square bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-electric-cyan hover:bg-electric-cyan/5 transition-all overflow-hidden"
                                    title={preset.description}
                                >
                                    {/* Shape Preview using SVG */}
                                    <svg
                                        viewBox="-0.6 -0.6 1.2 1.2"
                                        className="w-full h-full"
                                        style={{ filter: "drop-shadow(0 0 2px rgba(0, 240, 255, 0.3))" }}
                                    >
                                        <polygon
                                            points={preset.corners.map(c => `${c.x},${c.y}`).join(" ")}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="0.03"
                                            className="text-zinc-400 group-hover:text-electric-cyan transition-colors"
                                        />
                                        <polygon
                                            points={preset.corners.map(c => `${c.x},${c.y}`).join(" ")}
                                            fill="currentColor"
                                            className="text-electric-cyan/10 group-hover:text-electric-cyan/20 transition-colors"
                                        />
                                    </svg>

                                    {/* Shape Name */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                        <p className="text-[10px] font-bold text-white truncate">{preset.name}</p>
                                    </div>

                                    {/* Hover Effect */}
                                    <div className="absolute inset-0 bg-electric-cyan/0 group-hover:bg-electric-cyan/10 transition-colors pointer-events-none" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between bg-zinc-950">
                    <div className="text-xs text-zinc-500">
                        {filteredShapes.length} shape{filteredShapes.length !== 1 ? "s" : ""} available
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
