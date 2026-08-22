"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw, Maximize2 } from "lucide-react";
import { useTimelineStore } from "@/store/timeline-store";
import { useProjectStore } from "@/store/project-store";
import { usePlaybackStore } from "@/store/playback-store";
import { useUIStore } from "@/store/ui-store";
import { useActiveSurfaces } from "@/hooks/useActiveSurfaces";
import { useHasMounted } from "@/hooks/useHasMounted";
import { TimelineTrackContent } from "./timeline/TimelineTrack";

export const BASE_PPS = 40; // Base pixels per second

const getNiceStep = (rawStep: number) => {
    if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    if (normalized <= 1) return 1 * magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
};

export function TimelinePanel() {
    const hasMounted = useHasMounted();
    const currentTime = useTimelineStore((state) => state.currentTime);
    const duration = useTimelineStore((state) => state.duration);
    const snapToGrid = useTimelineStore((state) => state.snapToGrid);
    const keyframes = useTimelineStore((state) => state.keyframes);
    const zoom = useTimelineStore((state) => state.zoom);

    const updateSurface = useProjectStore((state) => state.updateSurface);
    const surfaces = useActiveSurfaces();

    const play = useTimelineStore((state) => state.play);
    const pause = useTimelineStore((state) => state.pause);
    const seek = useTimelineStore((state) => state.seek);
    const setSnapToGrid = useTimelineStore((state) => state.setSnapToGrid);
    const setDuration = useTimelineStore((state) => state.setDuration);
    const setZoom = useTimelineStore((state) => state.setZoom);
    const initTimeline = useTimelineStore((state) => state.initTimeline);
    const updateTimeline = useTimelineStore((state) => state.updateTimeline);

    const [durationInputValue, setDurationInputValue] = useState((duration / 60).toFixed(2));

    // Sync local input value when duration changes externally
    useEffect(() => {
        setDurationInputValue((duration / 60).toFixed(2));
    }, [duration]);

    const timelineRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Calculate dynamic pixels per second
    const pixelsPerSecond = BASE_PPS * zoom;

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

    // Auto-fit logic
    const [hasManuallyZoomed, setHasManuallyZoomed] = useState(false);

    const getMinZoomToFit = useCallback(() => {
        if (!scrollContainerRef.current || duration <= 0) return 0.0001;
        const containerWidth = scrollContainerRef.current.clientWidth;
        if (containerWidth <= 0) return 0.0001;
        return Math.max(0.0001, containerWidth / (duration * BASE_PPS));
    }, [duration]);

    const fitToView = useCallback(() => {
        if (!scrollContainerRef.current) return;
        const containerWidth = scrollContainerRef.current.clientWidth;
        if (containerWidth > 50 && duration > 0) {
            const idealZoom = Math.max(getMinZoomToFit(), containerWidth / (duration * BASE_PPS));
            setZoom(idealZoom);
        }
    }, [duration, setZoom, getMinZoomToFit]);

    // Initial fit and Resize handling
    useEffect(() => {
        if (!hasManuallyZoomed) {
            fitToView();
        }

        const observer = new ResizeObserver(() => {
            if (!hasManuallyZoomed) {
                fitToView();
            }
        });

        if (scrollContainerRef.current) {
            observer.observe(scrollContainerRef.current);
        }

        return () => observer.disconnect();
    }, [fitToView, hasManuallyZoomed]);

    // Handle Scroll to Zoom
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Check if vertical scroll is dominant OR if Ctrl/Cmd is held for zooming
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX) || e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setHasManuallyZoomed(true);

                // Increase sensitivity and handle trackpad vs mouse wheel
                const delta = e.deltaY > 0 ? 0.85 : 1.15;
                const minZoomToFit = getMinZoomToFit();
                const newZoom = Math.max(minZoomToFit, Math.min(10, zoom * delta));

                // Pivot zoom around mouse position
                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left + container.scrollLeft;
                const timeAtMouse = mouseX / (BASE_PPS * zoom);

                setZoom(newZoom);

                // Adjust scroll to keep time position under mouse
                const newMouseX = timeAtMouse * (BASE_PPS * newZoom);
                container.scrollLeft = newMouseX - (e.clientX - rect.left);
            }
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => container.removeEventListener("wheel", handleWheel);
    }, [zoom, setZoom, getMinZoomToFit]);

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

    // Handle scrubber drag using dynamic pixel unit
    const handleScrubberMove = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const newTime = x / pixelsPerSecond;
        seek(newTime);
    }, [seek, pixelsPerSecond]);

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

    // Adaptive ruler steps to keep timeline labels readable at every zoom level
    const majorLabelMinPx = 96;
    const minorTickMinPx = 24;
    const majorStep = getNiceStep(majorLabelMinPx / pixelsPerSecond);
    const minorStep = getNiceStep(Math.max(minorTickMinPx / pixelsPerSecond, majorStep / 5));
    const totalWidth = duration * pixelsPerSecond;

    return (
        <div className="h-64 bg-zinc-950 border-t border-white/5 flex flex-col font-sans select-none overflow-hidden text-zinc-300" data-tour="timeline-panel">
            {/* Deck Header */}
            <div className="h-10 px-2 md:px-4 border-b border-white/5 flex items-center justify-between bg-zinc-900 shrink-0 gap-2 min-w-0">
                <div className="flex items-center gap-2 md:gap-4 min-w-0 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-700 px-1 rounded bg-zinc-800">TIMELINE</span>
                        <span className="text-sm font-mono text-electric-cyan tabular-nums w-24">{formatTime(currentTime)}</span>
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Duration</span>
                        <div className="flex items-center">
                            <input
                                type="number"
                                value={durationInputValue}
                                onChange={(e) => setDurationInputValue(e.target.value)}
                                step="0.1"
                                onBlur={(e) => {
                                    const mins = parseFloat(e.target.value) || 0;
                                    const secs = Math.min(600, Math.max(300, mins * 60));
                                    setDuration(secs);
                                    // The useEffect will sync back the capped value
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const mins = parseFloat((e.target as HTMLInputElement).value) || 0;
                                        const secs = Math.min(600, Math.max(300, mins * 60));
                                        setDuration(secs);
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                className="w-12 md:w-14 h-5 bg-zinc-800 border border-zinc-700 rounded-l text-[10px] font-mono text-zinc-200 px-1 focus:outline-none focus:border-electric-cyan"
                                title="Max 10 minutes (600s), Min 5 minutes (300s)"
                            />
                            <span className="h-5 flex items-center px-1.5 bg-zinc-800 border border-l-0 border-zinc-700 rounded-r text-[9px] text-zinc-500 font-mono">m</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    <button
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all active:scale-95 ${snapToGrid ? 'bg-electric-cyan/20 text-electric-cyan border border-electric-cyan/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}
                    >
                        Snap
                    </button>

                    <button
                        onClick={() => {
                            setHasManuallyZoomed(false);
                            fitToView();
                        }}
                        className="p-1.5 rounded transition-all active:scale-95 bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-electric-cyan/30 hover:text-electric-cyan hover:bg-electric-cyan/10"
                        title="Fit Timeline to View"
                    >
                        <Maximize2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent("force-video-sync", {
                                detail: { time: currentTime }
                            }));
                        }}
                        className="p-1.5 rounded transition-all active:scale-95 bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-electric-cyan/30 hover:text-electric-cyan hover:bg-electric-cyan/10"
                        title="Sync all videos to current timeline position"
                        data-tour="video-sync"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Main Timeline Scroll Area */}
            {hasMounted && (
                <div
                    className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden no-scrollbar timeline-scrollbar min-w-0"
                    ref={scrollContainerRef}
                >
                    <div style={{ width: totalWidth, position: 'relative', minHeight: '100%' }} className="flex flex-col">
                        {/* Ruler Area */}
                        <div
                            className="h-10 border-b border-white/5 relative bg-zinc-900/30 cursor-crosshair group/ruler shrink-0"
                            onMouseDown={handleScrubberMouseDown}
                            ref={timelineRef}
                        >
                            {Array.from({ length: Math.floor(duration / minorStep) + 1 }).map((_, i) => {
                                const time = i * minorStep;
                                const isMajorTick = Math.abs((time / majorStep) - Math.round(time / majorStep)) < 0.0001;

                                return (
                                    <div
                                        key={i}
                                        className={`absolute top-0 bottom-0 border-l ${isMajorTick ? "border-white/12" : "border-white/5"}`}
                                        style={{ left: time * pixelsPerSecond }}
                                    >
                                        {isMajorTick && (
                                            <span className="absolute top-1 left-1 text-[9px] font-mono text-zinc-500 whitespace-nowrap">
                                                {formatTime(time).split(".")[0]}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Playhead Handle */}
                            <div
                                className="absolute top-0 bottom-0 z-50 pointer-events-none"
                                style={{ left: currentTime * pixelsPerSecond }}
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
                                    pixelsPerSecond={pixelsPerSecond}
                                />
                            ))}

                            {/* Playhead Line */}
                            <div
                                className="absolute top-0 bottom-0 w-px bg-electric-cyan/40 z-30 pointer-events-none shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                                style={{ left: currentTime * pixelsPerSecond }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
