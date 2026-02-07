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

export function TimelineTrackContent({ surfaceId, keyframes, duration }: { surfaceId: string, keyframes: Keyframe[], duration: number }) {
    const surface = useProjectStore(state => state.surfaces.find(s => s.id === surfaceId));

    // Determine track color based on type (mock logic for visual distinction)
    const isImage = surface?.mediaId?.startsWith("image");
    const isVideo = surface?.mediaId?.startsWith("video");
    const trackColor = isVideo ? "bg-blue-500/20 border-blue-500/40" :
        isImage ? "bg-purple-500/20 border-purple-500/40" :
            "bg-zinc-700/40 border-zinc-600/40";

    return (
        <div className="h-12 border-b border-white/5 relative bg-zinc-900/10 hover:bg-zinc-900/20 transition-colors flex items-center px-1">
            {/* Render a main clip bar mimicking a duration-based clip */}
            {/* Since we don't have explicit start/duration for surfaces yet, we'll render a bar spanning the whole timeline for demo purposes, 
                or just visual styling that suggests a track. */}
            <div className={`h-8 w-full rounded ${trackColor} border relative overflow-hidden group`}>
                {/* Keyframe indicators on the main track */}
                {keyframes.filter(kf => kf.surfaceId === surfaceId).map(kf => (
                    <div
                        key={kf.id}
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-white border border-black shadow-sm z-10 cursor-pointer hover:scale-125 transition-transform"
                        style={{ left: `${(kf.time / duration) * 100}%` }}
                        title={`${kf.property}: ${kf.value}`}
                    />
                ))}

                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            </div>
        </div>
    );
}
