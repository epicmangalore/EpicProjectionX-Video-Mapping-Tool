"use client";

import { useTimelineStore, Keyframe } from "@/store/timeline-store";
import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { useProjectStore } from "@/store/project-store";

export function TimelineTrackSidebar({ surfaceId, surfaceName }: { surfaceId: string, surfaceName: string, keyframes: Keyframe[] }) {
    const surface = useProjectStore(state => state.getActiveSurfaces().find(s => s.id === surfaceId));
    const updateSurface = useProjectStore(state => state.updateSurface);
    const selectSurface = useProjectStore(state => state.selectSurface);
    const selectedSurfaceIds = useProjectStore(state => state.selectedSurfaceIds);
    const isSelected = selectedSurfaceIds.includes(surfaceId);

    if (!surface) return null;

    const handleClick = (e: React.MouseEvent) => {
        selectSurface(surfaceId, e.metaKey || e.ctrlKey);
    };

    return (
        <div
            className={`flex h-12 items-center border-b border-white/5 px-2 gap-1.5 shrink-0 group transition-colors cursor-pointer ${isSelected
                ? 'bg-electric-cyan/10 border-l-2 border-l-electric-cyan'
                : 'bg-zinc-900/30 hover:bg-zinc-800/40'
                }`}
            onClick={handleClick}
        >
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); updateSurface(surfaceId, { opacity: surface.visible === false ? 1 : 0, visible: surface.visible === false }); }}
                    className="p-0.5 text-zinc-500 hover:text-white transition-colors"
                >
                    {surface.visible === false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); updateSurface(surfaceId, { locked: !surface.locked }); }}
                    className="p-0.5 text-zinc-500 hover:text-white transition-colors"
                >
                    {surface.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
            </div>
            <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-electric-cyan' : 'bg-zinc-600'}`} />
        </div>
    );
}

import { useRef, useState, useEffect } from "react";

export function TimelineTrackContent({ surfaceId, keyframes, duration }: { surfaceId: string, keyframes: Keyframe[], duration: number }) {
    const surface = useProjectStore(state => state.getActiveSurfaces().find(s => s.id === surfaceId));
    const updateSurface = useProjectStore(state => state.updateSurface);
    const selectSurface = useProjectStore(state => state.selectSurface);
    const saveHistory = useProjectStore((state) => state.saveHistory);
    const selectedSurfaceIds = useProjectStore(state => state.selectedSurfaceIds);
    const isSelected = selectedSurfaceIds.includes(surfaceId);

    // Resize/Move state
    const [interaction, setInteraction] = useState<"start" | "end" | "move" | null>(null);
    const startXRef = useRef<number>(0);
    const initialTimeRef = useRef<number>(0);
    const initialDurationRef = useRef<number>(0);
    const trackRef = useRef<HTMLDivElement>(null);

    // Determine track color based on type and selection
    const isImage = surface?.mediaId?.startsWith("image");
    const isVideo = surface?.mediaId?.startsWith("video");
    const trackColor = isSelected
        ? "bg-electric-cyan/30 border-electric-cyan/60"
        : isVideo ? "bg-blue-500/20 border-blue-500/40" :
            isImage ? "bg-purple-500/20 border-purple-500/40" :
                "bg-zinc-700/40 border-zinc-600/40";

    const handleInteractionStart = (e: React.MouseEvent, type: "start" | "end" | "move") => {
        e.stopPropagation();
        if (!surface) return;

        // Select the surface on interaction
        selectSurface(surfaceId, e.metaKey || e.ctrlKey);

        saveHistory();
        setInteraction(type);
        startXRef.current = e.clientX;
        initialTimeRef.current = surface.startTime;
        initialDurationRef.current = surface.duration;
    };

    useEffect(() => {
        if (!interaction) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!trackRef.current || !surface) return;

            const rect = trackRef.current.getBoundingClientRect();
            const deltaX = e.clientX - startXRef.current;
            const deltaTime = (deltaX / rect.width) * duration;

            if (interaction === "move") {
                const newStartTime = Math.max(0, initialTimeRef.current + deltaTime);
                // Optional: Clamp to timeline end? const newStartTime = Math.max(0, Math.min(initialTimeRef.current + deltaTime, duration - initialDurationRef.current));
                updateSurface(surfaceId, { startTime: newStartTime });
            } else if (interaction === "start") {
                const newStartTime = Math.max(0, Math.min(initialTimeRef.current + deltaTime, initialTimeRef.current + initialDurationRef.current - 0.1));
                const newDuration = Math.max(0.1, initialDurationRef.current - (newStartTime - initialTimeRef.current));
                updateSurface(surfaceId, { startTime: newStartTime, duration: newDuration });
            } else if (interaction === "end") {
                const newDuration = Math.max(0.1, initialDurationRef.current + deltaTime);
                updateSurface(surfaceId, { duration: newDuration });
            }
        };

        const handleMouseUp = () => {
            setInteraction(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [interaction, duration, surfaceId, updateSurface]);

    if (!surface) return null;

    // Calculate position and width percentages
    const leftPercent = (surface.startTime / duration) * 100;
    const widthPercent = (surface.duration / duration) * 100;

    const handleTrackClick = (e: React.MouseEvent) => {
        // Only select if clicking the track background (not the clip bar)
        if (e.target === e.currentTarget) {
            selectSurface(surfaceId, e.metaKey || e.ctrlKey);
        }
    };

    return (
        <div
            className={`h-12 border-b border-white/5 relative flex items-center px-1 transition-colors cursor-pointer ${isSelected ? 'bg-electric-cyan/5 hover:bg-electric-cyan/10' : 'bg-zinc-900/10 hover:bg-zinc-900/20'
                }`}
            ref={trackRef}
            onClick={handleTrackClick}
        >
            {/* Render clip bar based on start/duration */}
            <div
                className={`h-8 rounded ${trackColor} border relative overflow-hidden group absolute cursor-grab active:cursor-grabbing`}
                style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                onMouseDown={(e) => handleInteractionStart(e, "move")}
            >
                {/* Drag Handles */}
                <div
                    className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize bg-white/10 hover:bg-white/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => handleInteractionStart(e, "start")}
                />
                <div
                    className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize bg-white/10 hover:bg-white/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => handleInteractionStart(e, "end")}
                />

                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

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
