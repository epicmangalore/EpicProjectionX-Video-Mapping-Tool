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
        <div className="h-48 bg-zinc-900 border-t border-white/5 flex flex-col">
            {/* Header with controls */}
            <div className="h-12 px-4 border-b border-white/10 flex items-center gap-4">
                {/* Playback controls */}
                <div className="flex gap-1">
                    <button
                        onClick={stop}
                        className="p-2 glass glass-hover rounded"
                        title="Stop"
                    >
                        <Square className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => seek(Math.max(0, currentTime - 1))}
                        className="p-2 glass glass-hover rounded"
                        title="Back 1s"
                    >
                        <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                        onClick={isPlaying ? pause : play}
                        className="p-2 bg-electric-purple hover:bg-electric-purple/80 rounded transition-colors"
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                    </button>
                    <button
                        onClick={() => seek(Math.min(duration, currentTime + 1))}
                        className="p-2 glass glass-hover rounded"
                        title="Forward 1s"
                    >
                        <SkipForward className="w-4 h-4" />
                    </button>
                </div>

                {/* Time display */}
                <div className="text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Loop toggle */}
                <button
                    onClick={() => setLoop(!loop)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${loop
                        ? "bg-electric-purple text-white"
                        : "glass glass-hover"
                        }`}
                >
                    Loop
                </button>

                <div className="flex-1" />

                {/* Add keyframe */}
                <button
                    onClick={handleAddKeyframe}
                    disabled={selectedSurfaceIds.length === 0}
                    className="px-3 py-1 text-xs glass glass-hover rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add keyframe at current time"
                >
                    <Plus className="w-3 h-3" />
                    Keyframe
                </button>

                {/* Keyframe count */}
                <div className="text-xs text-muted-foreground">
                    {keyframes.length} keyframes
                </div>
            </div>

            {/* Timeline scrubber */}
            <div className="flex-1 p-4">
                <div
                    ref={timelineRef}
                    className="relative h-full bg-dark-800 rounded-md cursor-pointer"
                    onMouseDown={handleScrubberMouseDown}
                >
                    {/* Time markers */}
                    <div className="absolute inset-0 flex">
                        {Array.from({ length: Math.floor(duration) + 1 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex-1 border-l border-white/10 relative"
                            >
                                <span className="absolute top-1 left-1 text-xs text-muted-foreground">
                                    {i}s
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Keyframes */}
                    {keyframes.map((kf) => (
                        <div
                            key={kf.id}
                            className="absolute top-0 bottom-0 w-1 bg-electric-cyan hover:bg-electric-cyan/80 cursor-pointer group"
                            style={{ left: `${(kf.time / duration) * 100}%` }}
                            onClick={(e) => {
                                e.stopPropagation();
                                seek(kf.time);
                            }}
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-electric-cyan rounded-full" />

                            {/* Keyframe tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-dark-900 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {formatTime(kf.time)}
                                <br />
                                {kf.property}
                            </div>

                            {/* Delete button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteKeyframe(kf.id);
                                }}
                                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-1 bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-2 h-2" />
                            </button>
                        </div>
                    ))}

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-electric-purple pointer-events-none"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-electric-purple" />
                    </div>
                </div>
            </div>
        </div>
    );
}
