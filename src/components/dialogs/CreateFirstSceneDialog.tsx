"use client";

import { useProjectStore } from "@/store/project-store";
import { Plus } from "lucide-react";

export function CreateFirstSceneDialog() {
    const scenes = useProjectStore(state => state.scenes);
    const addScene = useProjectStore(state => state.addScene);

    // Only show if no scenes exist
    if (scenes.length > 0) return null;

    const handleCreateScene = () => {
        addScene("Scene 1");
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[10001] pointer-events-auto">
            <div className="bg-zinc-900 border border-white/10 rounded-lg p-8 max-w-md shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-electric-cyan/20 rounded-lg flex items-center justify-center">
                        <Plus className="w-6 h-6 text-electric-cyan" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                        Welcome to ProjectionX
                    </h2>
                </div>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    Get started by creating your first scene. Scenes contain surfaces and can be triggered with hotkeys for live performance.
                </p>
                <button
                    onClick={handleCreateScene}
                    className="w-full px-4 py-3 bg-electric-cyan text-black font-bold rounded hover:bg-electric-cyan/90 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create First Scene
                </button>
            </div>
        </div>
    );
}
