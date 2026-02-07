"use client";

import { useEffect, useRef, useState } from "react";
import { useTimelineStore } from "@/store/timeline-store";
import { useProjectStore } from "@/store/project-store";
import {
    Play,
    Pause,
    Square,
    SkipBack,
    SkipForward,
    Plus,
    Trash2,
} from "lucide-react";

export function TimelinePanel() {
    const currentTime = useTimelineStore((state) => state.currentTime);
    const duration = useTimelineStore((state) => state.duration);
    const isPlaying = useTimelineStore((state) => state.isPlaying);
    const loop = useTimelineStore((state) => state.loop);
    const keyframes = useTimelineStore((state) => state.keyframes);
    const selectedSurfaceIds = useProjectStore((state) => state.selectedSurfaceIds);

    const play = useTimelineStore((state) => state.play);
    const pause = useTimelineStore((state) => state.pause);
    const stop = useTimelineStore((state) => state.stop);
    const seek = useTimelineStore((state) => state.seek);
    const setLoop = useTimelineStore((state) => state.setLoop);
    const addKeyframe = useTimelineStore((state) => state.addKeyframe);
    const deleteKeyframe = useTimelineStore((state) => state.deleteKeyframe);

    const timelineRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Format time as MM:SS.mmm
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
    };

    // Handle scrubber drag
    const handleScrubberMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleScrubberMove(e);
    };

    const handleScrubberMove = (e: React.MouseEvent | MouseEvent) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const newTime = (x / rect.width) * duration;
        seek(newTime);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            handleScrubberMove(e);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);

    // Add keyframe for selected surface
    const handleAddKeyframe = () => {
        if (selectedSurfaceIds.length === 0) return;

        const surfaceId = selectedSurfaceIds[0];
        addKeyframe({
            time: currentTime,
            surfaceId,
            property: "position.x",
            value: 0,
            easing: "power2.inOut",
        });
    };

    return (
        <div className="h-48 bg-zinc-950 border-t border-white/5 flex flex-col font-sans">
            {/* Deck Header */}
            <div className="h-10 px-2 border-b border-white/5 flex items-center justify-between bg-zinc-900">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-700 px-1 rounded">DECK A</span>
                    <span className="text-xs font-mono text-electric-cyan">{formatTime(currentTime)}</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-[9px] text-zinc-600 font-bold uppercase">MASTER BPM 120.00</div>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-electric-cyan shadow-[0_0_5px_rgba(0,240,255,0.8)] animate-pulse"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
                    </div>
                </div>
            </div>

            {/* Transport Controls & Scrubber Container */}
            <div className="flex-1 flex">

                {/* Transport Side Panel */}
                <div className="w-24 border-r border-white/5 p-2 flex flex-col gap-2 bg-zinc-950">
                    <button
                        onClick={isPlaying ? pause : play}
                        className={`flex-1 flex flex-col items-center justify-center border border-white/10 rounded overflow-hidden transition-all active:scale-95 ${isPlaying
                                ? "bg-electric-cyan/20 border-electric-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                                : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
                            }`}
                    >
                        <Play className={`w-5 h-5 mb-1 ${isPlaying ? "text-electric-cyan fill-electric-cyan" : "text-zinc-400"}`} />
                        <span className={`text-[9px] font-bold uppercase ${isPlaying ? "text-electric-cyan" : "text-zinc-500"}`}>
                            {isPlaying ? "PLAYING" : "PLAY"}
                        </span>
                    </button>

                    <button
                        onClick={stop}
                        className="h-10 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 hover:border-electric-orange/50 hover:text-electric-orange text-zinc-400 rounded transition-all active:scale-95"
                    >
                        <Square className="w-3 h-3 mb-0.5" />
                        <span className="text-[8px] font-bold uppercase">CUE</span>
                    </button>

                    <button
                        onClick={() => setLoop(!loop)}
                        className={`h-8 flex items-center justify-center gap-1 border rounded transition-all ${loop
                                ? "bg-electric-purple/20 border-electric-purple text-electric-purple shadow-[0_0_10px_rgba(180,0,255,0.3)]"
                                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600"
                            }`}
                    >
                        <span className="text-[9px] font-bold uppercase">LOOP</span>
                    </button>
                </div>

                {/* Timeline Track */}
                <div className="flex-1 flex flex-col relative bg-zinc-900/50">
                    {/* Toolbar */}
                    <div className="h-8 border-b border-white/5 flex items-center px-2 gap-2">
                        <button
                            onClick={handleAddKeyframe}
                            disabled={selectedSurfaceIds.length === 0}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 border border-white/5 hover:bg-zinc-700 text-[9px] font-bold text-zinc-300 uppercase transition-colors disabled:opacity-30"
                        >
                            <Plus className="w-3 h-3" />
                            <span>Keyframe</span>
                        </button>

                        <div className="w-px h-4 bg-white/10 mx-1"></div>

                        <button onClick={() => seek(Math.max(0, currentTime - 1))} className="p-1 hover:text-white text-zinc-500"><SkipBack className="w-3 h-3" /></button>
                        <button onClick={() => seek(Math.min(duration, currentTime + 1))} className="p-1 hover:text-white text-zinc-500"><SkipForward className="w-3 h-3" /></button>
                    </div>

                    {/* Scrubber Area */}
                    <div
                        className="flex-1 relative cursor-pointer overflow-hidden group"
                        ref={timelineRef}
                        onMouseDown={handleScrubberMouseDown}
                    >
                        {/* Grid Background */}
                        <div
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                                backgroundSize: '40px 100%'
                            }}
                        ></div>

                        {/* Playhead Line - Always visible */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-electric-cyan z-20 pointer-events-none shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                            style={{ left: `${(currentTime / duration) * 100}%` }}
                        >
                            <div className="absolute top-0 -translate-x-1/2 -translate-y-1/2 text-[9px] font-mono text-electric-cyan bg-zinc-950 px-1 border border-electric-cyan/30 rounded">
                                ▼
                            </div>
                        </div>

                        {/* Keyframes */}
                        {keyframes.map((kf) => (
                            <div
                                key={kf.id}
                                className="absolute top-2 bottom-0 w-px bg-yellow-500/50 z-10 hover:bg-yellow-400 hover:w-0.5 transition-all group/kf"
                                style={{ left: `${(kf.time / duration) * 100}%` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    seek(kf.time);
                                }}
                            >
                                <div className="absolute top-0 -translate-x-1/2 w-2 h-2 rotate-45 bg-yellow-500 border border-black shadow-sm group-hover/kf:scale-125 transition-transform" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
