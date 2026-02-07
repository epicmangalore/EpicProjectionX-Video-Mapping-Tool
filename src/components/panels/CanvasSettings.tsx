"use client";

import { useProjectStore } from "@/store/project-store";
import { Sun, Pause, Play, Image as ImageIcon, Check } from "lucide-react";

export function CanvasSettings() {
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
        <div className="w-64 bg-zinc-950 border border-white/10 rounded-lg shadow-2xl p-4 font-sans text-zinc-200">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Canvas Settings</h3>

            {/* Canvas Size */}
            <div className="mb-4">
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block">Canvas Size</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-2 top-1.5 text-xs text-zinc-500 font-mono">W</span>
                        <input
                            type="number"
                            value={projectSettings.resolution.width}
                            onChange={(e) => updateProjectSettings({
                                resolution: { ...projectSettings.resolution, width: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full bg-zinc-900 border border-white/10 rounded px-2 pl-6 py-1.5 text-xs font-mono focus:outline-none focus:border-electric-cyan"
                        />
                    </div>
                    <div className="relative flex-1">
                        <span className="absolute left-2 top-1.5 text-xs text-zinc-500 font-mono">H</span>
                        <input
                            type="number"
                            value={projectSettings.resolution.height}
                            onChange={(e) => updateProjectSettings({
                                resolution: { ...projectSettings.resolution, height: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full bg-zinc-900 border border-white/10 rounded px-2 pl-6 py-1.5 text-xs font-mono focus:outline-none focus:border-electric-cyan"
                        />
                    </div>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {presetResolutions.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => updateProjectSettings({ resolution: { width: preset.width, height: preset.height } })}
                            className={`px-2 py-1.5 text-[10px] rounded border transition-colors ${projectSettings.resolution.width === preset.width && projectSettings.resolution.height === preset.height
                                    ? "bg-electric-cyan/20 border-electric-cyan text-electric-cyan"
                                    : "bg-zinc-900 border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Master Brightness */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase">
                        <Sun className="w-3 h-3" />
                        <span>Brightness</span>
                    </div>
                    <span className="text-[10px] font-mono text-electric-cyan">{Math.round(projectSettings.masterBrightness * 100)}%</span>
                </div>
                <div className="h-6 bg-zinc-900 border border-white/5 rounded relative overflow-hidden group cursor-pointer">
                    <div
                        className="absolute inset-y-0 left-0 bg-electric-cyan/20"
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

            {/* Pause Shaders */}
            <button
                onClick={() => updateProjectSettings({ paused: !projectSettings.paused })}
                className={`w-full py-2 rounded mb-4 flex items-center justify-center gap-2 text-xs font-semibold transition-all border ${projectSettings.paused
                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-500"
                        : "bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300"
                    }`}
            >
                {projectSettings.paused ? (
                    <>
                        <Play className="w-3 h-3" />
                        Resume Shaders
                    </>
                ) : (
                    <>
                        <Pause className="w-3 h-3" />
                        Pause Shaders
                    </>
                )}
            </button>

            {/* Background Color */}
            <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block">Background</label>
                <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 group hover:border-white/20 transition-colors">
                    <ImageIcon className="w-3 h-3 text-zinc-600" />
                    <input
                        type="text"
                        value={projectSettings.backgroundColor}
                        onChange={(e) => updateProjectSettings({ backgroundColor: e.target.value })}
                        className="bg-transparent border-none text-xs font-mono text-zinc-300 focus:outline-none flex-1 w-full"
                        placeholder="#000000"
                    />
                    <div
                        className="w-3 h-3 rounded-sm border border-white/10"
                        style={{ backgroundColor: projectSettings.backgroundColor }}
                    />
                </div>
            </div>
        </div>
    );
}
