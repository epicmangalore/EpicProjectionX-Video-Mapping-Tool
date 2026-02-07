"use client";

import { useEffectsStore } from "@/store/effects-store";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface EdgeBlendingControlsProps {
    surfaceId: string;
}

export function EdgeBlendingControls({ surfaceId }: EdgeBlendingControlsProps) {
    const effects = useEffectsStore((state) => state.surfaceEffects[surfaceId] || ({} as any));
    const updateSurfaceEffect = useEffectsStore((state) => state.updateSurfaceEffect);
    const [isOpen, setIsOpen] = useState(false);

    const controls = [
        { label: "Left", key: "blendLeft" as const, min: 0, max: 1, step: 0.01 },
        { label: "Right", key: "blendRight" as const, min: 0, max: 1, step: 0.01 },
        { label: "Top", key: "blendTop" as const, min: 0, max: 1, step: 0.01 },
        { label: "Bottom", key: "blendBottom" as const, min: 0, max: 1, step: 0.01 },
        { label: "Feather", key: "blendFeather" as const, min: 0, max: 1, step: 0.01 },
        { label: "Gamma", key: "blendGamma" as const, min: 1, max: 4, step: 0.1 },
    ];

    return (
        <div className="border-t border-white/5 pt-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-2 text-sm font-semibold hover:text-electric-cyan transition-colors"
            >
                <span>Edge Blending</span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isOpen && (
                <div className="space-y-3 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                        {controls.slice(0, 4).map((control) => (
                            <div key={control.key}>
                                <label className="text-[10px] text-muted-foreground mb-1 block">
                                    {control.label}: {Math.round((effects[control.key] || 0) * 100)}%
                                </label>
                                <input
                                    type="range"
                                    value={effects[control.key] || 0}
                                    onChange={(e) =>
                                        updateSurfaceEffect(surfaceId, {
                                            [control.key]: parseFloat(e.target.value),
                                        })
                                    }
                                    min={control.min}
                                    max={control.max}
                                    step={control.step}
                                    className="w-full accent-electric-cyan"
                                />
                            </div>
                        ))}
                    </div>

                    {controls.slice(4).map((control) => (
                        <div key={control.key}>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                {control.label}: {(effects[control.key] || (control.key === 'blendGamma' ? 2.2 : 0)).toFixed(2)}
                            </label>
                            <input
                                type="range"
                                value={effects[control.key] || (control.key === 'blendGamma' ? 2.2 : 0)}
                                onChange={(e) =>
                                    updateSurfaceEffect(surfaceId, {
                                        [control.key]: parseFloat(e.target.value),
                                    })
                                }
                                min={control.min}
                                max={control.max}
                                step={control.step}
                                className="w-full accent-electric-cyan"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
