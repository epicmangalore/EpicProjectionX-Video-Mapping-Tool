"use client";

import { useProjectStore } from "@/store/project-store";
import { Sun, Pause, Play, Image as ImageIcon, X, Monitor } from "lucide-react";

interface CanvasSettingsProps {
    onClose?: () => void;
}

export function CanvasSettings({ onClose }: CanvasSettingsProps) {
    const projectSettings = useProjectStore((state) => state.projectSettings);
    const updateProjectSettings = useProjectStore((state) => state.updateProjectSettings);

    const presetResolutions = [
        { label: "720p", width: 1280, height: 720 },
        { label: "1080p", width: 1920, height: 1080 },
        { label: "2K", width: 2560, height: 1440 },
        { label: "4K", width: 3840, height: 2160 },
        { label: "WUXGA", width: 1920, height: 1200 },
        { label: "WXGA", width: 1280, height: 800 },
    ];

    return (
        <div className="flex flex-col h-full glass border-l border-white/10 text-zinc-200">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-electric-cyan" />
                    <h2 className="text-sm font-bold uppercase tracking-wider">Canvas Settings</h2>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                {/* Canvas Size */}
                <div className="space-y-3">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Resolution</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-[10px] text-zinc-600 font-mono">W</span>
                            <input
                                type="number"
                                value={projectSettings.resolution.width}
                                onChange={(e) => updateProjectSettings({
                                    resolution: { ...projectSettings.resolution, width: parseInt(e.target.value) || 0 }
                                })}
                                className="w-full bg-zinc-950/50 border border-white/10 rounded-lg px-2 pl-8 py-2 text-xs font-mono focus:outline-none focus:border-electric-cyan transition-colors"
                            />
                        </div>
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-[10px] text-zinc-600 font-mono">H</span>
                            <input
                                type="number"
                                value={projectSettings.resolution.height}
                                onChange={(e) => updateProjectSettings({
                                    resolution: { ...projectSettings.resolution, height: parseInt(e.target.value) || 0 }
                                })}
                                className="w-full bg-zinc-950/50 border border-white/10 rounded-lg px-2 pl-8 py-2 text-xs font-mono focus:outline-none focus:border-electric-cyan transition-colors"
                            />
                        </div>
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {presetResolutions.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => updateProjectSettings({ resolution: { width: preset.width, height: preset.height } })}
                                className={`px-2 py-2 text-[10px] font-bold rounded-lg border transition-all ${projectSettings.resolution.width === preset.width && projectSettings.resolution.height === preset.height
                                    ? "bg-electric-cyan/10 border-electric-cyan/50 text-electric-cyan shadow-[0_0_15px_rgba(0,240,255,0.1)]"
                                    : "bg-white/5 border-white/5 hover:bg-white/10 text-zinc-500 hover:text-white"
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Master Brightness */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                            <Sun className="w-3.5 h-3.5" />
                            <span>Brightness</span>
                        </div>
                        <span className="text-electric-cyan font-mono">{Math.round(projectSettings.masterBrightness * 100)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden group">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric-cyan/30 to-electric-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                            style={{ width: `${(projectSettings.masterBrightness / 2) * 100}%` }}
                        />
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.01"
                            value={projectSettings.masterBrightness}
                            onChange={(e) => updateProjectSettings({ masterBrightness: parseFloat(e.target.value) })}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                </div>

                {/* Status Controls */}
                <div className="space-y-3">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">System State</label>
                    <button
                        onClick={() => updateProjectSettings({ paused: !projectSettings.paused })}
                        className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all border ${projectSettings.paused
                            ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                            : "bg-white/5 border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                            }`}
                    >
                        {projectSettings.paused ? (
                            <>
                                <Play className="w-3.5 h-3.5" />
                                Resume Rendering
                            </>
                        ) : (
                            <>
                                <Pause className="w-3.5 h-3.5" />
                                Pause Rendering
                            </>
                        )}
                    </button>
                </div>

                {/* Appearance */}
                <div className="space-y-3">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Background</label>
                    <div className="flex items-center gap-3 bg-zinc-950/50 border border-white/5 rounded-lg px-3 py-2.5 group hover:border-white/10 transition-colors">
                        <ImageIcon className="w-3.5 h-3.5 text-zinc-600" />
                        <input
                            type="text"
                            value={projectSettings.backgroundColor}
                            onChange={(e) => updateProjectSettings({ backgroundColor: e.target.value })}
                            className="bg-transparent border-none text-xs font-mono text-zinc-300 focus:outline-none flex-1 w-full uppercase"
                            placeholder="#000000"
                        />
                        <div
                            className="w-4 h-4 rounded shadow-inner border border-white/10"
                            style={{ backgroundColor: projectSettings.backgroundColor }}
                        />
                    </div>
                </div>

                {/* Display Flags */}
                <div className="pt-4 border-t border-white/10 space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">Developer View</label>

                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
                        <span className="text-xs text-zinc-400 group-hover:text-white">Show Canvas Frame</span>
                        <input
                            type="checkbox"
                            checked={projectSettings.showCanvasFrame}
                            onChange={(e) => updateProjectSettings({ showCanvasFrame: e.target.checked })}
                            className="w-4 h-4 accent-electric-cyan rounded cursor-pointer"
                        />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
                        <span className="text-xs text-zinc-400 group-hover:text-white">Show Safe Area</span>
                        <input
                            type="checkbox"
                            checked={projectSettings.showSafeArea}
                            onChange={(e) => updateProjectSettings({ showSafeArea: e.target.checked })}
                            className="w-4 h-4 accent-electric-cyan rounded cursor-pointer"
                            disabled={!projectSettings.showCanvasFrame}
                        />
                    </label>
                </div>

                {/* Global Composition Mix */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Global Composition Mix</label>
                        <button
                            onClick={() => updateProjectSettings({ showComposition: !projectSettings.showComposition })}
                            className={`w-8 h-4 rounded-full transition-all relative ${projectSettings.showComposition ? 'bg-electric-cyan/30' : 'bg-zinc-800'}`}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${projectSettings.showComposition ? 'right-0.5 bg-electric-cyan' : 'left-0.5 bg-zinc-500'}`} />
                        </button>
                    </div>

                    <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                        The "Master Mix" used for surfaces with "Mixed Composition" enabled.
                    </p>

                    <div className="bg-zinc-950/50 border border-white/10 rounded-lg p-3 space-y-3">
                        <label className="text-[9px] text-zinc-600 font-bold uppercase block">Source Media</label>
                        {/* Simplified media picker placeholder - in a real app this would open a dialog */}
                        <select
                            value={projectSettings.compositionMediaId || ""}
                            onChange={(e) => updateProjectSettings({ compositionMediaId: e.target.value || null })}
                            className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-electric-cyan"
                        >
                            <option value="">No Media Assigned</option>
                            {useProjectStore.getState().mediaAssets.map(asset => (
                                <option key={asset.id} value={asset.id}>{asset.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
