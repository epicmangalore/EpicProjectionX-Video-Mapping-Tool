"use client";

import { useTimelineStore, Keyframe } from "@/store/timeline-store";
import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { useProjectStore } from "@/store/project-store";

export function TimelineTrackSidebar({ surfaceId, surfaceName }: { surfaceId: string, surfaceName: string, keyframes: Keyframe[] }) {
    const surface = useProjectStore(state => state.surfaces.find(s => s.id === surfaceId));
    const updateSurface = useProjectStore(state => state.updateSurface);

    if (!surface) return null;

    return (
        <div className="flex h-12 items-center border-b border-white/5 bg-zinc-900/30 px-3 gap-3 shrink-0 group">
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => updateSurface(surfaceId, { opacity: surface.visible === false ? 1 : 0, visible: surface.visible === false })}
                    className="p-1 text-zinc-500 hover:text-white transition-colors"
                >
                    {surface.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                    onClick={() => updateSurface(surfaceId, { locked: !surface.locked })}
                    className="p-1 text-zinc-500 hover:text-white transition-colors"
                >
                    {surface.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
            </div>
            <span className="text-xs font-medium text-zinc-300 truncate select-none">{surfaceName}</span>
        </div>
    );
}

import { useRef, useState, useEffect } from "react";

export function TimelineTrackContent({ surfaceId, keyframes, duration }: { surfaceId: string, keyframes: Keyframe[], duration: number }) {
    const surface = useProjectStore(state => state.surfaces.find(s => s.id === surfaceId));
    const updateSurface = useProjectStore(state => state.updateSurface);

    // Resize state
    const [isResizing, setIsResizing] = useState<"start" | "end" | null>(null);
    const startXRef = useRef<number>(0);
    const initialTimeRef = useRef<number>(0);
    const initialDurationRef = useRef<number>(0);
    const trackRef = useRef<HTMLDivElement>(null);

    // Determine track color based on type
    const isImage = surface?.mediaId?.startsWith("image");
    const isVideo = surface?.mediaId?.startsWith("video");
    const trackColor = isVideo ? "bg-blue-500/20 border-blue-500/40" :
        isImage ? "bg-purple-500/20 border-purple-500/40" :
            "bg-zinc-700/40 border-zinc-600/40";

    const handleResizeStart = (e: React.MouseEvent, edge: "start" | "end") => {
        e.stopPropagation();
        if (!surface) return;

        setIsResizing(edge);
        startXRef.current = e.clientX;
        initialTimeRef.current = surface.startTime;
        initialDurationRef.current = surface.duration;
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!trackRef.current || !surface) return;

            const rect = trackRef.current.getBoundingClientRect();
            const deltaX = e.clientX - startXRef.current;
            const deltaTime = (deltaX / rect.width) * duration;

            if (isResizing === "start") {
                const newStartTime = Math.max(0, Math.min(initialTimeRef.current + deltaTime, initialTimeRef.current + initialDurationRef.current - 0.1));
                const newDuration = Math.max(0.1, initialDurationRef.current - (newStartTime - initialTimeRef.current));
                updateSurface(surfaceId, { startTime: newStartTime, duration: newDuration });
            } else {
                const newDuration = Math.max(0.1, initialDurationRef.current + deltaTime);
                updateSurface(surfaceId, { duration: newDuration });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing, duration, surfaceId, updateSurface]);

    if (!surface) return null;

    // Calculate position and width percentages
    const leftPercent = (surface.startTime / duration) * 100;
    const widthPercent = (surface.duration / duration) * 100;

    return (
        <div className="h-12 border-b border-white/5 relative bg-zinc-900/10 hover:bg-zinc-900/20 transition-colors flex items-center px-1" ref={trackRef}>
            {/* Render clip bar based on start/duration */}
            <div
                className={`h-8 rounded ${trackColor} border relative overflow-hidden group absolute`}
                style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
            >
                {/* Drag Handles */}
                <div
                    className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize bg-white/10 hover:bg-white/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => handleResizeStart(e, "start")}
                />
                <div
                    className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize bg-white/10 hover:bg-white/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => handleResizeStart(e, "end")}
                />

                {/* Keyframe indicators (relative to clip) */}
                {/* Note: Keyframes are absolute times, so we map them relative to the timeline content, NOT this clip div, 
                    OR we just render them absolutely in the track container if they are timeline-global. 
                    Wait, keyframes are usually inside the clip in NLEs. 
                    But currently keyframes are stored with absolute 'time'. 
                    So let's render them outside this clip div, OR translate them.
                    Actually, rendering them inside the clip is tricky if the clip moves. 
                    Let's render them as children of the track container (the parent div) for now, to simpler alignment. */}
            </div>

            {/* Keyframes - Rendered relative to the track, not the clip, for simplicity with absolute times */}
            {keyframes.filter(kf => kf.surfaceId === surfaceId).map(kf => (
                <div
                    key={kf.id}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-white border border-black shadow-sm z-10 cursor-pointer hover:scale-125 transition-transform"
                    style={{ left: `${(kf.time / duration) * 100}%` }}
                    title={`${kf.property}: ${kf.value}`}
                />
            ))}
        </div>
    );
}
