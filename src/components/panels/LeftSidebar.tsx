"use client";

import { useState } from "react";
import { Layers, Image, Plus, Type, Video, Monitor } from "lucide-react";
import { SurfaceOutliner } from "./SurfaceOutliner";
import { MediaLibrary } from "./MediaLibrary";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";
import { generateId } from "@/lib/utils";

export function LeftSidebar() {
    const [activeTab, setActiveTab] = useState<"layers" | "assets">("layers");

    // Store hooks for creation actions
    const addSurface = useProjectStore((state) => state.addSurface);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);

    const handleCreateSurface = () => {
        const mediaId = generateId();
        addMediaAsset({
            id: mediaId,
            name: "Gray Fill",
            type: "color",
            color: "#808080", // Neutral gray default
        });
        addSurface(mediaId);
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

    const handleWebcam = () => {
        const mediaId = generateId();
        addMediaAsset({
            id: mediaId,
            name: "Webcam Input",
            type: "webcam",
        });
        addSurface(mediaId);
    };

    return (
        <div className="w-80 h-full bg-zinc-900 border-r border-white/5 flex flex-col font-sans">
            {/* Tabs Header */}
            <div className="flex border-b border-white/5">
                <button
                    onClick={() => setActiveTab("layers")}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === "layers"
                        ? "text-white bg-zinc-800 border-b-2 border-electric-cyan"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    LAYERS
                </button>
                <button
                    onClick={() => setActiveTab("assets")}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === "assets"
                        ? "text-white bg-zinc-800 border-b-2 border-electric-cyan"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                        }`}
                    data-tour="assets-tab"
                >
                    <Image className="w-4 h-4" />
                    ASSETS
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden relative" data-tour="layers-panel">
                {activeTab === "layers" && (
                    <div className="absolute inset-0 flex flex-col">
                        {/* Creation Toolbar */}
                        <div className="p-3 grid grid-cols-2 gap-2 border-b border-white/5 bg-zinc-900/50">
                            <button
                                onClick={handleCreateSurface}
                                className="flex items-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs transition-colors border border-white/5"
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
                            <button
                                onClick={handleWebcam}
                                className="flex items-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs transition-colors border border-white/5"
                            >
                                <Video className="w-3 h-3" />
                                Webcam
                            </button>
                            <button
                                className="flex items-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs transition-colors border border-white/5 opacity-50 cursor-not-allowed"
                                title="Coming Soon"
                            >
                                <Monitor className="w-3 h-3" />
                                Output
                            </button>
                        </div>

                        {/* Outliner Component */}
                        <div className="flex-1 overflow-hidden">
                            <SurfaceOutliner />
                        </div>
                    </div>
                )}

                {activeTab === "assets" && (
                    <div className="absolute inset-0 flex flex-col">
                        <div className="flex-1 overflow-hidden">
                            <MediaLibrary />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
