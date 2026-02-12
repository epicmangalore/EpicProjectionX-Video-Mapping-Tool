"use client";

import { useState } from "react";
import { Layers, Plus, Type, Sparkles, Wand2, Shapes } from "lucide-react";
import { SurfaceOutliner } from "./SurfaceOutliner";
import { EffectsBrowser } from "./EffectsBrowser";
import { AutoDetectDialog } from "../dialogs/AutoDetectDialog";
import { ShapeLibraryPanel } from "./ShapeLibraryPanel";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";
import { generateId } from "@/lib/utils";

export function LeftSidebar() {
    const [activeTab, setActiveTab] = useState<"layers" | "fx">("layers");

    const [showAutoDetect, setShowAutoDetect] = useState(false);
    const [showShapeLibrary, setShowShapeLibrary] = useState(false);

    // Store hooks for creation actions
    const addSurface = useProjectStore((state) => state.addSurface);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);

    const toolMode = useUIStore((state) => state.toolMode);
    const setToolMode = useUIStore((state) => state.setToolMode);

    const handleCreateSurface = () => {
        if (toolMode === "surface") {
            setToolMode("select");
        } else {
            setToolMode("surface");
        }
    };

    const handleCreateText = () => {
        const mediaId = generateId();
        addMediaAsset({
            id: mediaId,
            name: "Text Layer",
            type: "text",
            text: "Hello World",
            color: "#ffffff",
        });
        addSurface(mediaId);
    };



    return (
        <div className="w-80 h-full bg-zinc-900 border-r border-white/5 flex flex-col font-sans relative">

            {/* Tabs Header - Simplified */}
            <div className="flex border-b border-white/5 bg-zinc-900/50">
                <button
                    onClick={() => setActiveTab("layers")}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-all relative ${activeTab === "layers"
                        ? "text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                        }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Layers
                    {activeTab === "layers" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric-cyan" />}
                </button>

                <button
                    onClick={() => setActiveTab("fx")}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-all relative ${activeTab === "fx"
                        ? "text-white"
                        : "text-zinc-500 hover:text-zinc-200 hover:text-zinc-300"
                        }`}
                >
                    <Wand2 className="w-3.5 h-3.5" />
                    FX
                    {activeTab === "fx" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric-purple" />}
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden relative" data-tour="layers-panel">
                {activeTab === "layers" && (
                    <div className="absolute inset-0 flex flex-col">
                        {/* Creation Toolbar */}
                        <div className="p-3 space-y-2 border-b border-white/5 bg-zinc-900/50">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleCreateSurface}
                                    className={`flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors border ${toolMode === "surface"
                                        ? "bg-electric-cyan/20 border-electric-cyan text-electric-cyan"
                                        : "bg-zinc-800 border-white/5 hover:bg-zinc-700 text-zinc-100"
                                        }`}
                                    data-tour="add-surface"
                                >
                                    <Plus className="w-3 h-3" />
                                    Surface
                                </button>
                                <button
                                    onClick={handleCreateText}
                                    className="flex items-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs transition-colors border border-white/5"
                                >
                                    <Type className="w-3 h-3" />
                                    Text
                                </button>
                            </div>
                            <button
                                onClick={() => setShowShapeLibrary(true)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs transition-colors border border-white/5"
                                data-tour="shape-library"
                            >
                                <Shapes className="w-3 h-3" />
                                Shapes
                            </button>
                            <button
                                onClick={() => setShowAutoDetect(true)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-gradient-to-r from-electric-cyan/20 to-electric-purple/20 hover:from-electric-cyan/30 hover:to-electric-purple/30 text-white text-xs transition-colors border border-electric-cyan/30"
                            >
                                <Sparkles className="w-3 h-3" />
                                Auto Detect Surfaces
                            </button>
                        </div>

                        {/* Outliner Component */}
                        <div className="flex-1 overflow-hidden">
                            <SurfaceOutliner />
                        </div>
                    </div>
                )}




                {activeTab === "fx" && (
                    <div className="absolute inset-0 flex flex-col">
                        <EffectsBrowser />
                    </div>
                )}
            </div>

            {/* Auto Detect Dialog */}
            <AutoDetectDialog
                isOpen={showAutoDetect}
                onClose={() => setShowAutoDetect(false)}
            />

            {/* Shape Library Panel */}
            <ShapeLibraryPanel
                isOpen={showShapeLibrary}
                onClose={() => setShowShapeLibrary(false)}
            />
        </div>
    );
}
