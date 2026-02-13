import { useProjectStore } from "@/store/project-store";
import { useActiveSurfaces } from "@/hooks/useActiveSurfaces";
import { useUIStore } from "@/store/ui-store";
import { Wand2, X } from "lucide-react";

export function ShaderEffectControls() {
    const surfaces = useActiveSurfaces();
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const updateMediaAsset = useProjectStore((state) => state.updateMediaAsset);
    const updateSurface = useProjectStore((state) => state.updateSurface);

    const activeConfig = useUIStore((state) => state.activeEffectConfig);
    const setActiveEffectConfig = useUIStore((state) => state.setActiveEffectConfig);

    const selectedSurface = surfaces.find((s) => selectedIds.includes(s.id));
    if (!selectedSurface) return null;

    // Get shader effects from the surface's shaderEffectIds array
    const shaderEffectIds = selectedSurface.shaderEffectIds || [];
    const shaderEffects = shaderEffectIds
        .map(id => mediaAssets.find(a => a.id === id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined && a.type === "shader" && !!a.uniforms);

    if (shaderEffects.length === 0) return null;

    const handleRemoveEffect = (effectId: string) => {
        const newEffects = shaderEffectIds.filter(id => id !== effectId);
        updateSurface(selectedSurface.id, {
            shaderEffectIds: newEffects,
        });
        if (activeConfig?.type === "shader" && activeConfig.effectId === effectId) {
            setActiveEffectConfig(null);
        }
    };

    return (
        <div className="p-4 border-t border-white/10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-electric-cyan" />
                    Shader Effects
                </h3>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {shaderEffects.length} Active
                </span>
            </div>

            {/* Effect List */}
            <div className="space-y-2">
                {shaderEffects.map((effect) => {
                    const isActive = activeConfig?.type === "shader" && activeConfig.effectId === effect.id;

                    return (
                        <div
                            key={effect.id}
                            onClick={() => setActiveEffectConfig({ type: "shader", effectId: effect.id, surfaceId: selectedSurface.id })}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${isActive ? 'bg-electric-cyan/10 border-electric-cyan ring-1 ring-electric-cyan/30' : 'bg-zinc-900/50 border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Wand2 className="w-3.5 h-3.5 text-electric-cyan" />
                                <span className="text-xs font-semibold text-zinc-200">
                                    {effect.name}
                                </span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-electric-cyan shadow-[0_0_8px_rgba(0,255,255,0.5)]" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
