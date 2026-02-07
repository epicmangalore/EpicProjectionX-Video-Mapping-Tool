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

// Import shaders and utils
import vertexShader from "@/shaders/surface.vert.glsl";
import fragmentShader from "@/shaders/surface.frag.glsl";
import { getPerspectiveTransform } from "@/lib/matrix";
import { TransformControls } from "./TransformControls";
import { useUIStore } from "@/store/ui-store";
import { useOutputStore } from "@/store/output-store";
import { ResizeHandles } from "./ResizeHandles";
import { CornerPin } from "./CornerPin";
import { MeshWarp } from "./MeshWarp";
import { PenTool } from "./PenTool";

interface SurfaceProps {
    surface: SurfaceType;
}

export function Surface({ surface }: SurfaceProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const selectSurface = useProjectStore((state) => state.selectSurface);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);
    const isPlayingGlobal = usePlaybackStore((state) => state.isPlaying);
    const toolMode = useUIStore((state) => state.toolMode);
    const projectSettings = useProjectStore((state) => state.projectSettings);

    const isSelected = selectedIds.includes(surface.id);
    const effects = surfaceEffects[surface.id] || defaultEffectSettings;

    // Get media asset
    const mediaAsset = useMemo(() => {
        if (!surface.mediaId) return null;
        return mediaAssets.find((a) => a.id === surface.mediaId);
    }, [surface.mediaId, mediaAssets]);

    // Manage Video/Webcam elements
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!mediaAsset) return;

        if (mediaAsset.type === "video" && mediaAsset.url) {
            const video = document.createElement("video");
            video.src = mediaAsset.url;
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
    }, [mediaAsset, isPlayingGlobal]);

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

        if (mediaAsset.type === "image" && mediaAsset.url) {
            // console.log("Loading image texture from URL");
            const loader = new THREE.TextureLoader();
            const tex = loader.load(mediaAsset.url,
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
    }, [mediaAsset, videoElement]);

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

    // Create shader material with uniforms
    const shaderMaterial = useMemo(() => {
        if (!texture) return null;

        const mat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTexture: { value: texture },
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
    }, [texture, warpMatrix, effects, projectSettings]);

    // Update mesh geometry for MeshWarp
    useEffect(() => {
        if (!meshRef.current || !surface.meshWarp) return;

        const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
        const { gridSize, controlPoints } = surface.meshWarp;

        // Check if geometry segments match gridSize
        if (geometry.parameters.widthSegments !== gridSize || geometry.parameters.heightSegments !== gridSize) {
            meshRef.current.geometry = new THREE.PlaneGeometry(1, 1, gridSize, gridSize);
            return;
        }

        const positions = geometry.attributes.position;
        const count = positions.count;

        for (let i = 0; i < count; i++) {
            // PlaneGeometry vertices are ordered TL to BR
            // Calculate row and col for the vertex
            const xIdx = i % (gridSize + 1);
            const yIdx = Math.floor(i / (gridSize + 1));

            const point = controlPoints[yIdx][xIdx];
            if (point) {
                positions.setXY(i, point.x, point.y);
            }
        }
        positions.needsUpdate = true;
    }, [surface.meshWarp, surface.id]);

    const updateLevels = useAudioStore((state) => state.updateLevels);
    const audioLevels = useAudioStore((state) => state.levels);


    const [hovered, setHovered] = useState(false);
    const bounceRef = useRef(1.0);
    const audioReactiveScale = useRef(1.0);

    // Update mesh transform and uniforms
    useFrame((state) => {
        if (!meshRef.current) return;

        // Apply audio mappings if enabled
        let reactiveOpacity = surface.opacity;
        let reactiveBlur = effects.blur;
        let reactiveChromatic = effects.chromaticAberration;

        updateLevels();
        const levels = audioLevels as any;

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
            // Always copy warpMatrix to shader.
            // This allows for 'Source' (Input) mapping even on distorted MeshWarp grids.
            shaderMaterial.uniforms.uWarpMatrix.value.copy(warpMatrix);

            shaderMaterial.uniforms.uOpacity.value = reactiveOpacity;
            shaderMaterial.uniforms.uBrightness.value = effects.brightness;
            shaderMaterial.uniforms.uContrast.value = effects.contrast;
            shaderMaterial.uniforms.uSaturation.value = effects.saturation;
            shaderMaterial.uniforms.uHue.value = effects.hue;
            shaderMaterial.uniforms.uColorTint.value.set(
                effects.colorTint.r,
                effects.colorTint.g,
                effects.colorTint.b
            );
            shaderMaterial.uniforms.uBlurAmount.value = reactiveBlur;
            shaderMaterial.uniforms.uChromaticAberration.value = reactiveChromatic;
            shaderMaterial.uniforms.uRGBShift.value = effects.rgbShift;

            // Global controls
            shaderMaterial.uniforms.uMasterOpacity.value = projectSettings.masterOpacity;
            shaderMaterial.uniforms.uMasterBrightness.value = projectSettings.masterBrightness;
            shaderMaterial.uniforms.uBlackout.value = projectSettings.blackout ? 1.0 : 0.0;
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

        const onPointerMove = (moveEvent: PointerEvent) => {
            const x = ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1;

            const vector = new THREE.Vector3(x, y, 0.5);
            vector.unproject(camera);

            const deltaX = vector.x - startVector.x;
            const deltaY = vector.y - startVector.y;

            // Move all selected surfaces
            initialPositions.forEach(pos => {
                updateSurface(pos.id, {
                    position: {
                        x: pos.x + deltaX,
                        y: pos.y + deltaY
                    }
                });
            });
        };

        const onPointerUp = () => {
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

    const isOutput = useOutputStore((state) => state.isOutput);

    if (!surface.visible) return null;

    return (
        <group
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
                    <Line
                        points={[
                            [-0.5, 0.5, 0],  // TL
                            [0.5, 0.5, 0],   // TR
                            [0.5, -0.5, 0],  // BR
                            [-0.5, -0.5, 0], // BL
                            [-0.5, 0.5, 0],  // Close loop
                        ]}
                        color={surface.border.color}
                        lineWidth={surface.border.width}
                        transparent
                        opacity={surface.border.opacity}
                        toneMapped={false} // Crucial for neon glow with bloom
                    />
                    {/* Inner Glow Layer (Optional, for extra bloom pop) */}
                    {surface.border.glow > 0 && (
                        <Line
                            points={[
                                [-0.5, 0.5, 0],
                                [0.5, 0.5, 0],
                                [0.5, -0.5, 0],
                                [-0.5, -0.5, 0],
                                [-0.5, 0.5, 0],
                            ]}
                            color={surface.border.color}
                            lineWidth={surface.border.width * 2}
                            transparent
                            opacity={surface.border.opacity * 0.3 * surface.border.glow}
                            toneMapped={false}
                            depthTest={false} // Draw on top
                        />
                    )}
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

                    {isSelected && toolMode !== "pen" && toolMode !== "corner-pin" && toolMode !== "mesh-warp" && (
                        <>
                            {/* Brighter border for highlighted selection */}
                            <mesh position={[0, 0, 0.03]}>
                                <lineSegments>
                                    <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
                                    <lineBasicMaterial color="#a78bfa" linewidth={3} depthTest={false} transparent opacity={0.8} />
                                </lineSegments>
                            </mesh>

                            {/* Resize Handles (Local Space) */}
                            {toolMode === "select" && <ResizeHandles surface={surface} />}

                            {/* Transform Controller Gizmos */}
                            {toolMode === "transform" && (
                                <TransformControls surface={surface} meshRef={meshRef} />
                            )}
                        </>
                    )}

                    {/* Corner Pin Mode */}
                    {isSelected && toolMode === "corner-pin" && (
                        <group position={[0, 0, 0.05]}>
                            <CornerPin surface={surface} />
                        </group>
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
                </>
            )}
        </group>
    );
}
