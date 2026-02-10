"use client";

import { useEffect, useRef, useState } from "react";
import { useTimelineStore } from "@/store/timeline-store";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";
import {
    Plus,
    Trash2,
} from "lucide-react";

import { TimelineTrackSidebar, TimelineTrackContent } from "./timeline/TimelineTrack";

export function TimelinePanel() {
    const currentTime = useTimelineStore((state) => state.currentTime);
    const duration = useTimelineStore((state) => state.duration);
    const isPlaying = useTimelineStore((state) => state.isPlaying);
    const keyframes = useTimelineStore((state) => state.keyframes);
    const snapToGrid = useTimelineStore((state) => state.snapToGrid);

    const surfaces = useProjectStore((state) => state.surfaces);
    const updateSurface = useProjectStore((state) => state.updateSurface);

    const play = useTimelineStore((state) => state.play);
    const pause = useTimelineStore((state) => state.pause);
    const seek = useTimelineStore((state) => state.seek);
    const setSnapToGrid = useTimelineStore((state) => state.setSnapToGrid);
    const setDuration = useTimelineStore((state) => state.setDuration);
    const initTimeline = useTimelineStore((state) => state.initTimeline);
    const updateTimeline = useTimelineStore((state) => state.updateTimeline);

    const timelineRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [containerWidth, setContainerWidth] = useState(1000); // Default fallback

    // Initialize timeline on mount
    useEffect(() => {
        initTimeline(updateSurface);
    }, []);

    // Track container width for dynamic ruler
    useEffect(() => {
        if (!timelineRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        observer.observe(timelineRef.current);
        return () => observer.disconnect();
    }, []);

    // Update GSAP timeline when keyframes or duration changes
    useEffect(() => {
        updateTimeline(updateSurface);
    }, [keyframes, duration, updateTimeline, updateSurface]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                // Ignore if user is typing in an input or textarea
                const activeTag = document.activeElement?.tagName.toLowerCase();
                if (activeTag === "input" || activeTag === "textarea") return;

                // Ignore if interacting with canvas (Spacebar = Pan)
                if (useUIStore.getState().isCanvasHovered) return;

                e.preventDefault();
                if (useTimelineStore.getState().isPlaying) {
                    pause();
                } else {
                    play();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pause, play]);

    // Format time as HH:MM:SS.mmm
    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        const hStr = hrs > 0 ? `${hrs.toString().padStart(2, "0")}:` : "";

        // Simplified format for ruler labels to avoid clutter
        if (ms === 0) {
            return `${hStr}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${hStr}${mins.toString().padStart(2, "0")}:${secs
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

    // Dynamic ruler markers based on visual density
    const getRulerSteps = () => {
        if (!containerWidth || duration <= 0) return 1;

        const pixelsPerSecond = containerWidth / duration;
        const minLabelWidth = 60; // Approx px needed for a timestamp label (HH:MM:SS)

        // Find the smallest step that gives enough space
        // Possible steps: 0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 300, 900, 3600...
        const steps = [
            0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600
        ];

        for (const s of steps) {
            const labelWidth = s * pixelsPerSecond;
            if (labelWidth >= minLabelWidth) return s;
        }

        return 3600; // Fallback for extremely cramped views
    };
    const step = getRulerSteps();

    return (
        <div className="h-64 bg-zinc-950 border-t border-white/5 flex flex-col font-sans select-none overflow-hidden text-zinc-300">
            {/* Deck Header */}
            <div className="h-10 px-4 border-b border-white/5 flex items-center justify-between bg-zinc-900 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-700 px-1 rounded bg-zinc-800">TIMELINE</span>
                        <span className="text-sm font-mono text-electric-cyan tabular-nums w-24">{formatTime(currentTime)}</span>
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
                        <input
                            type="number"
                            value={Number((duration / 60).toFixed(2))} // Display as minutes
                            step="0.1"
                            onChange={(e) => {
                                const mins = parseFloat(e.target.value) || 0.5;
                                setDuration(Math.min(43200, Math.max(1, mins * 60)));
                            }}
                            className="w-16 h-6 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-200 px-1 focus:outline-none focus:border-electric-cyan"
                            title="Max 12 hours (720m)"
                        />
                        <span className="text-[10px] text-zinc-600 font-mono">m</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-[9px] text-zinc-600 font-bold uppercase">MASTER BPM 120.00</div>
                        <div className="flex gap-1.5">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-1.4 h-1.5 rounded-full ${i === Math.floor(currentTime * 2) % 4 ? 'bg-electric-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]' : 'bg-zinc-800'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Timeline Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Fixed Sidebar (Track Labels) */}
                <div className="w-32 border-r border-white/5 flex flex-col bg-zinc-950 shrink-0">
                    <div className="h-10 border-b border-white/5 flex items-center px-3 bg-zinc-900/50">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Tracks</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        {surfaces.map(surface => (
                            <TimelineTrackSidebar
                                key={surface.id}
                                surfaceId={surface.id}
                                surfaceName={surface.name}
                                keyframes={keyframes}
                            />
                        ))}
                    </div>
                </div>

                {/* Scrollable Content (Keyframes) */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <div
                        className="h-10 border-b border-white/5 relative bg-zinc-900/30 cursor-crosshair group/ruler shrink-0 overflow-hidden"
                        onMouseDown={handleScrubberMouseDown}
                        ref={timelineRef}
                    >
                        {Array.from({ length: Math.floor(duration / step) + 1 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-white/5"
                                style={{ left: `${((i * step) / duration) * 100}%` }}
                            >
                                <span className="absolute top-1 left-1 text-[8px] font-mono text-zinc-600 whitespace-nowrap">
                                    {formatTime(i * step).split('.')[0]}
                                </span>
                            </div>
                        ))}

                        {/* Playhead Handle (Draggable via Ruler) */}
                        <div
                            className="absolute top-0 bottom-0 z-10 pointer-events-none"
                            style={{ left: `${(currentTime / duration) * 100}%` }}
                        >
                            {/* Handle Shape */}
                            <div className="absolute bottom-0 -translate-x-1/2 translate-y-1/2">
                                <svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.5 12L0 6V0H11V6L5.5 12Z" fill="#06b6d4" />
                                </svg>
                            </div>
                            {/* Vertical Line in Ruler */}
                            <div className="absolute top-0 bottom-0 w-px bg-electric-cyan/50 -translate-x-[0.5px]" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-zinc-950/20" ref={scrollRef}>
                        {/* Playhead Line (Content Area) */}
                        <div
                            className="absolute top-0 bottom-0 w-px bg-electric-cyan/40 z-30 pointer-events-none shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                            style={{ left: `${(currentTime / duration) * 100}%` }}
                        />

                        {surfaces.map(surface => (
                            <TimelineTrackContent
                                key={`content-${surface.id}`}
                                surfaceId={surface.id}
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
