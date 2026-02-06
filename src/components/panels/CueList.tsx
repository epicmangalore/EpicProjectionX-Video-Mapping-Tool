"use client";

import { useCueStore } from "@/store/cue-store";
import { useProjectStore } from "@/store/project-store";
import { useEffectsStore } from "@/store/effects-store";
import { Plus, Play, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";

export function CueList() {
    const cues = useCueStore((state) => state.cues);
    const activeCueId = useCueStore((state) => state.activeCueId);
    const isTransitioning = useCueStore((state) => state.isTransitioning);
    const addCue = useCueStore((state) => state.addCue);
    const updateCue = useCueStore((state) => state.updateCue);
    const deleteCue = useCueStore((state) => state.deleteCue);
    const triggerCue = useCueStore((state) => state.triggerCue);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const handleAddCue = () => {
        const nextHotkey = cues.length < 9 ? cues.length + 1 : undefined;
        addCue(`Cue ${cues.length + 1}`, nextHotkey);
    };

    const handleEditStart = (cue: any) => {
        setEditingId(cue.id);
        setEditName(cue.name);
    };

    const handleEditSave = () => {
        if (editingId) {
            updateCue(editingId, { name: editName });
            setEditingId(null);
        }
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditName("");
    };

    return (
        <div className="w-64 glass border-l border-white/10 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-electric-cyan">Cues</h2>
                    <button
                        onClick={handleAddCue}
                        className="p-1.5 glass glass-hover rounded"
                        title="Add new cue"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Press 1-9 to trigger cues
                </p>
            </div>

            {/* Cue List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {cues.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-electric-cyan/20 flex items-center justify-center">
                            <Play className="w-6 h-6 text-electric-cyan" />
                        </div>
                        <p className="text-sm text-muted-foreground">No cues yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Click + to create a cue
                        </p>
                    </div>
                ) : (
                    cues.map((cue) => (
                        <div
                            key={cue.id}
                            className={`p-3 rounded-md transition-colors ${activeCueId === cue.id
                                    ? "bg-electric-purple/20 border border-electric-purple"
                                    : "glass glass-hover border border-white/10"
                                }`}
                        >
                            {/* Cue Header */}
                            <div className="flex items-center gap-2 mb-2">
                                {cue.hotkey && (
                                    <div className="w-6 h-6 rounded bg-electric-purple/30 flex items-center justify-center text-xs font-bold">
                                        {cue.hotkey}
                                    </div>
                                )}

                                {editingId === cue.id ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleEditSave}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleEditSave();
                                            if (e.key === "Escape") handleEditCancel();
                                        }}
                                        className="flex-1 px-2 py-1 bg-dark-800 border border-electric-cyan rounded text-xs"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="flex-1 text-sm font-medium truncate">
                                        {cue.name}
                                    </span>
                                )}
                            </div>

                            {/* Cue Actions */}
                            <div className="flex gap-1">
                                <button
                                    onClick={() => triggerCue(cue.id)}
                                    disabled={isTransitioning}
                                    className="flex-1 px-2 py-1 text-xs glass glass-hover rounded flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                    <Play className="w-3 h-3" />
                                    Go
                                </button>
                                <button
                                    onClick={() => handleEditStart(cue)}
                                    className="px-2 py-1 text-xs glass glass-hover rounded"
                                    title="Edit name"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => deleteCue(cue.id)}
                                    className="px-2 py-1 text-xs glass glass-hover rounded text-red-400 hover:bg-red-500/20"
                                    title="Delete cue"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Transition Duration */}
                            <div className="mt-2 text-xs text-muted-foreground">
                                Fade: {cue.transitionDuration}s
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
