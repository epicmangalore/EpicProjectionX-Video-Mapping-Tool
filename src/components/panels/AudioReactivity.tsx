"use client";

import { useAudioStore } from "@/store/audio-store";
import { Mic, MicOff, Activity, BarChart2 } from "lucide-react";
import { useEffect } from "react";

export function AudioReactivity() {
    const isEnabled = useAudioStore((state) => state.isEnabled);
    const initAudio = useAudioStore((state) => state.initAudio);
    const stopAudio = useAudioStore((state) => state.stopAudio);
    const levels = useAudioStore((state) => state.levels);

    const toggleAudio = () => {
        if (isEnabled) stopAudio();
        else initAudio();
    };

    return (
        <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-electric-cyan" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">Audio Reactivity</h3>
                </div>
                <button
                    onClick={toggleAudio}
                    className={`p-1.5 rounded-md transition-all ${isEnabled
                            ? "bg-electric-cyan text-black shadow-lg shadow-electric-cyan/20"
                            : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10"
                        }`}
                    title={isEnabled ? "Disable Audio" : "Enable Audio"}
                >
                    {isEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </button>
            </div>

            <div className="space-y-4">
                {/* Visualizer Bars */}
                <div className="grid grid-cols-4 gap-2 h-16 items-end">
                    {[
                        { label: "BASS", value: levels.bass, color: "bg-electric-purple" },
                        { label: "MID", value: levels.mid, color: "bg-electric-cyan" },
                        { label: "TREB", value: levels.treble, color: "bg-indigo-400" },
                        { label: "VOL", value: levels.volume, color: "bg-white" },
                    ].map((band) => (
                        <div key={band.label} className="flex flex-col items-center gap-1.5 h-full justify-end">
                            <div className="w-full bg-white/5 rounded-t overflow-hidden relative flex-1">
                                <div
                                    className={`absolute bottom-0 left-0 w-full transition-all duration-75 ${band.color}`}
                                    style={{ height: `${Math.round(band.value * 100)}%` }}
                                />
                                {isEnabled && (
                                    <div
                                        className="absolute bottom-0 left-0 w-full bg-white/20 animate-pulse"
                                        style={{ height: `${Math.round(band.value * 110)}%`, opacity: 0.1 }}
                                    />
                                )}
                            </div>
                            <span className="text-[8px] font-bold text-white/40 tracking-tighter">{band.label}</span>
                        </div>
                    ))}
                </div>

                {!isEnabled && (
                    <p className="text-[10px] text-white/30 text-center italic">
                        Enable microphone to start sync
                    </p>
                )}
            </div>
        </div>
    );
}
