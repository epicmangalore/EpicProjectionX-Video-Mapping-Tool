/**
 * EffectsLibrary - Loader and manager for the pre-bundled effects library.
 * Fetches manifest.json, loads GLSL shaders on demand, and provides
 * search/filter capabilities for the EffectsBrowser UI.
 */

export interface UniformDef {
    type: "float" | "vec2" | "vec3" | "color";
    default: number | number[];
    min?: number;
    max?: number;
    label: string;
}

export interface EffectMeta {
    id: string;
    name: string;
    category: string;
    description: string;
    shader: string;
    isGenerator: boolean;
    animated?: boolean;
    uniforms: Record<string, UniformDef>;
    tags: string[];
}

export interface CategoryMeta {
    id: string;
    name: string;
    icon: string;
    description: string;
}

interface Manifest {
    version: string;
    name: string;
    categories: CategoryMeta[];
    effects: EffectMeta[];
}

class EffectsLibrary {
    private manifest: Manifest | null = null;
    private shaderCache: Map<string, string> = new Map();
    private loading: Promise<Manifest> | null = null;
    private basePath = "/effects-library";

    /** Load the manifest. Cached after first call. */
    async loadManifest(): Promise<Manifest> {
        if (this.manifest) return this.manifest;
        if (this.loading) return this.loading;

        this.loading = fetch(`${this.basePath}/manifest.json`)
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load effects manifest: ${res.status}`);
                return res.json();
            })
            .then((data: Manifest) => {
                this.manifest = data;
                return data;
            });

        return this.loading;
    }

    /** Get all categories. */
    async getCategories(): Promise<CategoryMeta[]> {
        const m = await this.loadManifest();
        return m.categories;
    }

    /** Get all effects, optionally filtered by category. */
    async getEffects(categoryId?: string): Promise<EffectMeta[]> {
        const m = await this.loadManifest();
        if (!categoryId) return m.effects;
        return m.effects.filter((e) => e.category === categoryId);
    }

    /** Get a single effect by ID. */
    async getEffect(id: string): Promise<EffectMeta | undefined> {
        const m = await this.loadManifest();
        return m.effects.find((e) => e.id === id);
    }

    /** Search effects by name, description, or tags. */
    async searchEffects(query: string): Promise<EffectMeta[]> {
        const m = await this.loadManifest();
        const q = query.toLowerCase();
        return m.effects.filter(
            (e) =>
                e.name.toLowerCase().includes(q) ||
                e.description.toLowerCase().includes(q) ||
                e.tags.some((t) => t.includes(q))
        );
    }

    /** Load and cache a GLSL shader source. */
    async loadShader(effectId: string): Promise<string> {
        const cached = this.shaderCache.get(effectId);
        if (cached) return cached;

        const effect = await this.getEffect(effectId);
        if (!effect) throw new Error(`Effect not found: ${effectId}`);

        const res = await fetch(`${this.basePath}/${effect.shader}`);
        if (!res.ok) throw new Error(`Failed to load shader: ${effect.shader}`);

        const source = await res.text();
        this.shaderCache.set(effectId, source);
        return source;
    }

    /** Get default uniform values for an effect as a flat object. */
    getDefaultUniforms(effect: EffectMeta): Record<string, number | number[]> {
        const result: Record<string, number | number[]> = {};
        for (const [key, def] of Object.entries(effect.uniforms)) {
            result[key] = def.default;
        }
        return result;
    }
}

// Singleton instance
export const effectsLibrary = new EffectsLibrary();
