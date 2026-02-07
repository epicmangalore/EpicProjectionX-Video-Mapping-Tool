"use client";

import { useProjectStore } from "@/store/project-store";
import { Sun, Moon, ZapOff, Settings2, Sliders, RotateCcw, RotateCw } from "lucide-react";

export function MasterControls() {
    const projectSettings = useProjectStore((state) => state.projectSettings);
    const updateProjectSettings = useProjectStore((state) => state.updateProjectSettings);
    const undo = useProjectStore((state) => state.undo);
    const redo = useProjectStore((state) => state.redo);
    const history = useProjectStore((state) => state.history);
    const future = useProjectStore((state) => state.future);

    const handleBlackout = () => {
        updateProjectSettings({ blackout: !projectSettings.blackout });
    };

    return (
        <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-electric-cyan" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">Master Controls</h3>
                </div>

                {/* Undo/Redo */}
                <div className="flex gap-1">
                    <button
                        onClick={undo}
                        disabled={history.length === 0}
                        className={`p-1.5 rounded-md transition-colors ${history.length > 0 ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-white/20 cursor-not-allowed'}`}
                        title="Undo (Ctrl+Z)"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={redo}
                        disabled={future.length === 0}
                        className={`p-1.5 rounded-md transition-colors ${future.length > 0 ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-white/20 cursor-not-allowed'}`}
                        title="Redo (Ctrl+Y)"
                    >
                        <RotateCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {/* Master Opacity */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-white/50">
                        <div className="flex items-center gap-1.5">
                            <Sliders className="w-3 h-3" />
                            <span>MASTER OPACITY</span>
                        </div>
                        <span className="font-mono text-electric-cyan">{Math.round(projectSettings.masterOpacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={projectSettings.masterOpacity}
                        onChange={(e) => updateProjectSettings({ masterOpacity: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-electric-cyan"
                    />
                </div>

                {/* Master Brightness */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-white/50">
                        <div className="flex items-center gap-1.5">
                            <Sun className="w-3 h-3" />
                            <span>MASTER BRIGHTNESS</span>
                        </div>
                        <span className="font-mono text-electric-cyan">{Math.round(projectSettings.masterBrightness * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.01"
                        value={projectSettings.masterBrightness}
                        onChange={(e) => updateProjectSettings({ masterBrightness: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-electric-cyan"
                    />
                </div>

                {/* Blackout Button */}
                <button
                    onClick={handleBlackout}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 font-bold text-xs ${projectSettings.blackout
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/40"
                        : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                >
                    <ZapOff className={`w-4 h-4 ${projectSettings.blackout ? "animate-pulse" : ""}`} />
                    {projectSettings.blackout ? "SYSTEM BLACKOUT ACTIVE" : "BLACKOUT SYSTEM"}
                </button>
            </div>
        </div>
    );
}
