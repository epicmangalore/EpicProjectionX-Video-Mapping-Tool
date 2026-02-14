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
import { useGroupVideo } from "@/hooks/useGroupVideo";

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
import { CornerPin } from "./CornerPin";
import { Line } from "@react-three/drei";

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
    const [localVideoElement, setLocalVideoElement] = useState<HTMLVideoElement | null>(null);
    const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(undefined);
    const [metadataLoaded, setMetadataLoaded] = useState(0); // Trigger re-memoization
    const [videoHasData, setVideoHasData] = useState(false); // Track if video has loaded any frames
    const [videoDimensionsReady, setVideoDimensionsReady] = useState(false); // Track if video dimensions are available

    // Use shared group video if groupId is present
    const groupVideo = useGroupVideo(surface.groupId, resolvedUrl);
    const videoElement = groupVideo ?? localVideoElement;

    // CRITICAL: Synchronize state for group videos.
    useEffect(() => {
        if (!groupVideo) return;

        const onData = () => {
            setVideoHasData(true);
            if (groupVideo.videoWidth > 0) setVideoDimensionsReady(true);
        };
        const onMetadata = () => {
            if (groupVideo.videoWidth > 0) setVideoDimensionsReady(true);
        };

        if (groupVideo.readyState >= 2) setVideoHasData(true);
        if (groupVideo.readyState >= 1 && groupVideo.videoWidth > 0) setVideoDimensionsReady(true);

        groupVideo.addEventListener("loadeddata", onData);
        groupVideo.addEventListener("loadedmetadata", onMetadata);
        groupVideo.addEventListener("canplay", onData);

        return () => {
            groupVideo.removeEventListener("loadeddata", onData);
            groupVideo.removeEventListener("loadedmetadata", onMetadata);
            groupVideo.removeEventListener("canplay", onData);
        };
    }, [groupVideo]);

    const updateMediaAsset = useProjectStore((state) => state.updateMediaAsset);

    // Reset data ready states when media changes
    useEffect(() => {
        setVideoHasData(false);
        setVideoDimensionsReady(false);
    }, [mediaAsset?.id]);

    // Hydrate Blob URLs for Output Window AND Editor (persistence fix)
    useEffect(() => {
        if (!mediaAsset) {
            setResolvedUrl(undefined);
            return;
        }

        const url = mediaAsset.url;

        // Proactive hydration from IndexedDB for output window or stale blob URLs
        const hydrateFromDb = async () => {
            if (!mediaAsset.id) return;
            try {
                const { db } = await import("@/lib/db");
                const fileRecord = await db.files.get(mediaAsset.id);
                if (fileRecord?.blob) {
                    const localUrl = URL.createObjectURL(fileRecord.blob);
                    console.log("↺ Hydrated local URL from IndexedDB:", mediaAsset.name, "ID:", mediaAsset.id, "URL:", localUrl.substring(0, 50));
                    setResolvedUrl(localUrl);
                    return true;
                } else {
                    console.warn("✗ No blob found in IndexedDB for ID:", mediaAsset.id);
                }
            } catch (err) {
                console.warn("Proactive hydration failed for ID:", mediaAsset.id, err);
            }
            return false;
        };

        const checkAndHydrate = async () => {
            if (!url) {
                console.log("→ Surface: No URL provided for asset, attempting DB recovery:", mediaAsset.name);
                const success = await hydrateFromDb();
                if (!success) {
                    setResolvedUrl(undefined);
                }
                return;
            }

            if (url.startsWith("blob:")) {
                try {
                    // Blob URLs are window-specific. Proactively check if this one is valid.
                    const resp = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
                    if (resp.ok) {
                        setResolvedUrl(url);
                    } else {
                        console.log("→ Surface: Blob URL stale, hydrating from DB:", mediaAsset.name);
                        await hydrateFromDb();
                    }
                } catch {
                    // Blob is likely from another session or window
                    console.log("→ Surface: Blob URL fetch failed, hydrating from DB:", mediaAsset.name);
                    await hydrateFromDb();
                }
            } else {
                setResolvedUrl(url);
            }
        };

        checkAndHydrate();

        return () => {
            // Cleanup handled by the textures/elements usually, but we could revoke here if we tracked it
        };
    }, [mediaAsset?.id, mediaAsset?.url, isOutput]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!mediaAsset || !resolvedUrl) {
            console.log("No media or URL:", { mediaAsset: mediaAsset?.name, resolvedUrl });
            return;
        }

        if (mediaAsset.type === "video") {
            console.log("Creating video element for:", mediaAsset.name, "URL:", resolvedUrl);

            // CRITICAL: Wait for global video container to be ready before creating video elements
            const createVideoElement = () => {
                const video = document.createElement("video");
                let recoveredFromDb = false;
                video.src = resolvedUrl;
                video.crossOrigin = "anonymous";
                video.loop = true;
                video.muted = true;
                video.defaultMuted = true;
                video.autoplay = false; // Changed to false - we'll manually play when ready
                video.playsInline = true;

                // Important for long videos: preload metadata
                video.preload = "auto";

                const onLoadedMetadata = () => {
                    console.log("✓ Video metadata loaded:", mediaAsset.name, "Duration:", video.duration,
                        "Dimensions:", video.videoWidth + "x" + video.videoHeight);
                    setMetadataLoaded(prev => prev + 1);
                    // Check if dimensions are available
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                        console.log("→ Video dimensions ready at metadata stage");
                        setVideoDimensionsReady(true);
                    }
                };

                const onCanPlay = () => {
                    console.log("✓ Video can play:", mediaAsset.name, "readyState:", video.readyState,
                        "Dimensions:", video.videoWidth + "x" + video.videoHeight);
                    // CRITICAL: Ensure video has data flag is set
                    console.log("→ Setting videoHasData = true for:", mediaAsset.name);
                    setVideoHasData(true);
                    // Check if dimensions are available
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                        console.log("→ Video dimensions ready at canplay stage");
                        setVideoDimensionsReady(true);
                    }
                    // Force texture update immediately when video is ready
                    if (isPlayingGlobal && video.paused) {
                        video.play().catch(err => console.warn("Auto-play on canplay failed:", err));
                    }
                };

                const onLoadedData = () => {
                    console.log("✓ Video loaded data:", mediaAsset.name, "readyState:", video.readyState,
                        "Dimensions:", video.videoWidth + "x" + video.videoHeight);
                    // CRITICAL: Mark that video has data so texture can be created
                    console.log("→ Setting videoHasData = true for:", mediaAsset.name);
                    setVideoHasData(true);
                    // Check if dimensions are available
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                        console.log("→ Video dimensions ready at loadeddata stage");
                        setVideoDimensionsReady(true);
                    }
                    // Video has loaded enough data to start playing
                    if (isPlayingGlobal && video.paused) {
                        video.play().catch(err => console.warn("Auto-play on loadeddata failed:", err));
                    }
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const onError = async (e: any) => {
                    const mediaError = video.error;

                    // Error code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED (codec issue)
                    // Don't retry codec errors - they will never work
                    if (mediaError?.code === 4) {
                        console.error("✗ Video codec not supported:", mediaAsset.name, "- This file cannot be played in browsers. Please convert to H.264/MP4.");
                        return;
                    }

                    console.error("✗ Video error for", mediaAsset.name, ":", video.error, e);

                    // Blob URLs can become stale after reload/crash. Recover from IndexedDB once.
                    if (recoveredFromDb || !mediaAsset.id) return;
                    recoveredFromDb = true;

                    try {
                        const { db } = await import("@/lib/db");
                        const fileRecord = await db.files.get(mediaAsset.id);

                        if (fileRecord?.blob) {
                            const recoveredUrl = URL.createObjectURL(fileRecord.blob);
                            console.log("↺ Recovered video URL from IndexedDB:", mediaAsset.name);
                            updateMediaAsset(mediaAsset.id, { url: recoveredUrl });
                            video.src = recoveredUrl;
                            video.load();
                            if (isPlayingGlobal) {
                                video.play().catch(err => console.warn("Play failed after DB recovery:", err));
                            }
                        }
                    } catch (recoveryError) {
                        console.warn("Video recovery from IndexedDB failed:", recoveryError);
                    }
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

                const onSuspend = () => {
                    console.log("⏸ Video suspended:", mediaAsset.name);
                };

                const onStalled = () => {
                    console.warn("⚠ Video stalled:", mediaAsset.name);
                };

                video.addEventListener("loadedmetadata", onLoadedMetadata);
                video.addEventListener("loadeddata", onLoadedData);
                video.addEventListener("canplay", onCanPlay);
                video.addEventListener("error", onError);
                video.addEventListener("loadstart", onLoadStart);
                video.addEventListener("playing", onPlaying);
                video.addEventListener("waiting", onWaiting);
                video.addEventListener("suspend", onSuspend);
                video.addEventListener("stalled", onStalled);

                // CRITICAL: Append to global container BEFORE calling load()
                const container = (window as any).globalVideoContainer;
                if (container) {
                    container.appendChild(video);
                    console.log("✓ Video appended to global container:", mediaAsset.name);
                } else {
                    console.warn("⚠ Global video container not found! Video may not play correctly.");
                }

                // Explicitly start fetching media. Some environments delay loading
                // unless load() is called after dynamic src assignment.
                video.load();

                // CRITICAL: Check readyState immediately in case it's already loaded/cached
                // This ensures that if the video is already in memory, we update the state right away.
                if (video.readyState >= 1) { // HAVE_METADATA
                    console.log("→ Video already has metadata, triggering handler immediately");
                    onLoadedMetadata();
                }
                if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                    console.log("→ Video already has data, triggering handler immediately");
                    onLoadedData();
                }
                if (video.readyState >= 3) { // HAVE_FUTURE_DATA
                    console.log("→ Video already can play, triggering handler immediately");
                    onCanPlay();
                }

                setLocalVideoElement(video);
                videoRef.current = video;

                return () => {
                    console.log("Cleaning up video element:", mediaAsset.name);
                    video.pause();
                    video.removeEventListener("loadedmetadata", onLoadedMetadata);
                    video.removeEventListener("loadeddata", onLoadedData);
                    video.removeEventListener("canplay", onCanPlay);
                    video.removeEventListener("error", onError);
                    video.removeEventListener("loadstart", onLoadStart);
                    video.removeEventListener("playing", onPlaying);
                    video.removeEventListener("waiting", onWaiting);
                    video.removeEventListener("suspend", onSuspend);
                    video.removeEventListener("stalled", onStalled);
                    if (video.parentNode) {
                        video.parentNode.removeChild(video);
                    }
                    video.src = "";
                    video.load(); // Release memory
                    setLocalVideoElement(null);
                    setVideoHasData(false);
                    setVideoDimensionsReady(false);
                    videoRef.current = null;
                };
            };

            // Wait for container to be ready
            if ((window as any).globalVideoContainerReady) {
                return createVideoElement();
            } else {
                console.log("⏳ Waiting for global video container to be ready...");
                const handleContainerReady = () => {
                    console.log("✓ Container ready, creating video element");
                    createVideoElement();
                };
                window.addEventListener("video-container-ready", handleContainerReady, { once: true });

                // Fallback timeout in case event doesn't fire
                const timeoutId = setTimeout(() => {
                    if ((window as any).globalVideoContainer) {
                        console.log("✓ Container ready (timeout fallback), creating video element");
                        createVideoElement();
                    }
                }, 100);

                return () => {
                    window.removeEventListener("video-container-ready", handleContainerReady);
                    clearTimeout(timeoutId);
                };
            }
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

                    // Wait for video to have data before setting state
                    video.addEventListener("loadeddata", () => {
                        console.log("✓ Webcam loaded data");
                        setVideoHasData(true);
                    }, { once: true });

                    await video.play().catch(e => console.warn("Video play failed", e));

                    setLocalVideoElement(video);
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
                setLocalVideoElement(null);
                setVideoHasData(false);
                setVideoDimensionsReady(false);
            };
        }
    }, [mediaAsset?.id, mediaAsset?.type, resolvedUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    // Separate effect to handle play/pause based on global playback state
    useEffect(() => {
        const video = videoElement ?? videoRef.current;
        if (!video) return;

        console.log("Playback state changed:", isPlayingGlobal, "for video:", mediaAsset?.name, "readyState:", video.readyState);

        if (isPlayingGlobal) {
            // CRITICAL: Wait for video to have enough data before playing
            if (video.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
                if (video.paused) {
                    console.log("→ Playing video (ready):", mediaAsset?.name);
                    video.play().catch(err => {
                        console.warn("✗ Play failed (ready):", mediaAsset?.name, err);
                        // If it's a playback interaction error, we might need a user click
                    });
                }
            } else if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                if (video.paused) {
                    console.log("→ Playing video (current data):", mediaAsset?.name);
                    video.play().catch(err => {
                        console.warn("Play failed:", err);
                    });
                }
            } else {
                console.log("Video not ready yet, waiting for canplay event. readyState:", video.readyState);

                const handleCanPlayWhilePlaying = () => {
                    console.log("→ Video canplay event fired, playing:", mediaAsset?.name);
                    video.play().catch(err => {
                        console.warn("Play failed after canplay:", err);
                    });
                };

                const handleLoadedData = () => {
                    console.log("→ Video loadeddata event fired, playing:", mediaAsset?.name);
                    video.play().catch(err => {
                        console.warn("Play failed after loadeddata:", err);
                    });
                };

                // If playback was requested before media became ready,
                // start playback as soon as canplay or loadeddata fires.
                video.addEventListener("canplay", handleCanPlayWhilePlaying, { once: true });
                video.addEventListener("loadeddata", handleLoadedData, { once: true });

                return () => {
                    video.removeEventListener("canplay", handleCanPlayWhilePlaying);
                    video.removeEventListener("loadeddata", handleLoadedData);
                };
            }
        } else {
            if (!video.paused) {
                console.log("→ Pausing video:", mediaAsset?.name);
                video.pause();
            }
        }
    }, [isPlayingGlobal, mediaAsset?.name, videoElement, videoElement?.readyState]); // eslint-disable-line react-hooks/exhaustive-deps

    // Create texture from media
    const texture = useMemo(() => {
        console.log("[TEXTURE MEMO] Running for:", mediaAsset?.name, "type:", mediaAsset?.type, "videoElement:", !!videoElement, "videoHasData:", videoHasData);

        // PRIORITY 1: Global Mixed Composition
        if (surface.useComposition && (window as any).compositionTexture) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return (window as any).compositionTexture; // eslint-disable-line @typescript-eslint/no-explicit-any
        }

        if (!mediaAsset) {
            console.log("[TEXTURE MEMO] No media asset");
            return null;
        }

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
            const texture = loader.load(
                resolvedUrl,
                undefined, // onLoad
                undefined, // onProgress
                async (err) => {
                    console.error("✗ Image load error:", mediaAsset.name, err);
                    if (mediaAsset.id) {
                        try {
                            const { db } = await import("@/lib/db");
                            const fileRecord = await db.files.get(mediaAsset.id);
                            if (fileRecord?.blob) {
                                const recoveredUrl = URL.createObjectURL(fileRecord.blob);
                                console.log("↺ Recovered image URL from IndexedDB:", mediaAsset.name);
                                setResolvedUrl(recoveredUrl);
                            }
                        } catch (recoveryErr) {
                            console.warn("Image recovery failed:", recoveryErr);
                        }
                    }
                }
            );
            return texture;
        }

        if ((mediaAsset.type === "video" || mediaAsset.type === "webcam") && videoElement) {
            // CRITICAL: Only create texture if video has loaded data AND has valid dimensions
            // Creating texture before video has dimensions results in blank/black texture
            const hasValidDimensions = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;

            console.log("[TEXTURE DEBUG]", mediaAsset.name, {
                hasVideoElement: !!videoElement,
                videoHasData,
                videoDimensionsReady,
                readyState: videoElement.readyState,
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
                hasValidDimensions,
                src: videoElement.src?.substring(0, 50),
                error: videoElement.error
            });

            if (!videoHasData && videoElement.readyState < 2) {
                console.log("⏳ Video element exists but no data yet, waiting...", mediaAsset.name, "readyState:", videoElement.readyState);
                return null;
            }

            if (!hasValidDimensions) {
                console.log("⏳ Video has data but dimensions not ready yet:", mediaAsset.name,
                    "videoWidth:", videoElement.videoWidth, "videoHeight:", videoElement.videoHeight,
                    "readyState:", videoElement.readyState);
                return null;
            }

            console.log("✓ Creating VideoTexture for:", mediaAsset.name,
                "dimensions:", videoElement.videoWidth + "x" + videoElement.videoHeight,
                "readyState:", videoElement.readyState);
            const tex = new THREE.VideoTexture(videoElement);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            tex.format = THREE.RGBAFormat;
            tex.needsUpdate = true; // Force initial update
            return tex;
        }

        if (mediaAsset.type === "text") {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const text = mediaAsset.text || mediaAsset.name || "Text";
                const fontSize = mediaAsset.fontSize || 80;
                const fontFamily = mediaAsset.fontFamily || "sans-serif";
                const fontWeight = mediaAsset.fontWeight || "normal";
                const fontStyle = mediaAsset.fontStyle || "normal";
                const lineHeight = mediaAsset.lineHeight || 1.2;
                const lineStep = fontSize * lineHeight;
                const lines = text.split("\n");

                // Measure text first and size the canvas to text bounds.
                // This gives text layers a real intrinsic aspect ratio so Stretch/Fill/Fit behaves correctly.
                ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
                const maxLineWidth = Math.max(1, ...lines.map((line) => ctx.measureText(line).width));
                const paddingX = Math.max(16, fontSize * 0.75);
                const paddingY = Math.max(16, fontSize * 0.75);
                const textHeight = Math.max(lineStep, lines.length * lineStep);
                const targetWidth = Math.ceil(maxLineWidth + paddingX * 2);
                const targetHeight = Math.ceil(textHeight + paddingY * 2);
                canvas.width = Math.max(2, Math.min(4096, targetWidth));
                canvas.height = Math.max(2, Math.min(4096, targetHeight));

                // Re-apply styles after resize (canvas reset behavior)
                ctx.fillStyle = mediaAsset.textColor || "#ffffff";
                ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
                ctx.textBaseline = "middle";
                if (mediaAsset.letterSpacing) (ctx as any).letterSpacing = `${mediaAsset.letterSpacing}px`; // eslint-disable-line @typescript-eslint/no-explicit-any

                const textAlign = mediaAsset.textAlign || "center";
                ctx.textAlign = textAlign;

                const x = textAlign === "left"
                    ? paddingX
                    : textAlign === "right"
                        ? canvas.width - paddingX
                        : canvas.width / 2;

                const startY = (canvas.height - textHeight) / 2 + lineStep / 2;
                lines.forEach((line, i) => {
                    ctx.fillText(line, x, startY + i * lineStep);
                });
            }
            const tex = new THREE.CanvasTexture(canvas);
            return tex;
        }

        return null;
    }, [
        mediaAsset?.id,
        mediaAsset?.url,
        mediaAsset?.type,
        mediaAsset?.text,
        mediaAsset?.fontSize,
        mediaAsset?.fontFamily,
        mediaAsset?.fontWeight,
        mediaAsset?.fontStyle,
        mediaAsset?.lineHeight,
        mediaAsset?.letterSpacing,
        mediaAsset?.textColor,
        mediaAsset?.textAlign,
        mediaAsset?.color,
        videoElement,
        videoHasData,
        videoDimensionsReady,
        resolvedUrl,
        surface.useComposition,
        surface.id
    ]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle force video sync event
    useEffect(() => {
        const video = videoElement ?? videoRef.current;
        if (!video || mediaAsset?.type !== "video") return;

        const mapToVideoTime = (timelineTime: number) => {
            const d = video.duration;
            if (!Number.isFinite(d) || d <= 0) return Math.max(0, timelineTime);
            // Keep timeline sync within valid media range.
            return ((timelineTime % d) + d) % d;
        };

        const handleForceSync = (e: Event) => {
            const customEvent = e as CustomEvent<{ time: number }>;
            const targetTime = mapToVideoTime(customEvent.detail.time);

            console.log("Force syncing video:", mediaAsset?.name, "to time:", targetTime);

            // Set video time
            video.currentTime = targetTime;

            // Force texture refresh
            if (texture && texture instanceof THREE.VideoTexture) {
                texture.needsUpdate = true;
            }

            // If should be playing, ensure it's playing
            if (isPlayingGlobal && video.paused) {
                video.play().catch(err => {
                    console.warn("Play failed during sync:", err);
                });
            }
        };

        const handleLoadedData = () => {
            console.log(`[Surface ${surface.name}] Video loadeddata - forcing texture update`);
            if (texture && texture instanceof THREE.VideoTexture) {
                texture.needsUpdate = true;
            }
        };

        window.addEventListener("force-video-sync", handleForceSync);
        video.addEventListener("loadeddata", handleLoadedData);

        return () => {
            window.removeEventListener("force-video-sync", handleForceSync);
            video.removeEventListener("loadeddata", handleLoadedData);
        };
    }, [mediaAsset?.type, mediaAsset?.name, videoElement, isPlayingGlobal, texture, surface.name]);

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
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // 2. Get Media Aspect Ratio
        let mediaAspect = 1;
        if (mediaAsset.width && mediaAsset.height) {
            mediaAspect = mediaAsset.width / mediaAsset.height;
        } else {
            const textureImage = texture?.image as { width?: number; height?: number; videoWidth?: number; videoHeight?: number } | undefined;
            const textureWidth = textureImage?.videoWidth ?? textureImage?.width;
            const textureHeight = textureImage?.videoHeight ?? textureImage?.height;
            if (textureWidth && textureHeight) {
                mediaAspect = textureWidth / textureHeight;
            }
        }

        // 3. Calculate Scale based on Fit Mode
        let sx = 1;
        let sy = 1;

        if (settings.fit === "cover") {
            // COVER: Zoom in until the whole surface is covered
            if (surfaceAspect > mediaAspect) {
                sy = mediaAspect / surfaceAspect;
            } else {
                sx = surfaceAspect / mediaAspect;
            }
        } else if (settings.fit === "contain") {
            // CONTAIN: Zoom out until the whole media fits inside
            if (surfaceAspect > mediaAspect) {
                sx = surfaceAspect / mediaAspect;
            } else {
                sy = mediaAspect / surfaceAspect;
            }
        }

        // Log for debugging (only once in a while or on change)
        if (!isOutput) {
            // console.log(`[Surface ${surface.name}] aspect: ${surfaceAspect.toFixed(2)}, media: ${mediaAspect.toFixed(2)}, fit: ${settings.fit}, sx: ${sx.toFixed(2)}, sy: ${sy.toFixed(2)}`);
        }

        // 4. Apply Manual Transforms
        const manualScaleX = settings.scale?.x ?? 1;
        const manualScaleY = settings.scale?.y ?? 1;
        const manualOffsetX = settings.offset?.x ?? 0;
        const manualOffsetY = settings.offset?.y ?? 0;

        // 5. Build Texture Matrix (P' = T_back * S_total * R * T_forward * P)
        matrix.identity();

        // Step 3: Move back to center (applied last)
        matrix.translate(0.5, 0.5);

        // Step 2: Apply Scale, Rotation (applied middle)
        // Manual flip
        const finalSx = sx / manualScaleX * (settings.flipX ? -1 : 1);
        const finalSy = sy / manualScaleY * (settings.flipY ? -1 : 1);
        matrix.scale(finalSx, finalSy);

        const rot = (settings.rotation || 0) * (Math.PI / 180);
        matrix.rotate(-rot);

        // Step 1: Move center to origin (applied first)
        matrix.translate(-0.5, -0.5);

        // Step 0: Apply manual offset (applied very first)
        matrix.translate(-manualOffsetX, -manualOffsetY);

        return matrix;
    }, [surface.corners, mediaAsset, texture, surface.textureSettings, surface.compositionMapping, surface.useComposition, metadataLoaded, mediaAsset?.width, mediaAsset?.height]);

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
        const projectStore = useProjectStore.getState();
        const timelineState = useTimelineStore.getState();
        const renderSceneId = isOutput ? (projectStore.projectSettings.playingSceneId || projectStore.activeSceneId) : projectStore.activeSceneId;
        const renderScene = projectStore.scenes.find(s => s.id === renderSceneId);

        // Deterministic playback state for this surface based on its context (Output vs Editor)
        // If in Output (isOutput), we follow the renderScene's stored state if it's NOT the active one.
        // If it IS the active one, we follow useTimelineStore for perfect editor sync.
        const isSelfActive = renderSceneId === projectStore.activeSceneId;
        const currentTime = isSelfActive ? timelineState.currentTime : (renderScene?.currentTime || 0);
        const isPlaying = isSelfActive ? timelineState.isPlaying : (renderScene?.isPlaying || false);

        // CRITICAL: Update composition texture every frame
        if (surface.useComposition && (window as any).compositionTexture && shaderMaterial) {
            shaderMaterial.uniforms.uTexture.value = (window as any).compositionTexture;
        }

        // CRITICAL: Update video texture only when playing or seeking + sync with timeline
        if (texture && texture instanceof THREE.VideoTexture && videoElement) {
            // CRITICAL: Always mark texture for update when video element exists and has data
            // This ensures the first frame is rendered even when paused
            if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA or better
                texture.needsUpdate = true;
            } else if (videoElement.readyState === 1) { // HAVE_METADATA
                // Even with just metadata, try to update (some browsers need this)
                texture.needsUpdate = true;
            }

            // Sync video currentTime with timeline position
            if (videoElement.readyState >= 1) { // At least HAVE_METADATA
                const d = videoElement.duration;
                const targetTime = Number.isFinite(d) && d > 0
                    ? ((currentTime % d) + d) % d
                    : Math.max(0, currentTime);
                const videoTime = videoElement.currentTime;
                const drift = videoTime - targetTime;
                const absDrift = Math.abs(drift);

                // Detect massive jumps (scrubbing or loop)
                const timelineJump = Math.abs(currentTime - lastTimelineTimeRef.current);
                const isScrubbing = timelineJump > 0.1; // More sensitive scrubbing detection

                if (!isPlaying) {
                    // When paused, seek to exact frame
                    if (absDrift > 0.01) {
                        videoElement.currentTime = targetTime;
                        // Force texture update after seek
                        texture.needsUpdate = true;
                    }
                    if (videoElement.playbackRate !== 1.0) videoElement.playbackRate = 1.0;
                } else if (isScrubbing || absDrift > 0.5) { // Lower drift threshold for hard sync
                    videoElement.currentTime = targetTime;
                    videoElement.playbackRate = 1.0;
                    texture.needsUpdate = true;
                    if (videoElement.paused && videoElement.readyState >= 3) {
                        videoElement.play().catch(() => { });
                    }
                } else if (isPlaying && videoElement.paused) {
                    if (absDrift > 0.01) {
                        videoElement.currentTime = targetTime;
                        texture.needsUpdate = true;
                    }
                    if (videoElement.readyState >= 3) { // HAVE_FUTURE_DATA
                        videoElement.play().catch(err => {
                            if (err.name !== "AbortError") {
                                console.warn("⚠ Background play failed:", mediaAsset?.name, err);
                            }
                        });
                    }
                } else if (isPlaying && absDrift > 0.03) {
                    videoElement.playbackRate = drift > 0 ? 0.95 : 1.05;
                } else {
                    if (videoElement.playbackRate !== 1.0) videoElement.playbackRate = 1.0;
                }
            }
            lastTimelineTimeRef.current = currentTime;
        }

        // Timeline Visibility Check
        if (groupRef.current) {
            const endTime = surface.startTime + surface.duration;

            // Legacy surfaces default to start=0,duration=5 which unintentionally hides
            // media once the timeline moves past 5s. Treat that default as "always visible"
            // unless timing has been explicitly edited.
            const hasCustomTiming = surface.startTime !== 0 || surface.duration !== 5;
            const isInTimeRange = hasCustomTiming
                ? (currentTime >= surface.startTime && currentTime < endTime)
                : true;

            // Only override visibility if surface is "globally" visible (eye icon on)
            if (surface.visible) {
                if (groupRef.current.visible !== isInTimeRange) {
                    groupRef.current.visible = isInTimeRange;
                    if (!isInTimeRange) {
                        console.log(`[Surface ${surface.name}] Hidden: Current time (${currentTime.toFixed(2)}s) is outside range [${surface.startTime}s - ${endTime}s]`);
                    } else {
                        console.log(`[Surface ${surface.name}] Visible: Time reached range`);
                    }
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

            // FORCED TEXTURE UPDATE: Some browser/Three combinations need this 
            // especially when switching between local and group videos
            if (uniforms.uTexture && texture) {
                if (uniforms.uTexture.value !== texture) {
                    console.log("↺ Swapping shader texture for:", surface.id, mediaAsset?.name);
                    uniforms.uTexture.value = texture;
                }
            }

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
                    <planeGeometry args={[1, 1, 32, 32]} />
                )}
                {shaderMaterial ? (
                    <primitive object={shaderMaterial} attach="material" />
                ) : (
                    <primitive object={fallbackMaterial} attach="material" />
                )}
            </mesh>


            {/* Selection UI and Handles - rendered within the local space of the group */}
            {/* Selection UI and Handles - rendered within the local space of the group */}
            {!isOutput && isSelected && (
                <>
                    {/* Dynamic outline (follows the actual corners) */}
                    <Line
                        points={surface.corners.map(p => [p.x, p.y, 0.01] as [number, number, number]).concat([[surface.corners[0].x, surface.corners[0].y, 0.01]])}
                        color="#7c3aed"
                        lineWidth={1.5}
                        transparent
                        opacity={0.6}
                        depthTest={false}
                    />

                    {/* Unified Transform Handles (Local Space) */}
                    {(toolMode === "select" || toolMode === "transform") && (
                        <ResizeHandles surface={surface} />
                    )}
                </>
            )}

            {/* Corner Pin Mode Handles */}
            {isSelected && toolMode === "corner-pin" && (
                <CornerPin surface={surface} />
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
