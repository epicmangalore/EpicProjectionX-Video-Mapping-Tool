"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface as SurfaceType } from "@/store/project-store";
import { useProjectStore, type Vector2 } from "@/store/project-store";
import { useEffectsStore, defaultEffectSettings } from "@/store/effects-store";
import { useTimelineStore } from "@/store/timeline-store";
import { useAudioStore } from "@/store/audio-store";
import { useUIStore } from "@/store/ui-store";

// Import shaders and utils
import vertexShader from "@/shaders/surface.vert.glsl";
import fragmentShader from "@/shaders/surface.frag.glsl";
import { getPerspectiveTransform } from "@/lib/matrix";
import { useOutputStore } from "@/store/output-store";
import { ResizeHandles } from "./ResizeHandles";
import { MeshWarp } from "./MeshWarp";
import { PenTool } from "./PenTool";
import { SurfaceBorder } from "./SurfaceBorder";
import { useSnapping } from "@/hooks/useSnapping";

interface SurfaceProps {
    surface: SurfaceType;
}

export function Surface({ surface }: SurfaceProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const lastTimelineTimeRef = useRef(0);

    const selectSurface = useProjectStore((state) => state.selectSurface);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);
    const isPlayingGlobal = useTimelineStore((state) => state.isPlaying);
    const toolMode = useUIStore((state) => state.toolMode);
    const penSubMode = useUIStore((state) => state.penSubMode);
    const projectSettings = useProjectStore((state) => state.projectSettings);
    const isOutput = useOutputStore((state) => state.isOutput);
    const { prepareSnap, checkSnap, clearSnap } = useSnapping();

    const isSelected = selectedIds.includes(surface.id);
    const effects = surfaceEffects[surface.id] || defaultEffectSettings;

    // Aggregate stackable effects from new FX system
    const aggregatedFX = useMemo(() => {
        const result = {
            brightness: effects.brightness,
            contrast: effects.contrast,
            saturation: effects.saturation,
            hue: effects.hue,
            blur: effects.blur,
            chromatic: effects.chromaticAberration,
            rgbShift: effects.rgbShift,
        };

        (surface.effects || []).forEach((fx) => {
            if (!fx.enabled) return;
            const amount = fx.params.amount ?? 0;
            switch (fx.type) {
                case "brightness": result.brightness += amount; break;
                case "contrast": result.contrast += amount; break;
                case "saturation": result.saturation += amount; break;
                case "hue": result.hue += amount; break;
                case "blur": result.blur += amount; break;
                case "chromatic": result.chromatic += amount; break;
                case "rgbShift": result.rgbShift += amount; break;
            }
        });

        return result;
    }, [effects, surface.effects]);

    // Get media asset
    const mediaAsset = useMemo(() => {
        if (!surface.mediaId) return null;
        return mediaAssets.find((a) => a.id === surface.mediaId);
    }, [surface.mediaId, mediaAssets]);

    // Get shader effects if any
    const shaderEffects = useMemo(() => {
        if (!surface.shaderEffectIds || surface.shaderEffectIds.length === 0) return [];
        return surface.shaderEffectIds
            .map(id => mediaAssets.find(a => a.id === id))
            .filter((a): a is NonNullable<typeof a> => a !== undefined && a.type === "shader");
    }, [surface.shaderEffectIds, mediaAssets]);

    // Manage Video/Webcam elements
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(undefined);

    const updateMediaAsset = useProjectStore((state) => state.updateMediaAsset);

    // Hydrate Blob URLs for Output Window AND Editor (persistence fix)
    useEffect(() => {
        if (!mediaAsset) {
            console.log("🔴 No mediaAsset");
            setResolvedUrl(undefined);
            return;
        }

        const url = mediaAsset.url;
        console.log("🔵 Media asset URL check:", { name: mediaAsset.name, url, type: mediaAsset.type });

        if (!url) {
            console.log("🔴 No URL for media asset:", mediaAsset.name);
            setResolvedUrl(undefined);
            return;
        }

        // Always use blob URLs directly - don't validate with HEAD request
        // Blob URLs don't support HEAD requests, so the check always fails
        if (url.startsWith("blob:")) {
            console.log("✅ Using blob URL directly:", url.substring(0, 50) + "...");
            setResolvedUrl(url);
        } else {
            console.log("✅ Using HTTP/HTTPS URL directly:", url);
            setResolvedUrl(url);
        }
    }, [mediaAsset, updateMediaAsset]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!mediaAsset || !resolvedUrl) {
            console.log("No media or URL:", { mediaAsset: mediaAsset?.name, resolvedUrl });
            return;
        }

        if (mediaAsset.type === "video") {
            console.log("Creating video element for:", mediaAsset.name, "URL:", resolvedUrl);
            const video = document.createElement("video");
            video.src = resolvedUrl;
            video.crossOrigin = "anonymous";
            video.loop = true;
            video.muted = true;
            video.playsInline = true;

            // Important for long videos: preload metadata
            video.preload = "auto";

            const onLoadedMetadata = () => {
                console.log("✓ Video metadata loaded:", mediaAsset.name, "Duration:", video.duration);
            };

            const onCanPlay = () => {
                console.log("✓ Video can play:", mediaAsset.name);
                if (isPlayingGlobal) {
                    video.play().catch(err => console.warn("Auto-play on canplay failed:", err));
                }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const onError = (e: any) => {
                console.error("✗ Video error for", mediaAsset.name, ":", video.error, e);
            };

            const onLoadStart = () => {
                console.log("→ Video load started:", mediaAsset.name);
            };

            const onPlaying = () => {
                console.log("▶ Video is playing:", mediaAsset.name);
            };

            const onWaiting = () => {
                console.log("⏸ Video is waiting/buffering:", mediaAsset.name);
            };

            video.addEventListener("loadedmetadata", onLoadedMetadata);
            video.addEventListener("canplay", onCanPlay);
            video.addEventListener("error", onError);
            video.addEventListener("loadstart", onLoadStart);
            video.addEventListener("playing", onPlaying);
            video.addEventListener("waiting", onWaiting);

            setVideoElement(video);
            videoRef.current = video;

            return () => {
                console.log("Cleaning up video element:", mediaAsset.name);
                video.removeEventListener("loadedmetadata", onLoadedMetadata);
                video.removeEventListener("canplay", onCanPlay);
                video.removeEventListener("error", onError);
                video.removeEventListener("loadstart", onLoadStart);
                video.removeEventListener("playing", onPlaying);
                video.removeEventListener("waiting", onWaiting);
                video.pause();
                video.src = "";
                video.load(); // Release memory
                setVideoElement(null);
            };
        }

        if (mediaAsset.type === "webcam") {
            const startWebcam = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
                    });
                    const video = document.createElement("video");
                    video.srcObject = stream;
                    video.autoplay = true;
                    video.playsInline = true;
                    video.muted = true;
                    await video.play().catch(e => console.warn("Video play failed", e));

                    setVideoElement(video);
                    videoRef.current = video;
                    streamRef.current = stream;
                } catch (e) {
                    console.error("Webcam failed", e);
                }
            };
            startWebcam();
            return () => {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                }
                setVideoElement(null);
            };
        }
    }, [mediaAsset?.id, mediaAsset?.type, resolvedUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    // Separate effect to handle play/pause based on global playback state
    useEffect(() => {
        const video = videoElement ?? videoRef.current;
        if (!video) return;

        console.log("Playback state changed:", isPlayingGlobal, "for video:", mediaAsset?.name);

        if (isPlayingGlobal) {
            if (video.readyState >= 3) {
                video.play().catch(err => {
                    console.warn("Play failed:", err);
                });
            } else {
                console.log("Video not ready yet, waiting for canplay event");
            }
        } else {
            video.pause();
        }
    }, [isPlayingGlobal, mediaAsset?.name, videoElement]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle force video sync event
    useEffect(() => {
        const video = videoElement ?? videoRef.current;
        if (!video || mediaAsset?.type !== "video") return;

        const handleForceSync = (e: Event) => {
            const customEvent = e as CustomEvent<{ time: number }>;
            const targetTime = customEvent.detail.time;

            console.log("Force syncing video:", mediaAsset?.name, "to time:", targetTime);

            // Set video time
            video.currentTime = targetTime;

            // If should be playing, ensure it's playing
            if (isPlayingGlobal && video.paused) {
                video.play().catch(err => {
                    console.warn("Play failed during sync:", err);
                });
            }
        };

        window.addEventListener("force-video-sync", handleForceSync);

        return () => {
            window.removeEventListener("force-video-sync", handleForceSync);
        };
    }, [mediaAsset?.type, mediaAsset?.name, videoElement, isPlayingGlobal]);

    // Create texture from media
    const texture = useMemo(() => {
        // PRIORITY 1: Global Mixed Composition
        if (surface.useComposition && (window as any).compositionTexture) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return (window as any).compositionTexture; // eslint-disable-line @typescript-eslint/no-explicit-any
        }

        if (!mediaAsset) return null;

        if (mediaAsset.type === "color") {
            const canvas = document.createElement("canvas");
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext("2d");
            if (ctx && mediaAsset.color) {
                ctx.fillStyle = mediaAsset.color;
                ctx.fillRect(0, 0, 64, 64);
            }
            return new THREE.CanvasTexture(canvas);
        }

        if (mediaAsset.type === "image" && resolvedUrl) {
            const loader = new THREE.TextureLoader();
            return loader.load(resolvedUrl);
        }

        if ((mediaAsset.type === "video" || mediaAsset.type === "webcam") && videoElement) {
            const tex = new THREE.VideoTexture(videoElement);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.format = THREE.RGBAFormat;
            tex.needsUpdate = true;
            return tex;
        }

        if (mediaAsset.type === "text") {
            const canvas = document.createElement("canvas");
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const text = mediaAsset.text || mediaAsset.name || "Text";
                const fontSize = mediaAsset.fontSize || 80;
                const fontFamily = mediaAsset.fontFamily || "sans-serif";
                const fontWeight = mediaAsset.fontWeight || "normal";
                const fontStyle = mediaAsset.fontStyle || "normal";
                const lineHeight = mediaAsset.lineHeight || 1.2;
                if (mediaAsset.letterSpacing) (ctx as any).letterSpacing = `${mediaAsset.letterSpacing}px`; // eslint-disable-line @typescript-eslint/no-explicit-any

                ctx.fillStyle = mediaAsset.textColor || "#ffffff";
                ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
                ctx.textBaseline = "middle";

                const textAlign = mediaAsset.textAlign || "center";
                ctx.textAlign = textAlign;

                const x = textAlign === "left" ? 50 : textAlign === "right" ? 974 : 512;
                let y = 512;

                const lines = text.split('\n');
                const totalHeight = lines.length * (fontSize * lineHeight);
                y -= totalHeight / 2;

                lines.forEach((line, i) => {
                    ctx.fillText(line, x, y + i * (fontSize * lineHeight) + (fontSize * lineHeight) / 2);
                });
            }
            const tex = new THREE.CanvasTexture(canvas);
            return tex;
        }

        return null;
    }, [mediaAsset, videoElement, resolvedUrl, surface.useComposition, isPlayingGlobal]); // eslint-disable-line react-hooks/exhaustive-deps

    // Calculate warping matrix or polygon geometry
    const isQuad = surface.corners.length === 4;

    // Calculate warping matrix for corner-pin (only for quads)
    const warpMatrix = useMemo(() => {
        if (!isQuad) return new THREE.Matrix4();
        const matrix = getPerspectiveTransform(
            surface.corners as [Vector2, Vector2, Vector2, Vector2],
            surface.sourceCorners as [Vector2, Vector2, Vector2, Vector2]
        );
        return new THREE.Matrix4().fromArray(matrix);
    }, [surface.corners, surface.sourceCorners, isQuad]);

    // Create custom geometry for polygons
    const polygonGeometry = useMemo(() => {
        if (isQuad && !surface.meshWarp) return null; // Use PlaneGeometry for quads

        const shape = new THREE.Shape();
        surface.corners.forEach((p, i) => {
            if (i === 0) shape.moveTo(p.x, p.y);
            else shape.lineTo(p.x, p.y);
        });
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);

        // Find bounding box of original corners
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        surface.corners.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        const width = maxX - minX || 1;
        const height = maxY - minY || 1;

        // Map UVs based on position within bounding box
        // This ensures texture coordinates match the corner positions
        const uvAttribute = geometry.attributes.uv;
        const posAttribute = geometry.attributes.position;

        for (let i = 0; i < uvAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i);

            // For N-gons, we need to interpolate the UVs based on sourceCorners.
            // A simple way is to use the same min/max bounding box logic but mapped to the sourceCorners bounds.
            // However, MapClub allows arbitrary UVs for each vertex.
            // So we should find which "triangle" or barycentric coord this point belongs to.
            // Simplified: Use the original bounding box mapping but allow stretching.

            // Map to 0-1 range based on Target bounding box
            const tx = (x - minX) / width;
            const ty = (y - minY) / height;

            // Find source bounding box
            let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
            surface.sourceCorners.forEach(p => {
                sMinX = Math.min(sMinX, p.x);
                sMinY = Math.min(sMinY, p.y);
                sMaxX = Math.max(sMaxX, p.x);
                sMaxY = Math.max(sMaxY, p.y);
            });

            const sWidth = sMaxX - sMinX || 1;
            const sHeight = sMaxY - sMinY || 1;

            uvAttribute.setXY(i, (x - minX) / width, (y - minY) / height);
        }

        uvAttribute.needsUpdate = true;

        return geometry;
    }, [surface.corners, isQuad, surface.meshWarp]); // eslint-disable-line react-hooks/exhaustive-deps

    // Calculate texture matrix
    const textureMatrix = useMemo(() => {
        const matrix = new THREE.Matrix3();
        if (!mediaAsset || !surface.corners || surface.corners.length < 3) return matrix;

        // For global mapping, we use identity matrix to avoid double-transformation
        if (surface.compositionMapping === "global" || (surface.useComposition && (window as any).compositionTexture)) return matrix;

        // Default settings
        const settings = surface.textureSettings || {
            fit: "stretch",
            scale: { x: 1, y: 1 },
            offset: { x: 0, y: 0 },
            rotation: 0,
            flipX: false,
            flipY: false
        };

        // 1. Get Surface Aspect Ratio
        // Simplify: use bounding box of corners for aspect ratio
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        surface.corners.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        const surfaceWidth = maxX - minX;
        const surfaceHeight = maxY - minY;
        const surfaceAspect = surfaceWidth / surfaceHeight;

        // 2. Get Media Aspect Ratio
        let mediaAspect = 1;
        if (mediaAsset.width && mediaAsset.height) {
            mediaAspect = mediaAsset.width / mediaAsset.height;
        }

        // 3. Calculate Scale based on Fit Mode
        let sx = 1;
        let sy = 1;

        if (settings.fit === "cover") {
            if (surfaceAspect > mediaAspect) {
                // Surface is wider than media: Fit to width, crop height
                // To crop height, we need to show LESS vertical UV.
                // Scale < 1 means shrinking the UV space (zooming in on the texture).
                sy = mediaAspect / surfaceAspect;
            } else {
                // Surface is taller than media: Fit to height, crop width
                sx = surfaceAspect / mediaAspect;
            }
        } else if (settings.fit === "contain") {
            if (surfaceAspect > mediaAspect) {
                // Surface is wider: Fit to height, letterbox width
                // To show MORE width (black bars), we need to show MORE UV horizontal space.
                // Scale > 1 means expanding UV space (zooming out).
                sx = surfaceAspect / mediaAspect;
            } else {
                sy = mediaAspect / surfaceAspect;
            }
        }

        // 4. Apply Manual Transforms
        sx /= settings.scale?.x || 1;
        sy /= settings.scale?.y || 1;

        // Flip
        if (settings.flipX) sx *= -1;
        if (settings.flipY) sy *= -1;

        // Center correction for scaling/rotation
        matrix.translate(-0.5, -0.5);

        // Rotation
        const rot = (settings.rotation || 0) * (Math.PI / 180);
        matrix.rotate(-rot); // Rotate UVs opposite to image rotation

        // Scale
        matrix.scale(sx, sy);

        // Offset (Move UVs opposite to desired image movement)
        matrix.translate(-(settings.offset?.x || 0), -(settings.offset?.y || 0));

        // Restore center
        matrix.translate(0.5, 0.5);

        return matrix;
    }, [surface.corners, mediaAsset, surface.textureSettings, surface.compositionMapping, surface.useComposition]);

    // Create shader material with uniforms - MEMOIZED to prevent recreation
    const shaderMaterial = useMemo(() => {
        if (!texture) return null;

        // Check if we should use a shader effect instead
        // For now, we only apply the first effect (full compositing TODO)
        let effectShader = fragmentShader;
        const effectUniforms: Record<string, { value: number | THREE.Vector2 | THREE.Vector3 | THREE.Texture }> = {};

        if (shaderEffects.length > 0) {
            const firstEffect = shaderEffects[0];
            if (firstEffect.shaderSource && firstEffect.uniforms) {
                // Use the effect's shader
                effectShader = firstEffect.shaderSource;

                // Convert effect uniforms to THREE.js uniform format
                Object.entries(firstEffect.uniforms).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        if (value.length === 2) {
                            effectUniforms[key] = { value: new THREE.Vector2(value[0], value[1]) };
                        } else if (value.length === 3) {
                            effectUniforms[key] = { value: new THREE.Vector3(value[0], value[1], value[2]) };
                        }
                    } else {
                        effectUniforms[key] = { value };
                    }
                });

                // Add texture uniform for the effect to use
                effectUniforms.uTexture = { value: texture };
                effectUniforms.uTime = { value: 0 }; // For animated effects
            }
        }

        // Always include all standard uniforms, plus any effect-specific ones
        const allUniforms = {
            uTexture: { value: texture },
            uTextureMatrix: { value: textureMatrix },
            uOpacity: { value: surface.opacity },
            uBrightness: { value: aggregatedFX.brightness },
            uContrast: { value: aggregatedFX.contrast },
            uSaturation: { value: aggregatedFX.saturation },
            uHue: { value: aggregatedFX.hue },
            uColorTint: {
                value: new THREE.Vector3(
                    effects.colorTint.r,
                    effects.colorTint.g,
                    effects.colorTint.b
                )
            },
            uBlurAmount: { value: aggregatedFX.blur },
            uChromaticAberration: { value: aggregatedFX.chromatic },
            uRGBShift: { value: aggregatedFX.rgbShift },
            uWarpMatrix: { value: warpMatrix },
            uBlendZones: {
                value: new THREE.Vector4(
                    effects.blendLeft,
                    effects.blendRight,
                    effects.blendTop,
                    effects.blendBottom
                )
            },
            uBlendFeather: { value: effects.blendFeather },
            uBlendGamma: { value: effects.blendGamma },
            uMasterOpacity: { value: projectSettings.masterOpacity },
            uMasterBrightness: { value: projectSettings.masterBrightness },
            uBlackout: { value: projectSettings.blackout ? 1.0 : 0.0 },
            uMappingMode: { value: surface.compositionMapping === "global" ? 1.0 : 0.0 },
            uProjectResolution: {
                value: new THREE.Vector2(
                    projectSettings.resolution.width,
                    projectSettings.resolution.height
                )
            },
            ...effectUniforms, // Effect-specific uniforms override if present
        };

        // Map blend mode to Three.js constants
        let blending: THREE.Blending = THREE.NormalBlending;
        if (surface.blendMode === "multiply") blending = THREE.MultiplyBlending;
        else if (surface.blendMode === "additive") blending = THREE.AdditiveBlending;
        else if (surface.blendMode === "screen" || surface.blendMode === "overlay") blending = THREE.CustomBlending;

        const mat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader: effectShader,
            uniforms: allUniforms,
            transparent: true,
            blending: blending,
            side: THREE.DoubleSide,
            depthWrite: false, // Ensure transparency works correctly in stacks
        });

        // Screen/Overlay factors
        if (surface.blendMode === "screen") {
            mat.blendSrc = THREE.OneFactor;
            mat.blendDst = THREE.OneMinusSrcColorFactor;
            mat.blendEquation = THREE.AddEquation;
        } else if (surface.blendMode === "overlay") {
            // Fallback for overlay
            mat.blendSrc = THREE.SrcAlphaFactor;
            mat.blendDst = THREE.OneMinusSrcAlphaFactor;
            mat.blendEquation = THREE.AddEquation;
        }

        return mat;
    }, [texture, surface.compositionMapping, projectSettings.resolution, shaderEffects, aggregatedFX, surface.opacity, surface.blendMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update mesh geometry for MeshWarp
    // Helper for cubic bezier interpolation
    const bezier = (p0: Vector2, c0: Vector2, c1: Vector2, p1: Vector2, t: number): Vector2 => {
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        return {
            x: mt3 * p0.x + 3 * mt2 * t * c0.x + 3 * mt * t2 * c1.x + t3 * p1.x,
            y: mt3 * p0.y + 3 * mt2 * t * c0.y + 3 * mt * t2 * c1.y + t3 * p1.y,
        };
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculateWarpAtUV = (u: number, v: number, gridSize: number, controlPoints: any[][]): Vector2 => {
        // Find which cell we are in
        const gu = Math.max(0, Math.min(gridSize - 0.0001, u * gridSize));
        const gv = Math.max(0, Math.min(gridSize - 0.0001, v * gridSize));
        const ix = Math.floor(gu);
        const iy = Math.floor(gridSize - 1 - gv); // Flip V for grid array (row 0 is top)
        const tu = gu - ix;
        const tv = 1 - (gv - (gridSize - 1 - iy)); // Back to local V in [0, 1] top-to-bottom

        const p00 = controlPoints[iy][ix];
        const p10 = controlPoints[iy][ix + 1];
        const p01 = controlPoints[iy + 1][ix];
        const p11 = controlPoints[iy + 1][ix + 1];

        // Edge curves
        const top = bezier(p00.position,
            { x: p00.position.x + (p00.handleRight?.x || 0), y: p00.position.y + (p00.handleRight?.y || 0) },
            { x: p10.position.x + (p10.handleLeft?.x || 0), y: p10.position.y + (p10.handleLeft?.y || 0) },
            p10.position, tu);

        const bottom = bezier(p01.position,
            { x: p01.position.x + (p01.handleRight?.x || 0), y: p01.position.y + (p01.handleRight?.y || 0) },
            { x: p11.position.x + (p11.handleLeft?.x || 0), y: p11.position.y + (p11.handleLeft?.y || 0) },
            p11.position, tu);

        const left = bezier(p00.position,
            { x: p00.position.x + (p00.handleBottom?.x || 0), y: p00.position.y + (p00.handleBottom?.y || 0) },
            { x: p01.position.x + (p01.handleTop?.x || 0), y: p01.position.y + (p01.handleTop?.y || 0) },
            p01.position, tv);

        const right = bezier(p10.position,
            { x: p10.position.x + (p10.handleBottom?.x || 0), y: p10.position.y + (p10.handleBottom?.y || 0) },
            { x: p11.position.x + (p11.handleTop?.x || 0), y: p11.position.y + (p11.handleTop?.y || 0) },
            p11.position, tv);

        // Bilinear interpolation of corners
        const bX = (1 - tu) * (1 - tv) * p00.position.x + tu * (1 - tv) * p10.position.x +
            (1 - tu) * tv * p01.position.x + tu * tv * p11.position.x;
        const bY = (1 - tu) * (1 - tv) * p00.position.y + tu * (1 - tv) * p10.position.y +
            (1 - tu) * tv * p01.position.y + tu * tv * p11.position.y;

        // Coons Patch Formula
        return {
            x: (1 - tv) * top.x + tv * bottom.x + (1 - tu) * left.x + tu * right.x - bX,
            y: (1 - tv) * top.y + tv * bottom.y + (1 - tu) * left.y + tu * right.y - bY
        };
    };

    useEffect(() => {
        if (!meshRef.current || !surface.meshWarp) return;

        const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
        const { gridSize, controlPoints } = surface.meshWarp;

        const res = 24; // High res for smooth bezier curves

        if (geometry.parameters.widthSegments !== res || geometry.parameters.heightSegments !== res) {
            meshRef.current.geometry = new THREE.PlaneGeometry(1, 1, res, res);
            return;
        }

        const positions = geometry.attributes.position;
        const count = positions.count;

        for (let i = 0; i < count; i++) {
            const xIdx = i % (res + 1);
            const yIdx = Math.floor(i / (res + 1));

            const u = xIdx / res;
            const v = 1 - yIdx / res;

            const pos = calculateWarpAtUV(u, v, gridSize, controlPoints);
            positions.setXY(i, pos.x, pos.y);
        }
        positions.needsUpdate = true;
    }, [surface.meshWarp, surface.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update mesh transform and uniforms
    useFrame(() => {
        if (!meshRef.current) return;


        // Throttled Timeline/State access
        const timelineState = useTimelineStore.getState();
        const currentTime = timelineState.currentTime;

        // CRITICAL: Update composition texture every frame
        // The compositor pings-pongs between two targets, so the texture instance changes every frame.
        // We must update the uniform to point to the latest 'read' texture.
        if (surface.useComposition && (window as any).compositionTexture && shaderMaterial) { // eslint-disable-line @typescript-eslint/no-explicit-any
            shaderMaterial.uniforms.uTexture.value = (window as any).compositionTexture; // eslint-disable-line @typescript-eslint/no-explicit-any
        }

        // CRITICAL: Update video texture only when playing or seeking + sync with timeline
        if (texture && texture instanceof THREE.VideoTexture && videoElement) {
            // Only force texture update if video is actually playing or seeking to save massive GPU bandwidth
            const isPlaying = !videoElement.paused && !videoElement.ended;
            if (isPlaying || videoElement.seeking) {
                texture.needsUpdate = true;
            }

            // Sync video currentTime with timeline position
            if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
                const targetTime = currentTime;
                const videoTime = videoElement.currentTime;
                const drift = videoTime - targetTime;
                const absDrift = Math.abs(drift);

                // Detect massive jumps (scrubbing or loop)
                const timelineJump = Math.abs(currentTime - lastTimelineTimeRef.current);
                const isScrubbing = timelineJump > 0.5;

                if (isScrubbing || absDrift > 0.5) {
                    // Major drift or scrubbing: Hard seek is necessary
                    videoElement.currentTime = targetTime;
                    videoElement.playbackRate = 1.0;
                } else if (isPlayingGlobal && absDrift > 0.03) {
                    // Minor drift (> 30ms): Adjust playback rate to catch up smoothly
                    // This prevents the "stutter" or "stuck" feel caused by frequent seeking
                    if (drift > 0) {
                        // Video is ahead, slow down slightly
                        videoElement.playbackRate = 0.95;
                    } else {
                        // Video is behind, speed up slightly
                        videoElement.playbackRate = 1.05;
                    }
                } else if (!isPlayingGlobal && absDrift > 0.01) {
                    // When paused, maintain exact sync for preview
                    videoElement.currentTime = targetTime;
                } else {
                    // In sync: Reset playback rate to normal
                    if (videoElement.playbackRate !== 1.0) {
                        videoElement.playbackRate = 1.0;
                    }
                }
            }
            lastTimelineTimeRef.current = currentTime;
        }

        // Timeline Visibility Check
        if (groupRef.current) {
            const endTime = surface.startTime + surface.duration;
            const isInTimeRange = currentTime >= surface.startTime && currentTime < endTime;

            // Only override visibility if surface is "globally" visible (eye icon on)
            if (surface.visible) {
                if (groupRef.current.visible !== isInTimeRange) {
                    groupRef.current.visible = isInTimeRange;
                }
            } else {
                if (groupRef.current.visible) {
                    groupRef.current.visible = false;
                }
            }
        }

        // Apply audio mappings if enabled (Throttled or simplified)
        let reactiveOpacity = surface.opacity;
        let reactiveBlur = effects.blur;
        let reactiveChromatic = effects.chromaticAberration;
        let reactiveBrightness = effects.brightness;
        let reactiveContrast = effects.contrast;
        let reactiveSaturation = effects.saturation;
        let reactiveHue = effects.hue;
        let reactiveRgbShift = effects.rgbShift;
        let reactiveColorTintR = effects.colorTint.r;
        let reactiveColorTintG = effects.colorTint.g;
        let reactiveColorTintB = effects.colorTint.b;
        let reactiveScaleX = 1;
        let reactiveScaleY = 1;
        let reactiveRotation = 0;
        let reactivePositionX = 0;
        let reactivePositionY = 0;

        if (surface.audioMappings.length > 0) {
            const audioState = useAudioStore.getState();
            const levels = audioState.levels as any; // eslint-disable-line @typescript-eslint/no-explicit-any

            surface.audioMappings.forEach(mapping => {
                if (!mapping.enabled) return;
                const level = levels[mapping.band] || 0;
                const value = mapping.min + (mapping.max - mapping.min) * level;

                // Existing properties
                if (mapping.property === "opacity") reactiveOpacity = value;
                if (mapping.property === "blur") reactiveBlur = value;
                if (mapping.property === "chromatic") reactiveChromatic = value;

                // New shader-based properties
                if (mapping.property === "brightness") reactiveBrightness = value;
                if (mapping.property === "contrast") reactiveContrast = value;
                if (mapping.property === "saturation") reactiveSaturation = value;
                if (mapping.property === "hue") reactiveHue = value;
                if (mapping.property === "rgbShift") reactiveRgbShift = value;

                // Color tint channels
                if (mapping.property === "colorTint.r") reactiveColorTintR = value;
                if (mapping.property === "colorTint.g") reactiveColorTintG = value;
                if (mapping.property === "colorTint.b") reactiveColorTintB = value;

                // Transform-based properties (additive)
                if (mapping.property === "scale") {
                    reactiveScaleX = value;
                    reactiveScaleY = value;
                }
                if (mapping.property === "scale.x") reactiveScaleX = value;
                if (mapping.property === "scale.y") reactiveScaleY = value;
                if (mapping.property === "rotation") reactiveRotation += value; // Additive rotation
                if (mapping.property === "position.x") reactivePositionX += value; // Additive position
                if (mapping.property === "position.y") reactivePositionY += value;
            });
        }

        // Apply transform-based audio reactivity to group
        if (groupRef.current && (reactiveScaleX !== 1 || reactiveScaleY !== 1 || reactiveRotation !== 0 || reactivePositionX !== 0 || reactivePositionY !== 0)) {
            groupRef.current.scale.set(surface.scale.x * reactiveScaleX, surface.scale.y * reactiveScaleY, 1);
            groupRef.current.rotation.z = surface.rotation + reactiveRotation;
            groupRef.current.position.set(surface.position.x + reactivePositionX, surface.position.y + reactivePositionY, 0);
        }

        if (shaderMaterial) {
            // Efficiently update uniforms without recompiling shader
            const uniforms = shaderMaterial.uniforms;

            // Allow for optimized updates by modifying uniform values directly
            if (uniforms.uTextureMatrix) uniforms.uTextureMatrix.value.copy(textureMatrix);
            if (uniforms.uWarpMatrix) uniforms.uWarpMatrix.value.copy(warpMatrix);
            if (uniforms.uOpacity) uniforms.uOpacity.value = reactiveOpacity;
            if (uniforms.uBrightness) uniforms.uBrightness.value = reactiveBrightness;
            if (uniforms.uContrast) uniforms.uContrast.value = reactiveContrast;
            if (uniforms.uSaturation) uniforms.uSaturation.value = reactiveSaturation;
            if (uniforms.uHue) uniforms.uHue.value = reactiveHue;

            if (uniforms.uColorTint) {
                uniforms.uColorTint.value.set(
                    reactiveColorTintR,
                    reactiveColorTintG,
                    reactiveColorTintB
                );
            }

            if (uniforms.uBlurAmount) uniforms.uBlurAmount.value = reactiveBlur;
            if (uniforms.uChromaticAberration) uniforms.uChromaticAberration.value = reactiveChromatic;
            if (uniforms.uRGBShift) uniforms.uRGBShift.value = reactiveRgbShift;

            // Update Blend Uniforms
            if (uniforms.uBlendZones) {
                uniforms.uBlendZones.value.set(
                    effects.blendLeft,
                    effects.blendRight,
                    effects.blendTop,
                    effects.blendBottom
                );
            }
            if (uniforms.uBlendFeather) uniforms.uBlendFeather.value = effects.blendFeather;
            if (uniforms.uBlendGamma) uniforms.uBlendGamma.value = effects.blendGamma;

            // Global controls
            if (uniforms.uMasterOpacity) uniforms.uMasterOpacity.value = projectSettings.masterOpacity;
            if (uniforms.uMasterBrightness) uniforms.uMasterBrightness.value = projectSettings.masterBrightness;

            // Update time for shader effects (animated effects)
            if (uniforms.uTime) uniforms.uTime.value = currentTime;
            if (uniforms.uBlackout) uniforms.uBlackout.value = projectSettings.blackout ? 1.0 : 0.0;

            // Mapping controls
            if (uniforms.uMappingMode) uniforms.uMappingMode.value = (surface.compositionMapping === "global" ? 1 : 0);
            if (uniforms.uProjectResolution) {
                uniforms.uProjectResolution.value.set(
                    projectSettings.resolution.width,
                    projectSettings.resolution.height
                );
            }
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClick = (e: any) => {
        if (surface.locked) return;
        e.stopPropagation();
        selectSurface(surface.id, e.nativeEvent?.metaKey || e.nativeEvent?.ctrlKey || false);
    };

    // Add drag functionality for select mode
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const saveHistory = useProjectStore((state) => state.saveHistory);
    const { camera, gl } = useThree();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePointerDown = (e: any) => {
        // If surface is locked, let event pass through (to background/deselect)
        if (surface.locked) return;

        // Stop propagation for ANY unlocked surface interaction
        // This prevents clicking a surface from triggering background deselect
        e.stopPropagation();

        // Only proceed with drag logic if in SELECT mode
        if (toolMode !== "select") return;

        // Save history state before starting drag, with safety check
        try {
            saveHistory();
        } catch (err) {
            console.error("Failed to save history:", err);
        }

        // If Ctrl/Cmd isn't pressed and this surface isn't already selected,
        // we select ONLY this surface (standard behavior).
        // If it IS already selected, we keep the selection to allow dragging the group.
        const isMultiSelect = e.nativeEvent?.metaKey || e.nativeEvent?.ctrlKey;
        if (!isMultiSelect && !isSelected) {
            selectSurface(surface.id, false);
        } else if (isMultiSelect) {
            selectSurface(surface.id, true);
        }

        // Use R3F intersection point (world space) — e.clientX is not available on ThreeEvent
        const startVector = e.point
            ? new THREE.Vector3(e.point.x, e.point.y, 0)
            : new THREE.Vector3(e.intersections?.[0]?.point.x ?? 0, e.intersections?.[0]?.point.y ?? 0, 0);

        const rect = gl.domElement.getBoundingClientRect();

        // Snapshot of all selected surfaces' starting positions
        const activeSurfaces = useProjectStore.getState().getActiveSurfaces();
        const selectedSurfaces = activeSurfaces.filter(s =>
            useProjectStore.getState().selectedSurfaceIds.includes(s.id)
        );

        const initialPositions = selectedSurfaces.map(s => ({
            id: s.id,
            x: s.position.x,
            y: s.position.y
        }));

        prepareSnap(selectedIds);

        const onPointerMove = (moveEvent: PointerEvent) => {
            const x = ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1;

            const vector = new THREE.Vector3(x, y, 0.5);
            vector.unproject(camera);

            const deltaX = vector.x - startVector.x;
            const deltaY = vector.y - startVector.y;

            // Move all selected surfaces
            // Calculate proposed position for THIS surface (the one being dragged)
            const proposedX = surface.position.x + deltaX;
            const proposedY = surface.position.y + deltaY;

            // Check snapping for the primary dragged surface
            const snap = checkSnap({
                center: { x: proposedX, y: proposedY },
                min: { x: proposedX - surface.scale.x / 2, y: proposedY - surface.scale.y / 2 },
                max: { x: proposedX + surface.scale.x / 2, y: proposedY + surface.scale.y / 2 }
            });

            const finalDeltaX = deltaX + snap.offset.x;
            const finalDeltaY = deltaY + snap.offset.y;

            initialPositions.forEach(pos => {
                updateSurface(pos.id, {
                    position: {
                        x: pos.x + finalDeltaX,
                        y: pos.y + finalDeltaY
                    }
                });
            });
        };

        const onPointerUp = () => {
            clearSnap();
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            gl.domElement.style.cursor = "default";
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        gl.domElement.style.cursor = "move";
    };

    // Fallback material if shader/texture is not ready
    const fallbackMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: "#ff00ff",
        wireframe: false,
        transparent: true,
        opacity: 0.3
    }), []);

    // Visibility is handled in useFrame for timeline accuracy
    // if (!surface.visible) return null;




    return (
        <group
            ref={groupRef}
            position={[surface.position.x, surface.position.y, surface.zIndex * 0.01]}
            rotation={[0, 0, surface.rotation]}
            scale={[surface.scale.x, surface.scale.y, 1]}
        >
            <mesh
                ref={meshRef}
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerOver={() => { }}
                onPointerOut={() => { }}
            >
                {polygonGeometry ? (
                    <primitive object={polygonGeometry} attach="geometry" />
                ) : (
                    <planeGeometry args={[1, 1, surface.meshWarp ? surface.meshWarp.gridSize : 1, surface.meshWarp ? surface.meshWarp.gridSize : 1]} />
                )}
                {shaderMaterial ? (
                    <primitive object={shaderMaterial} attach="material" />
                ) : (
                    <primitive object={fallbackMaterial} attach="material" />
                )}
            </mesh>

            {/* Neon Border Effect */}
            {surface.border?.enabled && (
                <group position={[0, 0, 0.02]}>
                    <SurfaceBorder surface={surface} />
                </group>
            )}

            {/* Selection UI and Handles - rendered within the local space of the group */}
            {/* Selection UI and Handles - rendered within the local space of the group */}
            {!isOutput && isSelected && (
                <>
                    {/* Standard outline (follows the unit plane) */}
                    <mesh position={[0, 0, 0.01]}>
                        <lineSegments>
                            <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
                            <lineBasicMaterial color="#7c3aed" linewidth={2} transparent opacity={0.6} />
                        </lineSegments>
                    </mesh>

                    {/* Unified Transform Handles (Local Space) */}
                    {(toolMode === "select" || toolMode === "transform" || toolMode === "corner-pin") && (
                        <ResizeHandles surface={surface} />
                    )}
                </>
            )}

            {/* Mesh Warp Mode */}
            {isSelected && toolMode === "mesh-warp" && (
                <group position={[0, 0, 0.05]}>
                    <MeshWarp surface={surface} />
                </group>
            )}

            {/* Pen Tool Mode (Edit only) */}
            {isSelected && toolMode === "pen" && penSubMode === "edit" && (
                <group position={[0, 0, 0.05]}>
                    <PenTool surface={surface} />
                </group>
            )}
        </group>
    );
}
