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

import { TimelineTrack } from "./timeline/TimelineTrack";

export function TimelinePanel() {
    const currentTime = useTimelineStore((state) => state.currentTime);
    const duration = useTimelineStore((state) => state.duration);
    const isPlaying = useTimelineStore((state) => state.isPlaying);
    const loop = useTimelineStore((state) => state.loop);
    const keyframes = useTimelineStore((state) => state.keyframes);
    const snapToGrid = useTimelineStore((state) => state.snapToGrid);

    const surfaces = useProjectStore((state) => state.surfaces);
    const updateSurface = useProjectStore((state) => state.updateSurface);

    const play = useTimelineStore((state) => state.play);
    const pause = useTimelineStore((state) => state.pause);
    const stop = useTimelineStore((state) => state.stop);
    const seek = useTimelineStore((state) => state.seek);
    const setLoop = useTimelineStore((state) => state.setLoop);
    const setSnapToGrid = useTimelineStore((state) => state.setSnapToGrid);
    const initTimeline = useTimelineStore((state) => state.initTimeline);
    const updateTimeline = useTimelineStore((state) => state.updateTimeline);

    const timelineRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Initialize timeline on mount
    useEffect(() => {
        initTimeline(updateSurface);
    }, []);

    // Update GSAP timeline when keyframes change
    useEffect(() => {
        updateTimeline(updateSurface);
    }, [keyframes, updateTimeline, updateSurface]);

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
        const scrollLeft = scrollRef.current?.scrollLeft || 0;
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

    return (
        <div className="h-64 bg-zinc-950 border-t border-white/5 flex flex-col font-sans select-none overflow-hidden">
            {/* Deck Header */}
            <div className="h-10 px-4 border-b border-white/5 flex items-center justify-between bg-zinc-900 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-700 px-1 rounded bg-zinc-800">DECK A</span>
                        <span className="text-sm font-mono text-electric-cyan tabular-nums w-20">{formatTime(currentTime)}</span>
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    <div className="flex gap-2">
                        <button
                            onClick={() => setSnapToGrid(!snapToGrid)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${snapToGrid ? 'bg-electric-cyan/20 text-electric-cyan border border-electric-cyan/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}
                        >
                            Snap
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Duration</div>
                        <span className="text-xs font-mono text-zinc-400">{duration}s</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-[9px] text-zinc-600 font-bold uppercase">MASTER BPM 120.00</div>
                        <div className="flex gap-1.5">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === Math.floor(currentTime * 2) % 4 ? 'bg-electric-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]' : 'bg-zinc-800'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Timeline Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Transport & Track Control Side (Fixed Width) */}
                <div className="w-48 border-r border-white/5 flex flex-col bg-zinc-950 shrink-0">
                    {/* Compact Transport */}
                    <div className="h-10 border-b border-white/5 flex items-center px-2 gap-1.5 bg-zinc-900/50">
                        <button
                            onClick={isPlaying ? pause : play}
                            className={`w-7 h-7 flex items-center justify-center rounded transition-all active:scale-90 ${isPlaying ? 'bg-electric-cyan text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                        </button>
                        <button
                            onClick={stop}
                            className="w-7 h-7 flex items-center justify-center bg-zinc-800 text-zinc-400 hover:text-white rounded transition-all active:scale-90"
                        >
                            <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                            onClick={() => setLoop(!loop)}
                            className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-bold transition-all ${loop ? 'text-electric-purple' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Track Labels Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        {surfaces.map(surface => (
                            <div key={surface.id} className="w-full">
                                {/* Track Header & Properties are handled here */}
                                <TimelineTrack
                                    surfaceId={surface.id}
                                    surfaceName={surface.name}
                                    keyframes={keyframes}
                                    duration={duration}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scrubber & Keyframe Area (Scrollable) */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Time Ruler / Scrubber */}
                    <div
                        className="h-10 border-b border-white/5 relative bg-zinc-900/30 cursor-crosshair group/ruler shrink-0"
                        onMouseDown={handleScrubberMouseDown}
                        ref={timelineRef}
                    >
                        {/* Time Markers */}
                        {Array.from({ length: duration + 1 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-white/5"
                                style={{ left: `${(i / duration) * 100}%` }}
                            >
                                <span className="absolute top-1 left-1 text-[8px] font-mono text-zinc-600 group-hover/ruler:text-zinc-400">{i}s</span>
                                {/* Sub-ticks */}
                                {i < duration && Array.from({ length: 9 }).map((_, j) => (
                                    <div
                                        key={j}
                                        className="absolute top-6 bottom-0 border-l border-white/5"
                                        style={{ left: `${((j + 1) / 10) * (1 / duration) * 100}%`, height: '20%' }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-zinc-950/20" ref={scrollRef}>
                        {/* Vertical Progress Bar */}
                        <div
                            className="absolute top-0 bottom-0 w-px bg-electric-cyan/40 z-30 pointer-events-none shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                            style={{ left: `${(currentTime / duration) * 100}%` }}
                        >
                            <div className="absolute top-0 -translate-x-1/2 -translate-y-[1px] w-2 h-2 rounded-full bg-electric-cyan" />
                        </div>

                        {/* Repeat the tracks logic for the right side visual area */}
                        {surfaces.map(surface => (
                            <TimelineTrack
                                key={`visual-${surface.id}`}
                                surfaceId={surface.id}
                                surfaceName={surface.name}
                                keyframes={keyframes}
                                duration={duration}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const RotateCcw = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
    </svg>
);
