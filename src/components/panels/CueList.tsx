"use client";

import { useProjectStore } from "@/store/project-store";
import { useTimelineStore } from "@/store/timeline-store";
import { Plus, Play, Pause, Trash2, Edit2, Repeat } from "lucide-react";
import { useState } from "react";

export function SceneList() {
    const scenes = useProjectStore((state) => state.scenes);
    const activeSceneId = useProjectStore((state) => state.activeSceneId);
    const addScene = useProjectStore((state) => state.addScene);
    const updateScene = useProjectStore((state) => state.updateScene);
    const deleteScene = useProjectStore((state) => state.deleteScene);
    const triggerScene = useProjectStore((state) => state.triggerScene);

    // Timeline playback controls
    const isPlaying = useTimelineStore((state) => state.isPlaying);
    const loop = useTimelineStore((state) => state.loop);
    const play = useTimelineStore((state) => state.play);
    const pause = useTimelineStore((state) => state.pause);
    const setLoop = useTimelineStore((state) => state.setLoop);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const handleAddScene = () => {
        const nextHotkey = scenes.length < 9 ? scenes.length + 1 : undefined;
        const sceneName = `Scene ${scenes.length + 1}`;
        addScene(sceneName);

        // Assign hotkey to the newly added scene (project store addScene accepts only name)
        if (nextHotkey) {
            const newestScene = useProjectStore.getState().scenes.at(-1);
            if (newestScene) {
                updateScene(newestScene.id, { hotkey: String(nextHotkey) });
            }
        }
    };

    const handleEditStart = (scene: any) => {
        setEditingId(scene.id);
        setEditName(scene.name);
    };

    const handleEditSave = () => {
        if (editingId) {
            updateScene(editingId, { name: editName });
            setEditingId(null);
        }
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditName("");
    };

    return (
        <div className="w-full h-full flex flex-col bg-zinc-950">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 bg-zinc-900/50">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-electric-cyan">Scenes</h2>
                    <button
                        onClick={handleAddScene}
                        className="p-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded transition-colors"
                        title="Add new scene"
                    >
                        <Plus className="w-3.5 h-3.5 text-zinc-300" />
                    </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                    Press 1-9 to trigger scenes
                </p>
            </div>

            {/* Scene List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                {scenes.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-electric-cyan/10 flex items-center justify-center">
                            <Play className="w-5 h-5 text-electric-cyan/60" />
                        </div>
                        <p className="text-xs text-zinc-500">No scenes yet</p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                            Click + to create a scene
                        </p>
                    </div>
                ) : (
                    scenes.map((scene) => (
                        <div
                            key={scene.id}
                            onClick={() => triggerScene(scene.id)}
                            className={`rounded-md transition-colors cursor-pointer ${activeSceneId === scene.id
                                ? "bg-electric-cyan/10 border border-electric-cyan/30"
                                : "bg-zinc-900/50 border border-white/5 hover:border-white/10"
                                }`}
                        >
                            {/* Scene Header */}
                            <div className="flex items-center gap-2 px-3 py-2">
                                {scene.hotkey && (
                                    <div className="w-5 h-5 rounded bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                                        {scene.hotkey}
                                    </div>
                                )}

                                {editingId === scene.id ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleEditSave}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleEditSave();
                                            if (e.key === "Escape") handleEditCancel();
                                        }}
                                        className="flex-1 px-2 py-0.5 bg-zinc-800 border border-electric-cyan rounded text-xs text-zinc-200 focus:outline-none"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="flex-1 text-xs font-medium truncate text-zinc-300">
                                        {scene.name}
                                    </span>
                                )}

                                <button
                                    onClick={() => handleEditStart(scene)}
                                    className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                                    title="Edit name"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => deleteScene(scene.id)}
                                    className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                                    title="Delete scene"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Scene Playback Controls */}
                            <div className="flex items-center gap-1.5 px-3 pb-2">
                                <button
                                    onClick={() => {
                                        if (activeSceneId === scene.id && isPlaying) {
                                            pause();
                                        } else {
                                            triggerScene(scene.id);
                                            play();
                                        }
                                    }}
                                    className={`flex items-center justify-center w-7 h-7 rounded transition-all active:scale-90 ${activeSceneId === scene.id && isPlaying
                                        ? "bg-electric-cyan text-zinc-950"
                                        : "bg-zinc-800 text-zinc-400 hover:text-white border border-white/5"
                                        }`}
                                    title={activeSceneId === scene.id && isPlaying ? "Pause" : "Play"}
                                >
                                    {activeSceneId === scene.id && isPlaying ? (
                                        <Pause className="w-3.5 h-3.5 fill-current" />
                                    ) : (
                                        <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setLoop(!loop)}
                                    className={`flex items-center justify-center w-7 h-7 rounded transition-all active:scale-90 ${loop
                                        ? "text-electric-purple bg-electric-purple/10 border border-electric-purple/30"
                                        : "text-zinc-600 hover:text-zinc-400 bg-zinc-800 border border-white/5"
                                        }`}
                                    title={loop ? "Loop on" : "Loop off"}
                                >
                                    <Repeat className="w-3.5 h-3.5" />
                                </button>
                                <div className="flex-1" />
                                <span className="text-[9px] text-zinc-600">
                                    Fade: {scene.transitionDuration}s
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
