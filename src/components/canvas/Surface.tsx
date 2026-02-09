"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Surface as SurfaceType } from "@/store/project-store";
import { useProjectStore, type Vector2 } from "@/store/project-store";
import { useEffectsStore, defaultEffectSettings } from "@/store/effects-store";
import { usePlaybackStore } from "@/store/playback-store";
import { useAudioStore } from "@/store/audio-store";
import { useTimelineStore } from "@/store/timeline-store";

// Import shaders and utils
import vertexShader from "@/shaders/surface.vert.glsl";
import fragmentShader from "@/shaders/surface.frag.glsl";
import { getPerspectiveTransform } from "@/lib/matrix";
import { useUIStore } from "@/store/ui-store";
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

    const selectSurface = useProjectStore((state) => state.selectSurface);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);
    const isPlayingGlobal = usePlaybackStore((state) => state.isPlaying);
    const toolMode = useUIStore((state) => state.toolMode);
    const projectSettings = useProjectStore((state) => state.projectSettings);
    const isOutput = useOutputStore((state) => state.isOutput);
    const { prepareSnap, checkSnap, clearSnap } = useSnapping();

    const isSelected = selectedIds.includes(surface.id);
    const effects = surfaceEffects[surface.id] || defaultEffectSettings;

    // Get media asset
    const mediaAsset = useMemo(() => {
        if (!surface.mediaId) return null;
        return mediaAssets.find((a) => a.id === surface.mediaId);
    }, [surface.mediaId, mediaAssets]);

    // Manage Video/Webcam elements
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(undefined);

    // Hydrate Blob URLs for Output Window or use direct URL
    useEffect(() => {
        if (!mediaAsset) {
            setResolvedUrl(undefined);
            return;
        }

        const url = mediaAsset.url;
        if (!url) {
            setResolvedUrl(undefined);
            return;
        }

        if (isOutput && url.startsWith("blob:")) {
            fetch(url, { method: "HEAD" })
                .then((res) => {
                    if (res.ok) setResolvedUrl(url);
                    else throw new Error("Invalid blob");
                })
                .catch(() => {
                    import("@/lib/db").then(({ db }) => {
                        db.files.get(mediaAsset.id).then((file) => {
                            if (file?.blob) {
                                const newUrl = URL.createObjectURL(file.blob);
                                setResolvedUrl(newUrl);
                            }
                        });
                    });
                });
        } else {
            setResolvedUrl(url);
        }
    }, [mediaAsset, isOutput]);

    useEffect(() => {
        if (!mediaAsset || !resolvedUrl) return;

        if (mediaAsset.type === "video") {
            const video = document.createElement("video");
            video.src = resolvedUrl;
            video.crossOrigin = "anonymous";
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            if (isPlayingGlobal) video.play().catch(() => { });
            setVideoElement(video);
            videoRef.current = video;

            return () => {
                video.pause();
                video.src = "";
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
    }, [mediaAsset, resolvedUrl, isPlayingGlobal]);

    // Create texture from media
    const texture = useMemo(() => {
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
            // console.log("Loading image texture from URL");
            const loader = new THREE.TextureLoader();
            const tex = loader.load(resolvedUrl,
                () => console.log("Texture loaded successfully"),
                undefined,
                (err) => console.error("Error loading texture:", err)
            );
            return tex;
        }

        if ((mediaAsset.type === "video" || mediaAsset.type === "webcam") && videoElement) {
            const tex = new THREE.VideoTexture(videoElement);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            return tex;
        }

        if (mediaAsset.type === "text") {
            const canvas = document.createElement("canvas");
            canvas.width = 1024;
            canvas.height = 1024; // Increased height for multiline
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const text = mediaAsset.text || mediaAsset.name || "Text";
                const fontSize = mediaAsset.fontSize || 80;
                const fontFamily = mediaAsset.fontFamily || "sans-serif";
                const fontWeight = mediaAsset.fontWeight || "normal";
                const fontStyle = mediaAsset.fontStyle || "normal";
                const lineHeight = mediaAsset.lineHeight || 1.2;
                // @ts-ignore - letterSpacing is supported in modern browsers/types
                if (mediaAsset.letterSpacing) ctx.letterSpacing = `${mediaAsset.letterSpacing}px`;

                ctx.fillStyle = mediaAsset.textColor || "#ffffff";
                ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
                ctx.textBaseline = "middle";

                const textAlign = mediaAsset.textAlign || "center";
                ctx.textAlign = textAlign;

                const x = textAlign === "left" ? 50 : textAlign === "right" ? 974 : 512;
                let y = 512;

                const lines = text.split('\n');
                const totalHeight = lines.length * (fontSize * lineHeight);
                y -= totalHeight / 2; // Center vertically initially

                lines.forEach((line, i) => {
                    ctx.fillText(line, x, y + i * (fontSize * lineHeight) + (fontSize * lineHeight) / 2);
                });
            }
            return new THREE.CanvasTexture(canvas);
        }

        return null;
    }, [mediaAsset, videoElement, resolvedUrl]);

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

            const u = sMinX + tx * sWidth;
            const v = sMinY + ty * sHeight;

            uvAttribute.setXY(i, u, v);
        }

        uvAttribute.needsUpdate = true;

        return geometry;
    }, [surface.corners, isQuad, surface.meshWarp]);

    // Calculate texture matrix
    const textureMatrix = useMemo(() => {
        const matrix = new THREE.Matrix3();
        if (!mediaAsset || !surface.corners || surface.corners.length < 3) return matrix;

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
                // scale Y needs to be > 1
                // surfaceAspect / mediaAspect > 1
                sy = surfaceAspect / mediaAspect;
            } else {
                // Surface is taller than media: Fit to height, crop width
                sx = mediaAspect / surfaceAspect;
            }
        } else if (settings.fit === "contain") {
            if (surfaceAspect > mediaAspect) {
                // Surface is wider: Fit to height, letterbox width
                // sx needs to be > 1 to "shrink" the texture (make it cover less UV space? No)
                // To "contain", we see the whole image. 
                // UV space 0..1 covers the whole image.
                // If we want to show image in center, we scale UVs UP?
                // Wait. UV 0..1 maps to Image 0..1.
                // If we multiply UV by 2, we sample Image at 2. 
                // To ZOOM OUT (contain), we need to multiply UVs by > 1.
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
    }, [surface.corners, mediaAsset, surface.textureSettings]);

    // Create shader material with uniforms - MEMOIZED to prevent recreation
    const shaderMaterial = useMemo(() => {
        if (!texture) return null;

        const mat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTexture: { value: texture },
                uTextureMatrix: { value: textureMatrix },
                uOpacity: { value: surface.opacity },
                uBrightness: { value: effects.brightness },
                uContrast: { value: effects.contrast },
                uSaturation: { value: effects.saturation },
                uHue: { value: effects.hue },
                uColorTint: {
                    value: new THREE.Vector3(
                        effects.colorTint.r,
                        effects.colorTint.g,
                        effects.colorTint.b
                    )
                },
                uBlurAmount: { value: effects.blur },
                uChromaticAberration: { value: effects.chromaticAberration },
                uRGBShift: { value: effects.rgbShift },
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
            },
            transparent: true,
            side: THREE.DoubleSide,
        });

        return mat;
    }, [texture]); // Only recreate if texture changes

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
    }, [surface.meshWarp, surface.id]);

    const [hovered, setHovered] = useState(false);
    const bounceRef = useRef(1.0);
    const audioReactiveScale = useRef(1.0);

    // Update mesh transform and uniforms
    useFrame((state) => {
        if (!meshRef.current) return;

        // Timeline Visibility Check
        if (groupRef.current) {
            const currentTime = useTimelineStore.getState().currentTime;
            const endTime = surface.startTime + surface.duration;
            const isInTimeRange = currentTime >= surface.startTime && currentTime < endTime;

            // Only override visibility if surface is "globally" visible (eye icon on)
            // If the eye icon is off (surface.visible === false), it stays hidden.
            if (surface.visible) {
                groupRef.current.visible = isInTimeRange;
            } else {
                groupRef.current.visible = false;
            }
        }

        // Apply audio mappings if enabled
        let reactiveOpacity = surface.opacity;
        let reactiveBlur = effects.blur;
        let reactiveChromatic = effects.chromaticAberration;

        const levels = useAudioStore.getState().levels as any;

        if (surface.audioMappings.length > 0) {
            surface.audioMappings.forEach(mapping => {
                if (!mapping.enabled) return;
                const level = levels[mapping.band];
                const value = mapping.min + (mapping.max - mapping.min) * level;

                if (mapping.property === "opacity") reactiveOpacity = value;
                if (mapping.property === "blur") reactiveBlur = value;
                if (mapping.property === "chromatic") reactiveChromatic = value;
            });
        }

        if (shaderMaterial) {
            // Efficiently update uniforms without recompiling shader
            const uniforms = shaderMaterial.uniforms;

            // Allow for optimized updates by modifying uniform values directly
            if (uniforms.uWarpMatrix) uniforms.uWarpMatrix.value.copy(warpMatrix);
            if (uniforms.uOpacity) uniforms.uOpacity.value = reactiveOpacity;
            if (uniforms.uBrightness) uniforms.uBrightness.value = effects.brightness;
            if (uniforms.uContrast) uniforms.uContrast.value = effects.contrast;
            if (uniforms.uSaturation) uniforms.uSaturation.value = effects.saturation;
            if (uniforms.uHue) uniforms.uHue.value = effects.hue;

            if (uniforms.uColorTint) {
                uniforms.uColorTint.value.set(
                    effects.colorTint.r,
                    effects.colorTint.g,
                    effects.colorTint.b
                );
            }

            if (uniforms.uBlurAmount) uniforms.uBlurAmount.value = reactiveBlur;
            if (uniforms.uChromaticAberration) uniforms.uChromaticAberration.value = reactiveChromatic;
            if (uniforms.uRGBShift) uniforms.uRGBShift.value = effects.rgbShift;

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
            if (uniforms.uBlackout) uniforms.uBlackout.value = projectSettings.blackout ? 1.0 : 0.0;
        }
    });

    const handleClick = (e: any) => {
        if (surface.locked) return;
        e.stopPropagation();
        selectSurface(surface.id, e.nativeEvent?.shiftKey || false);
    };

    // Add drag functionality for select mode
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const saveHistory = useProjectStore((state) => state.saveHistory);
    const { camera, gl } = useThree();

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

        // If shift isn't pressed and this surface isn't already selected,
        // we select ONLY this surface (standard Figma behavior).
        // If it IS already selected, we keep the selection to allow dragging the group.
        if (!e.nativeEvent?.shiftKey && !isSelected) {
            selectSurface(surface.id, false);
        } else if (e.nativeEvent?.shiftKey) {
            selectSurface(surface.id, true);
        }

        const rect = gl.domElement.getBoundingClientRect();
        const startX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const startY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const startVector = new THREE.Vector3(startX, startY, 0.5);
        startVector.unproject(camera);

        // Snapshot of all selected surfaces' starting positions
        const selectedSurfaces = useProjectStore.getState().surfaces.filter(s =>
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
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
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
            {!isOutput && (
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

            {/* Pen Tool Mode */}
            {isSelected && toolMode === "pen" && (
                <group position={[0, 0, 0.05]}>
                    <PenTool surface={surface} />
                </group>
            )}
        </group>
    );
}
