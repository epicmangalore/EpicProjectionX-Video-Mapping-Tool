"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Wand2, Sparkles, Zap, Palette, Droplets, Waves, Monitor, Brush, ChevronRight, X, Play } from "lucide-react";
import { effectsLibrary, type EffectMeta, type CategoryMeta } from "@/lib/effects/EffectsLibrary";
import { useProjectStore } from "@/store/project-store";
import { generateId } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    glitch: <Zap className="w-3.5 h-3.5" />,
    color: <Palette className="w-3.5 h-3.5" />,
    blur: <Droplets className="w-3.5 h-3.5" />,
    distortion: <Waves className="w-3.5 h-3.5" />,
    retro: <Monitor className="w-3.5 h-3.5" />,
    artistic: <Brush className="w-3.5 h-3.5" />,
    generators: <Sparkles className="w-3.5 h-3.5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
    glitch: "text-red-400",
    color: "text-amber-400",
    blur: "text-blue-400",
    distortion: "text-purple-400",
    retro: "text-green-400",
    artistic: "text-pink-400",
    generators: "text-cyan-400",
};

const CATEGORY_BG: Record<string, string> = {
    glitch: "bg-red-500/10 border-red-500/20",
    color: "bg-amber-500/10 border-amber-500/20",
    blur: "bg-blue-500/10 border-blue-500/20",
    distortion: "bg-purple-500/10 border-purple-500/20",
    retro: "bg-green-500/10 border-green-500/20",
    artistic: "bg-pink-500/10 border-pink-500/20",
    generators: "bg-cyan-500/10 border-cyan-500/20",
};

export function EffectsBrowser() {
    const [categories, setCategories] = useState<CategoryMeta[]>([]);
    const [effects, setEffects] = useState<EffectMeta[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    const addMediaAsset = useProjectStore((s) => s.addMediaAsset);
    const addSurface = useProjectStore((s) => s.addSurface);

    // Load manifest on mount
    useEffect(() => {
        effectsLibrary
            .loadManifest()
            .then(async () => {
                const cats = await effectsLibrary.getCategories();
                const effs = await effectsLibrary.getEffects();
                setCategories(cats);
                setEffects(effs);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Filter effects
    const filteredEffects = useCallback(() => {
        let result = effects;
        if (selectedCategory) {
            result = result.filter((e) => e.category === selectedCategory);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (e) =>
                    e.name.toLowerCase().includes(q) ||
                    e.description.toLowerCase().includes(q) ||
                    e.tags.some((t) => t.includes(q))
            );
        }
        return result;
    }, [effects, selectedCategory, searchQuery])();

    // Apply effect as a generator surface
    const applyGenerator = async (effect: EffectMeta) => {
        const shaderSource = await effectsLibrary.loadShader(effect.id);
        const mediaId = generateId();
        addMediaAsset({
            id: mediaId,
            name: effect.name,
            type: "shader",
            shaderSource,
            effectId: effect.id,
            uniforms: effectsLibrary.getDefaultUniforms(effect),
        });
        addSurface(mediaId);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-xs text-zinc-500 animate-pulse">Loading effects...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search */}
            <div className="p-3 border-b border-white/5">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search effects..."
                        className="w-full pl-8 pr-8 py-2 bg-zinc-800/50 border border-white/5 rounded text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-electric-cyan/30"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Category Pills */}
            <div className="px-3 py-2 flex gap-1.5 flex-wrap border-b border-white/5">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border ${
                        !selectedCategory
                            ? "bg-white/10 border-white/20 text-white"
                            : "border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                    }`}
                >
                    All
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border flex items-center gap-1 ${
                            selectedCategory === cat.id
                                ? `${CATEGORY_BG[cat.id]} ${CATEGORY_COLORS[cat.id]}`
                                : "border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                        }`}
                    >
                        {CATEGORY_ICONS[cat.id]}
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Effects Grid */}
            <div className="flex-1 overflow-y-auto p-3">
                {filteredEffects.length === 0 ? (
                    <div className="text-center py-8">
                        <Wand2 className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                        <p className="text-xs text-zinc-600">No effects found</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {filteredEffects.map((effect) => (
                            <EffectCard
                                key={effect.id}
                                effect={effect}
                                onApply={applyGenerator}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="px-3 py-2 border-t border-white/5 text-[10px] text-zinc-600">
                {filteredEffects.length} of {effects.length} effects
            </div>
        </div>
    );
}

function EffectCard({
    effect,
    onApply,
}: {
    effect: EffectMeta;
    onApply: (effect: EffectMeta) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const color = CATEGORY_COLORS[effect.category] || "text-zinc-400";
    const icon = CATEGORY_ICONS[effect.category];
    const uniformCount = Object.keys(effect.uniforms).length;

    return (
        <div className="bg-zinc-800/40 border border-white/5 rounded-lg overflow-hidden hover:border-white/10 transition-colors">
            <div
                className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`${color}`}>{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-200 truncate">{effect.name}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{effect.description}</div>
                </div>
                <div className="flex items-center gap-1.5">
                    {effect.animated && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/20">
                            ANIM
                        </span>
                    )}
                    {effect.isGenerator && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-electric-purple/10 text-electric-purple border border-electric-purple/20">
                            GEN
                        </span>
                    )}
                    <ChevronRight
                        className={`w-3 h-3 text-zinc-600 transition-transform ${expanded ? "rotate-90" : ""}`}
                    />
                </div>
            </div>

            {expanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                    {/* Uniform Controls Preview */}
                    <div className="space-y-1">
                        {Object.entries(effect.uniforms).map(([key, u]) => (
                            <div key={key} className="flex items-center justify-between text-[10px]">
                                <span className="text-zinc-500">{u.label}</span>
                                <span className="text-zinc-400 font-mono">
                                    {Array.isArray(u.default)
                                        ? u.default.map((v) => v.toFixed(1)).join(", ")
                                        : typeof u.default === "number"
                                        ? u.default.toFixed(2)
                                        : String(u.default)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Tags */}
                    <div className="flex gap-1 flex-wrap">
                        {effect.tags.map((tag) => (
                            <span
                                key={tag}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/5"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Apply Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onApply(effect);
                        }}
                        className="w-full py-1.5 rounded text-[11px] font-medium bg-electric-purple/20 text-electric-purple border border-electric-purple/30 hover:bg-electric-purple/30 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Play className="w-3 h-3" />
                        {effect.isGenerator ? "Create Surface" : "Apply Effect"}
                    </button>
                </div>
            )}
        </div>
    );
}
