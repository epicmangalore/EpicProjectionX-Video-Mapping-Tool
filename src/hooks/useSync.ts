"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/store/project-store";
import { useEffectsStore } from "@/store/effects-store";
import { useOutputStore } from "@/store/output-store";
import { useAudioStore } from "@/store/audio-store";
import { useTimelineStore } from "@/store/timeline-store";

const SYNC_CHANNEL = "projectionx_sync";

export function useSync() {
    const isOutput = useOutputStore((state) => state.isOutput);

    useEffect(() => {
        const channel = new BroadcastChannel(SYNC_CHANNEL);
        let animationFrameId: number;

        if (isOutput) {
            // Request initial state and inform control window
            channel.postMessage({ type: "SYNC_REQUEST" });
            channel.postMessage({ type: "OUTPUT_MOUNTED" });

            const handleUnload = () => {
                channel.postMessage({ type: "OUTPUT_UNMOUNTED" });
            };
            window.addEventListener("beforeunload", handleUnload);

            // Listen for state updates in Output window
            channel.onmessage = (event) => {
                const { type, data } = event.data;
                if (type === "STATE_UPDATE") {
                    if (data.project) useProjectStore.setState(data.project);
                    if (data.effects) useEffectsStore.setState(data.effects);

                    if (data.playbackSync) {
                        // playbackSync is a Record<sceneId, { currentTime, isPlaying }>
                        useProjectStore.setState((state) => ({
                            scenes: state.scenes.map(s => {
                                const sync = data.playbackSync[s.id];
                                if (sync) {
                                    return { ...s, currentTime: sync.currentTime, isPlaying: sync.isPlaying };
                                }
                                return s;
                            })
                        }));

                        // Also update global timeline if the RENDERED scene was synced
                        const currentProject = useProjectStore.getState();
                        const activeSceneId = currentProject.activeSceneId;
                        const projectSettings = currentProject.projectSettings;

                        const renderSceneId = projectSettings?.playingSceneId || activeSceneId;
                        const renderSync = renderSceneId ? data.playbackSync[renderSceneId] : null;

                        if (renderSync) {
                            // If project structure updated (data.project was present), we full-load to ensure keyframes are fresh.
                            // Otherwise, we just sync the clock (high-performance path).
                            if (data.project) {
                                const currentScenes = currentProject.scenes;
                                const nextScene = currentScenes.find(s => s.id === renderSceneId);

                                if (nextScene) {
                                    useTimelineStore.getState().loadSceneState({
                                        keyframes: nextScene.keyframes || [],
                                        duration: nextScene.timelineDuration || 30,
                                        currentTime: renderSync.currentTime,
                                        isPlaying: renderSync.isPlaying
                                    }, useProjectStore.getState().updateSurface);
                                }
                            } else {
                                // Fast path: Sync time and playback only
                                const timelineStore = useTimelineStore.getState();
                                const timeline = timelineStore.timeline;

                                if (timelineStore.currentTime !== renderSync.currentTime || timelineStore.isPlaying !== renderSync.isPlaying) {
                                    useTimelineStore.setState({
                                        currentTime: renderSync.currentTime,
                                        isPlaying: renderSync.isPlaying
                                    });
                                }

                                if (timeline) {
                                    const timeDiff = Math.abs(timeline.time() - renderSync.currentTime);
                                    if (timeDiff > 0.05) {
                                        timeline.time(renderSync.currentTime);
                                    }

                                    if (renderSync.isPlaying) {
                                        if (!timeline.isActive()) timeline.play();
                                    } else {
                                        if (timeline.isActive()) timeline.pause();
                                    }
                                }
                            }
                        }
                    }
                } else if (type === "AUDIO_UPDATE") {
                    if (data.levels) {
                        useAudioStore.getState().setLevels(data.levels);
                    }
                }
            };
        } else {
            // CONTROL WINDOW LOGIC
            channel.onmessage = (event) => {
                const { type } = event.data;
                if (type === "SYNC_REQUEST" || type === "OUTPUT_MOUNTED") {
                    useOutputStore.setState({ outputWindowOpen: true });
                    const state = useProjectStore.getState();
                    const effectsState = useEffectsStore.getState();
                    const timelineState = useTimelineStore.getState();

                    const playbackSync: Record<string, any> = {};
                    state.scenes.forEach(s => {
                        playbackSync[s.id] = {
                            currentTime: s.id === state.activeSceneId ? timelineState.currentTime : s.currentTime,
                            isPlaying: s.id === state.activeSceneId ? timelineState.isPlaying : s.isPlaying
                        };
                    });

                    channel.postMessage({
                        type: "STATE_UPDATE",
                        data: {
                            project: {
                                surfaces: state.surfaces,
                                mediaAssets: state.mediaAssets,
                                scenes: state.scenes,
                                projectSettings: state.projectSettings,
                                activeSceneId: state.activeSceneId,
                                currentProjectId: state.currentProjectId
                            },
                            effects: {
                                surfaceEffects: effectsState.surfaceEffects,
                                globalEffects: effectsState.globalEffects
                            },
                            playbackSync
                        }
                    });
                } else if (type === "OUTPUT_UNMOUNTED") {
                    useOutputStore.setState({ outputWindowOpen: false, outputWindowRef: null });
                }
            };

            // Shallow reference tracking — avoids JSON.stringify per frame
            let lastScenesRef: any = null;
            let lastMediaRef: any = null;
            let lastSettingsRef: any = null;
            let lastActiveSceneId: any = null;
            let lastCurrentProjectId: any = null;
            let lastSurfaceEffectsRef: any = null;
            let lastGlobalEffectsRef: any = null;
            // Playback sync: track per-scene time/playing to avoid stringify
            let lastPlaybackTimes: Record<string, number> = {};
            let lastPlaybackPlaying: Record<string, boolean> = {};
            let lastTimeRef = performance.now();

            const syncState = () => {
                const now = performance.now();
                const deltaTime = (now - lastTimeRef) / 1000;
                lastTimeRef = now;

                const projectState = useProjectStore.getState();
                const effectsState = useEffectsStore.getState();
                const timelineState = useTimelineStore.getState();

                const activeId = projectState.activeSceneId;
                const playingId = projectState.projectSettings.playingSceneId;

                const updateData: any = {};
                let hasUpdates = false;

                // Check for meaningful scene changes (ignoring currentTime updates which don't bump updatedAt)
                const scenesChanged =
                    !lastScenesRef ||
                    projectState.scenes.length !== lastScenesRef.length ||
                    projectState.scenes.some((s, i) => s.updatedAt !== lastScenesRef[i]?.updatedAt);

                const projectChanged =
                    scenesChanged ||
                    lastMediaRef !== projectState.mediaAssets ||
                    lastSettingsRef !== projectState.projectSettings ||
                    lastActiveSceneId !== projectState.activeSceneId ||
                    lastCurrentProjectId !== projectState.currentProjectId;

                if (projectChanged) {
                    updateData.project = {
                        surfaces: projectState.surfaces,
                        mediaAssets: projectState.mediaAssets,
                        scenes: projectState.scenes, // Send full objects, don't strip properties
                        projectSettings: projectState.projectSettings,
                        activeSceneId: projectState.activeSceneId,
                        currentProjectId: projectState.currentProjectId
                    };
                    lastScenesRef = projectState.scenes;
                    lastMediaRef = projectState.mediaAssets;
                    lastSettingsRef = projectState.projectSettings;
                    lastActiveSceneId = projectState.activeSceneId;
                    lastCurrentProjectId = projectState.currentProjectId;
                    hasUpdates = true;
                }

                // Shallow reference comparison for effects state
                if (lastSurfaceEffectsRef !== effectsState.surfaceEffects ||
                    lastGlobalEffectsRef !== effectsState.globalEffects) {
                    updateData.effects = {
                        surfaceEffects: effectsState.surfaceEffects,
                        globalEffects: effectsState.globalEffects
                    };
                    lastSurfaceEffectsRef = effectsState.surfaceEffects;
                    lastGlobalEffectsRef = effectsState.globalEffects;
                    hasUpdates = true;
                }

                // HIGH FREQUENCY PLAYBACK SYNC
                const playbackSync: Record<string, any> = {};
                let advanceBackgroundTime = false;
                const newBackgroundTimes: Record<string, number> = {};
                let playbackChanged = false;

                projectState.scenes.forEach(scene => {
                    let ct: number;
                    let ip: boolean;

                    if (scene.id === activeId) {
                        ct = timelineState.currentTime;
                        ip = timelineState.isPlaying;
                    } else if (scene.id === playingId && scene.isPlaying) {
                        // Advance time for the BACKGROUND live scene
                        ct = (scene.currentTime + deltaTime) % (scene.timelineDuration || 30);
                        ip = true;
                        newBackgroundTimes[scene.id] = ct;
                        advanceBackgroundTime = true;
                    } else {
                        ct = scene.currentTime;
                        ip = scene.isPlaying;
                    }

                    playbackSync[scene.id] = { currentTime: ct, isPlaying: ip };

                    // Epsilon comparison for time, direct comparison for playing
                    if (!playbackChanged) {
                        const prevTime = lastPlaybackTimes[scene.id];
                        const prevPlaying = lastPlaybackPlaying[scene.id];
                        if (prevTime === undefined || Math.abs(prevTime - ct) > 0.001 || prevPlaying !== ip) {
                            playbackChanged = true;
                        }
                    }
                });

                // Update the store with advanced background times
                if (advanceBackgroundTime) {
                    useProjectStore.setState(state => ({
                        scenes: state.scenes.map(s => {
                            if (newBackgroundTimes[s.id] !== undefined) {
                                return { ...s, currentTime: newBackgroundTimes[s.id] };
                            }
                            return s;
                        })
                    }));
                }

                if (playbackChanged) {
                    updateData.playbackSync = playbackSync;
                    // Update tracking
                    const nextTimes: Record<string, number> = {};
                    const nextPlaying: Record<string, boolean> = {};
                    for (const id in playbackSync) {
                        nextTimes[id] = playbackSync[id].currentTime;
                        nextPlaying[id] = playbackSync[id].isPlaying;
                    }
                    lastPlaybackTimes = nextTimes;
                    lastPlaybackPlaying = nextPlaying;
                    hasUpdates = true;
                }

                if (hasUpdates) {
                    channel.postMessage({ type: "STATE_UPDATE", data: updateData });
                }

                // Sync Audio Levels
                const audioState = useAudioStore.getState();
                if (audioState.isEnabled) {
                    channel.postMessage({ type: "AUDIO_UPDATE", data: { levels: audioState.levels } });
                }

                animationFrameId = requestAnimationFrame(syncState);
            };

            syncState();

            return () => {
                cancelAnimationFrame(animationFrameId);
                channel.close();
            };
        }

        return () => {
            channel.close();
        };
    }, [isOutput]);
}
