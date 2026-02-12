"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useTimelineStore } from "@/store/timeline-store";
import { useProjectStore } from "@/store/project-store";
import { usePlaybackStore } from "@/store/playback-store";
import { useUIStore } from "@/store/ui-store";
import { useActiveSurfaces } from "@/hooks/useActiveSurfaces";
import { useHasMounted } from "@/hooks/useHasMounted";
import { TimelineTrackContent } from "./timeline/TimelineTrack";

export const PIXELS_PER_SECOND = 40; // Increased fixed scale for better resolution

export function TimelinePanel() {
    const hasMounted = useHasMounted();
    const currentTime = useTimelineStore((state) => state.currentTime);
    const duration = useTimelineStore((state) => state.duration);
    const snapToGrid = useTimelineStore((state) => state.snapToGrid);
    const keyframes = useTimelineStore((state) => state.keyframes);

    const updateSurface = useProjectStore((state) => state.updateSurface);
    const surfaces = useActiveSurfaces();

    const play = useTimelineStore((state) => state.play);
    const pause = useTimelineStore((state) => state.pause);
    const seek = useTimelineStore((state) => state.seek);
    const setSnapToGrid = useTimelineStore((state) => state.setSnapToGrid);
    const setDuration = useTimelineStore((state) => state.setDuration);
    const initTimeline = useTimelineStore((state) => state.initTimeline);
    const updateTimeline = useTimelineStore((state) => state.updateTimeline);

    const timelineRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Initialize timeline on mount
    useEffect(() => {
        initTimeline(updateSurface);
    }, [initTimeline, updateSurface]);

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

    // Handle scrubber drag using fixed pixel unit
    const handleScrubberMove = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const newTime = x / PIXELS_PER_SECOND;
        seek(newTime);
    }, [seek]);

    const handleScrubberMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleScrubberMove(e);
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
    }, [isDragging, handleScrubberMove]);

    // Ruler steps for fixed pixel scale
    // We want a marker every 1, 5, or 10 seconds depending on PIXELS_PER_SECOND
    const step = 1; // 1 second markers
    const totalWidth = duration * PIXELS_PER_SECOND;

    return (
        <div className="h-64 bg-zinc-950 border-t border-white/5 flex flex-col font-sans select-none overflow-hidden text-zinc-300" data-tour="timeline-panel">
            {/* Deck Header */}
            <div className="h-10 px-4 border-b border-white/5 flex items-center justify-between bg-zinc-900 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-700 px-1 rounded bg-zinc-800">TIMELINE</span>
                        <span className="text-sm font-mono text-electric-cyan tabular-nums w-24">{formatTime(currentTime)}</span>
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Duration</span>
                        <div className="flex items-center">
                            <input
                                type="number"
                                value={Number((duration / 60).toFixed(2))} // Display as minutes
                                step="0.1"
                                onChange={(e) => {
                                    const mins = parseFloat(e.target.value) || 0.5;
                                    setDuration(Math.min(43200, Math.max(1, mins * 60)));
                                }}
                                className="w-14 h-5 bg-zinc-800 border border-zinc-700 rounded-l text-[10px] font-mono text-zinc-200 px-1 focus:outline-none focus:border-electric-cyan"
                                title="Max 12 hours (720m)"
                            />
                            <span className="h-5 flex items-center px-1.5 bg-zinc-800 border border-l-0 border-zinc-700 rounded-r text-[9px] text-zinc-500 font-mono">m</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all active:scale-95 ${snapToGrid ? 'bg-electric-cyan/20 text-electric-cyan border border-electric-cyan/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}
                    >
                        Snap
                    </button>

                    <button
                        onClick={() => usePlaybackStore.getState().syncAllVideos()}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all active:scale-95 bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-electric-cyan/30 hover:text-electric-cyan hover:bg-electric-cyan/10"
                        title="Sync all videos to current timeline position"
                        data-tour="video-sync"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Sync Videos
                    </button>

                    <div className="flex items-center gap-3 bg-black/20 px-3 py-1 rounded border border-white/5">
                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">BPM 120</div>
                        <div className="flex gap-1">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${i === Math.floor(currentTime * 2) % 4 ? 'bg-electric-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]' : 'bg-zinc-800'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Timeline Scroll Area */}
            {hasMounted && (
                <div className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden timeline-scrollbar" ref={scrollContainerRef}>
                    <div style={{ width: totalWidth, position: 'relative', minHeight: '100%' }} className="flex flex-col">
                        {/* Ruler Area */}
                        <div
                            className="h-10 border-b border-white/5 relative bg-zinc-900/30 cursor-crosshair group/ruler shrink-0"
                            onMouseDown={handleScrubberMouseDown}
                            ref={timelineRef}
                        >
                            {Array.from({ length: Math.floor(duration / step) + 1 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-l border-white/5"
                                    style={{ left: i * step * PIXELS_PER_SECOND }}
                                >
                                    <span className="absolute top-1 left-1 text-[8px] font-mono text-zinc-600 whitespace-nowrap">
                                        {formatTime(i * step).split('.')[0]}
                                    </span>
                                </div>
                            ))}

                            {/* Playhead Handle */}
                            <div
                                className="absolute top-0 bottom-0 z-50 pointer-events-none"
                                style={{ left: currentTime * PIXELS_PER_SECOND }}
                            >
                                <div className="absolute bottom-0 -translate-x-1/2 translate-y-1/2">
                                    <svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M5.5 12L0 6V0H11V6L5.5 12Z" fill="#06b6d4" />
                                    </svg>
                                </div>
                                <div className="absolute top-0 bottom-0 w-px bg-electric-cyan/50 -translate-x-[0.5px]" />
                            </div>
                        </div>

                        {/* Content Area with Surface Tracks */}
                        <div className="flex-1 flex flex-col relative bg-zinc-950/20 overflow-y-auto">
                            {surfaces.map((surface) => (
                                <TimelineTrackContent
                                    key={surface.id}
                                    surfaceId={surface.id}
                                    keyframes={keyframes}
                                    duration={duration}
                                    pixelsPerSecond={PIXELS_PER_SECOND}
                                />
                            ))}

                            {/* Playhead Line */}
                            <div
                                className="absolute top-0 bottom-0 w-px bg-electric-cyan/40 z-30 pointer-events-none shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                                style={{ left: currentTime * PIXELS_PER_SECOND }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
