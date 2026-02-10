"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLayerStore, BlendMode } from "@/store/layer-store";
import { useProjectStore } from "@/store/project-store";

// Shaders for compositing
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform sampler2D tBase;
    uniform sampler2D tLayer;
    uniform float opacity;
    uniform int blendMode;
    varying vec2 vUv;

    vec3 blendAdd(vec3 base, vec3 blend) {
        return min(base + blend, 1.0);
    }

    vec3 blendMultiply(vec3 base, vec3 blend) {
        return base * blend;
    }

    vec3 blendScreen(vec3 base, vec3 blend) {
        return 1.0 - ((1.0 - base) * (1.0 - blend));
    }

    vec3 blendOverlay(vec3 base, vec3 blend) {
        return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
    }

    void main() {
        vec4 base = texture2D(tBase, vUv);
        vec4 blend = texture2D(tLayer, vUv);
        
        vec3 color = base.rgb;
        
        if (blendMode == 0) { // Normal
            color = mix(base.rgb, blend.rgb, blend.a * opacity);
        } else if (blendMode == 1) { // Add
            color = blendAdd(base.rgb, blend.rgb * opacity);
        } else if (blendMode == 2) { // Multiply
            color = blendMultiply(base.rgb, mix(vec3(1.0), blend.rgb, opacity));
        } else if (blendMode == 3) { // Screen
            color = blendScreen(base.rgb, blend.rgb * opacity);
        } else if (blendMode == 4) { // Overlay
            color = blendOverlay(base.rgb, mix(vec3(0.5), blend.rgb, opacity));
        }
        
        gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
    }
`;

const BLEND_MODE_MAP: Record<BlendMode, number> = {
    normal: 0,
    add: 1,
    multiply: 2,
    screen: 3,
    overlay: 4,
};

export function LayerCompositor() {
    const { layers } = useLayerStore();
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const { gl, size } = useThree();

    // Create two render targets for ping-ponging
    const [targetA, targetB] = useMemo(() => {
        const createTarget = () => new THREE.WebGLRenderTarget(size.width, size.height, {
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
        });
        return [createTarget(), createTarget()];
    }, [size.width, size.height]);

    // Fullscreen quad for compositing
    const [scene, camera, material, quad] = useMemo(() => {
        const s = new THREE.Scene();
        const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const mat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                tBase: { value: null },
                tLayer: { value: null },
                opacity: { value: 1 },
                blendMode: { value: 0 },
            },
            depthTest: false,
            depthWrite: false,
        });
        const geo = new THREE.PlaneGeometry(2, 2);
        const q = new THREE.Mesh(geo, mat);
        s.add(q);
        return [s, c, mat, q];
    }, []);

    const videoElements = useRef<{ [key: string]: HTMLVideoElement }>({});
    const videoTextures = useRef<{ [key: string]: THREE.VideoTexture }>({});

    // Asset hydration with cleanup
    useEffect(() => {
        // Track which clips are currently active
        const activeClips = new Set<string>();

        layers.forEach((layer) => {
            if (layer.activeClipId) {
                activeClips.add(layer.activeClipId);
                const asset = mediaAssets.find((a) => a.id === layer.activeClipId);

                if (asset && (asset.type === "video" || asset.type === "webcam") && asset.url) {
                    if (!videoElements.current[layer.activeClipId]) {
                        const video = document.createElement("video");
                        video.src = asset.url;
                        video.crossOrigin = "anonymous";
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;

                        // Error handling
                        video.onerror = (e) => {
                            console.error(`Error loading video for layer ${layer.name}:`, e);
                        };

                        video.play().catch((e) => {
                            if (e.name !== "AbortError") console.warn("Video autoplay failed:", e);
                        });

                        videoElements.current[layer.activeClipId] = video;

                        const tex = new THREE.VideoTexture(video);
                        tex.minFilter = THREE.LinearFilter;
                        tex.magFilter = THREE.LinearFilter;
                        tex.format = THREE.RGBAFormat;
                        videoTextures.current[layer.activeClipId] = tex;
                    }
                }
            }
        });

        // Cleanup inactive clips
        Object.keys(videoElements.current).forEach((clipId) => {
            if (!activeClips.has(clipId)) {
                // Remove video element
                const video = videoElements.current[clipId];
                video.pause();
                video.src = "";
                video.load();
                delete videoElements.current[clipId];

                // Dispose texture
                const tex = videoTextures.current[clipId];
                if (tex) {
                    tex.dispose();
                    delete videoTextures.current[clipId];
                }
            }
        });

    }, [layers, mediaAssets]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(videoElements.current).forEach(video => {
                video.pause();
                video.src = "";
                video.load();
            });
            Object.values(videoTextures.current).forEach(tex => tex.dispose());
            targetA.dispose();
            targetB.dispose();
        };
    }, [targetA, targetB]);

    // Main compositing frame loop
    useFrame(({ gl }) => {
        let currentRead = targetA;
        let currentWrite = targetB;

        // Clear targetA initially (acting as the starting blackboard)
        gl.setRenderTarget(currentRead);
        gl.setClearColor(0x000000, 0);
        gl.clear();

        layers.forEach((layer) => {
            if (!layer.visible || !layer.activeClipId) return;

            const videoTex = videoTextures.current[layer.activeClipId];
            if (!videoTex) return;

            // Sync speed
            const video = videoElements.current[layer.activeClipId];
            if (video) video.playbackRate = layer.speed;

            // Prepare shader for this layer
            material.uniforms.tBase.value = currentRead.texture;
            material.uniforms.tLayer.value = videoTex;
            material.uniforms.opacity.value = layer.opacity;
            material.uniforms.blendMode.value = BLEND_MODE_MAP[layer.blendMode];

            // Render to write target
            gl.setRenderTarget(currentWrite);
            gl.render(scene, camera);

            // Swap targets
            [currentRead, currentWrite] = [currentWrite, currentRead];
        });

        // Final result is now in currentRead.texture
        // Expose to window for surfaces to pick up
        // @ts-ignore
        window.compositionTexture = currentRead.texture;

        // Reset render target for standard fiber rendering
        gl.setRenderTarget(null);
    });

    return null;
}
