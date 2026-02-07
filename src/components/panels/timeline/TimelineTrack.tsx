"use client";

import { ChevronRight, ChevronDown, Timer, TimerOff } from "lucide-react";
import { useTimelineStore, Keyframe } from "@/store/timeline-store";
import { TimelineKeyframe } from "./TimelineKeyframe";

interface PropertyTrackProps {
    surfaceId: string;
    property: string;
    label: string;
    keyframes: Keyframe[];
    duration: number;
}

function PropertyTrack({ surfaceId, property, label, keyframes, duration }: PropertyTrackProps) {
    const addKeyframe = useTimelineStore((state) => state.addKeyframe);
    const currentTime = useTimelineStore((state) => state.currentTime);

    const propertyKeyframes = keyframes.filter(kf => kf.surfaceId === surfaceId && kf.property === property);
    const hasKeyframeAtCurrent = propertyKeyframes.some(kf => Math.abs(kf.time - currentTime) < 0.01);

    const toggleKeyframe = () => {
        if (hasKeyframeAtCurrent) {
            // Logic to remove or we could just add if missing for now
        } else {
            addKeyframe({
                surfaceId,
                property,
                time: currentTime,
                value: 0, // Should be current value from project store
                easing: "power2.inOut"
            });
        }
    };

    return (
        <div className="flex h-6 border-b border-white/5 hover:bg-white/[0.02] group/track">
            {/* Left side: Property Label */}
            <div className="w-48 border-r border-white/5 flex items-center px-6 gap-2 shrink-0">
                <button
                    onClick={toggleKeyframe}
                    className={`p-0.5 rounded transition-colors ${hasKeyframeAtCurrent ? 'text-electric-cyan' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                    <Timer className="w-3 h-3" />
                </button>
                <span className="text-[10px] text-zinc-400 group-hover/track:text-zinc-200 truncate">{label}</span>
            </div>

            {/* Right side: Keyframe Area */}
            <div className="flex-1 relative">
                {propertyKeyframes.map(kf => (
                    <TimelineKeyframe
                        key={kf.id}
                        id={kf.id}
                        time={kf.time}
                        duration={duration}
                    />
                ))}
            </div>
        </div>
    );
}

interface TimelineTrackProps {
    surfaceId: string;
    surfaceName: string;
    keyframes: Keyframe[];
    duration: number;
}

export function TimelineTrack({ surfaceId, surfaceName, keyframes, duration }: TimelineTrackProps) {
    const expandedSurfaces = useTimelineStore((state) => state.expandedSurfaces);
    const toggleSurfaceExpanded = useTimelineStore((state) => state.toggleSurfaceExpanded);
    const isExpanded = expandedSurfaces.includes(surfaceId);

    const properties = [
        { path: "position.x", label: "Position X" },
        { path: "position.y", label: "Position Y" },
        { path: "scale.x", label: "Scale X" },
        { path: "scale.y", label: "Scale Y" },
        { path: "rotation", label: "Rotation" },
        { path: "opacity", label: "Opacity" },
    ];

    return (
        <div className="flex flex-col border-b border-white/10">
            {/* Surface Header Row */}
            <div className="flex h-8 items-center bg-zinc-900/30 hover:bg-zinc-900/50">
                <div className="w-48 border-r border-white/5 flex items-center px-2 gap-1 shrink-0">
                    <button
                        onClick={() => toggleSurfaceExpanded(surfaceId)}
                        className="p-0.5 text-zinc-500 hover:text-white transition-colors"
                    >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-[11px] font-bold text-zinc-300 truncate">{surfaceName}</span>
                </div>
                <div className="flex-1 relative">
                    {/* Visual indicators for keyframes in collapsed state */}
                    {!isExpanded && keyframes.filter(kf => kf.surfaceId === surfaceId).map(kf => (
                        <div
                            key={kf.id}
                            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-zinc-600 rounded-full"
                            style={{ left: `${(kf.time / duration) * 100}%` }}
                        />
                    ))}
                </div>
            </div>

            {/* Property Rows (Expanded) */}
            {isExpanded && (
                <div className="bg-black/20">
                    {properties.map(prop => (
                        <PropertyTrack
                            key={prop.path}
                            surfaceId={surfaceId}
                            property={prop.path}
                            label={prop.label}
                            keyframes={keyframes}
                            duration={duration}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
