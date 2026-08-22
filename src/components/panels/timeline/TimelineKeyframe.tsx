"use client";

import { useTimelineStore } from "@/store/timeline-store";

interface TimelineKeyframeProps {
    id: string;
    time: number;
    duration: number;
    isSelected?: boolean;
    onSelect?: () => void;
}

export function TimelineKeyframe({ id, time, duration, isSelected, onSelect }: TimelineKeyframeProps) {
    const seek = useTimelineStore((state) => state.seek);

    return (
        <div
            className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border shadow-sm cursor-pointer transition-transform hover:scale-125 z-10 ${isSelected
                    ? "bg-electric-cyan border-white scale-110 shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                    : "bg-zinc-400 border-zinc-900 hover:bg-zinc-200"
                }`}
            style={{ left: `${(time / duration) * 100}%` }}
            onClick={(e) => {
                e.stopPropagation();
                seek(time);
                onSelect?.();
            }}
        />
    );
}
