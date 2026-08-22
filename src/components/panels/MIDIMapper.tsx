"use client";

import { useMIDIStore } from "@/store/midi-store";
import { useEffect, useState } from "react";
import { Activity, Trash2, Zap, Settings, X, Plus } from "lucide-react";

export function MIDIMapper() {
    const enabled = useMIDIStore((state) => state.enabled);
    const inputs = useMIDIStore((state) => state.inputs);
    const mappings = useMIDIStore((state) => state.mappings);
    const isLearning = useMIDIStore((state) => state.isLearning);
    const lastMessage = useMIDIStore((state) => state.lastMessage);
    const initMIDI = useMIDIStore((state) => state.initMIDI);
    const removeMapping = useMIDIStore((state) => state.removeMapping);
    const stopLearning = useMIDIStore((state) => state.stopLearning);

    const [showDevices, setShowDevices] = useState(false);

    useEffect(() => {
        initMIDI();
    }, [initMIDI]);

    if (!enabled) {
        return (
            <div className="p-4 glass rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">WebMIDI Not Available</p>
                <p className="text-xs text-muted-foreground">Please use a compatible browser (Chrome/Edge/Opera).</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full glass border-l border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-electric-cyan" />
                    <h2 className="text-sm font-bold uppercase tracking-wider">MIDI Mapping</h2>
                </div>
                <button
                    onClick={() => setShowDevices(!showDevices)}
                    className={`p-1.5 rounded transition-colors ${showDevices ? "bg-white/20" : "hover:bg-white/10"}`}
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            {/* Device Status */}
            {showDevices && (
                <div className="p-4 bg-black/40 border-b border-white/10 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 uppercase text-muted-foreground">
                        <Activity className="w-3 h-3" /> Connected Devices
                    </h3>
                    <div className="space-y-2">
                        {inputs.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No MIDI inputs found.</p>
                        ) : (
                            inputs.map((input) => (
                                <div key={input.id} className="flex items-center gap-2 text-xs">
                                    <div className={`w-2 h-2 rounded-full ${input.state === "connected" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"}`} />
                                    <span className="truncate">{input.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Mapping List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {mappings.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <Plus className="w-8 h-8 mb-2" />
                        <p className="text-sm">No MIDI mappings yet</p>
                        <p className="text-xs mt-1">Start learning from any property</p>
                    </div>
                ) : (
                    mappings.map((mapping) => (
                        <div key={mapping.id} className="p-3 glass-dark border border-white/5 rounded-lg group animate-in zoom-in-95">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase text-electric-cyan bg-electric-cyan/10 px-1.5 py-0.5 rounded">
                                    {mapping.type} Ch {mapping.channel}
                                </span>
                                <button
                                    onClick={() => removeMapping(mapping.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="text-xs font-mono text-white/80">#{mapping.number}</div>
                                <div className="text-[10px] uppercase tracking-tighter text-muted-foreground truncate">
                                    ➡️ {mapping.targetId.split(":").pop()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Learning Status Overlay */}
            {isLearning && (
                <div className="absolute inset-0 bg-electric-purple/20 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-50 animate-in fade-in">
                    <div className="w-12 h-12 bg-electric-purple rounded-full flex items-center justify-center mb-4 animate-pulse shadow-[0_0_20px_rgba(124,58,237,0.5)]">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold">MIDI Learning Mode</h3>
                    <p className="text-xs text-white/70 mt-2 mb-6">Move a knob or press a key on your controller</p>
                    <button
                        onClick={stopLearning}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center gap-2"
                    >
                        <X className="w-3 h-3" /> Cancel
                    </button>
                </div>
            )}

            {/* Last Message Monitor */}
            {lastMessage && (
                <div className="p-3 border-t border-white/10 bg-black/60">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                        <span>Last Input</span>
                        <span className="text-electric-cyan animate-pulse">Live</span>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs font-mono">
                        <div>CH: {lastMessage.channel}</div>
                        <div>NO: {lastMessage.number}</div>
                        <div>VAL: {lastMessage.value}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
