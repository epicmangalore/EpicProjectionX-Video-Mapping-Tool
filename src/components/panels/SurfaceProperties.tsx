"use client";

import { useProjectStore } from "@/store/project-store";
import { EffectsPanel } from "./EffectsPanel";
import { Trash2, Copy, Eye } from "lucide-react";

export function SurfaceProperties() {
    const surfaces = useProjectStore((state) => state.surfaces);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const deleteSurface = useProjectStore((state) => state.deleteSurface);
    const duplicateSurface = useProjectStore((state) => state.duplicateSurface);

    const selectedSurface = surfaces.find((s) => selectedIds.includes(s.id));

    if (!selectedSurface) {
        return (
            <aside className="w-80 glass border-l border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-electric-cyan">Properties</h2>
                </div>
                <div className="flex-1 p-4 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-electric-cyan/20 flex items-center justify-center">
                            <Eye className="w-6 h-6 text-electric-cyan" />
                        </div>
                        <p className="text-sm text-muted-foreground">No surface selected</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Click a surface to edit properties
                        </p>
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-80 glass border-l border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-electric-cyan">Properties</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Surface Name */}
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                    <input
                        type="text"
                        value={selectedSurface.name}
                        onChange={(e) =>
                            updateSurface(selectedSurface.id, { name: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-dark-800 border border-white/10 rounded-md text-sm focus:outline-none focus:border-electric-cyan"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => duplicateSurface(selectedSurface.id)}
                        className="flex-1 px-3 py-2 text-xs glass glass-hover rounded-md flex items-center justify-center gap-2"
                    >
                        <Copy className="w-3 h-3" />
                        Duplicate
                    </button>
                    <button
                        onClick={() => deleteSurface(selectedSurface.id)}
                        className="flex-1 px-3 py-2 text-xs glass glass-hover rounded-md flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/20"
                    >
                        <Trash2 className="w-3 h-3" />
                        Delete
                    </button>
                </div>

                {/* Transform */}
                <div>
                    <h3 className="text-sm font-semibold mb-3">Transform</h3>

                    <div className="space-y-3">
                        {/* Position */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Position</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-muted-foreground">X</label>
                                    <input
                                        type="number"
                                        value={selectedSurface.position.x.toFixed(2)}
                                        onChange={(e) =>
                                            updateSurface(selectedSurface.id, {
                                                position: {
                                                    ...selectedSurface.position,
                                                    x: parseFloat(e.target.value) || 0,
                                                },
                                            })
                                        }
                                        step="0.1"
                                        className="w-full px-2 py-1 bg-dark-800 border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-electric-cyan"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Y</label>
                                    <input
                                        type="number"
                                        value={selectedSurface.position.y.toFixed(2)}
                                        onChange={(e) =>
                                            updateSurface(selectedSurface.id, {
                                                position: {
                                                    ...selectedSurface.position,
                                                    y: parseFloat(e.target.value) || 0,
                                                },
                                            })
                                        }
                                        step="0.1"
                                        className="w-full px-2 py-1 bg-dark-800 border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-electric-cyan"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scale */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Scale</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-muted-foreground">W</label>
                                    <input
                                        type="number"
                                        value={selectedSurface.scale.x.toFixed(2)}
                                        onChange={(e) =>
                                            updateSurface(selectedSurface.id, {
                                                scale: {
                                                    ...selectedSurface.scale,
                                                    x: parseFloat(e.target.value) || 1,
                                                },
                                            })
                                        }
                                        step="0.1"
                                        min="0.1"
                                        className="w-full px-2 py-1 bg-dark-800 border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-electric-cyan"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">H</label>
                                    <input
                                        type="number"
                                        value={selectedSurface.scale.y.toFixed(2)}
                                        onChange={(e) =>
                                            updateSurface(selectedSurface.id, {
                                                scale: {
                                                    ...selectedSurface.scale,
                                                    y: parseFloat(e.target.value) || 1,
                                                },
                                            })
                                        }
                                        step="0.1"
                                        min="0.1"
                                        className="w-full px-2 py-1 bg-dark-800 border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-electric-cyan"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rotation */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                Rotation: {Math.round((selectedSurface.rotation * 180) / Math.PI)}°
                            </label>
                            <input
                                type="range"
                                value={selectedSurface.rotation}
                                onChange={(e) =>
                                    updateSurface(selectedSurface.id, {
                                        rotation: parseFloat(e.target.value),
                                    })
                                }
                                min={-Math.PI}
                                max={Math.PI}
                                step="0.01"
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Appearance */}
                <div>
                    <h3 className="text-sm font-semibold mb-3">Appearance</h3>

                    <div className="space-y-3">
                        {/* Opacity */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                Opacity: {Math.round(selectedSurface.opacity * 100)}%
                            </label>
                            <input
                                type="range"
                                value={selectedSurface.opacity}
                                onChange={(e) =>
                                    updateSurface(selectedSurface.id, {
                                        opacity: parseFloat(e.target.value),
                                    })
                                }
                                min="0"
                                max="1"
                                step="0.01"
                                className="w-full"
                            />
                        </div>

                        {/* Blend Mode */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Blend Mode</label>
                            <select
                                value={selectedSurface.blendMode}
                                onChange={(e) =>
                                    updateSurface(selectedSurface.id, {
                                        blendMode: e.target.value as any,
                                    })
                                }
                                className="w-full px-3 py-2 bg-dark-800 border border-white/10 rounded-md text-sm focus:outline-none focus:border-electric-cyan"
                            >
                                <option value="normal">Normal</option>
                                <option value="multiply">Multiply</option>
                                <option value="screen">Screen</option>
                                <option value="overlay">Overlay</option>
                                <option value="additive">Additive</option>
                            </select>
                        </div>

                        {/* Z-Index */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Layer Order</label>
                            <input
                                type="number"
                                value={selectedSurface.zIndex}
                                onChange={(e) =>
                                    updateSurface(selectedSurface.id, {
                                        zIndex: parseInt(e.target.value) || 0,
                                    })
                                }
                                className="w-full px-3 py-2 bg-dark-800 border border-white/10 rounded-md text-sm font-mono focus:outline-none focus:border-electric-cyan"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Effects Panel */}
            <EffectsPanel />
        </aside>
    );
}
