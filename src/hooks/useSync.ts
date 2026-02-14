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
            // Request initial state
            channel.postMessage({ type: "SYNC_REQUEST" });

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
                        const currentProject = data.project || useProjectStore.getState();
                        const activeSceneId = currentProject.activeSceneId;
                        const projectSettings = currentProject.projectSettings;

                        const renderSceneId = projectSettings?.playingSceneId || activeSceneId;
                        const renderSync = renderSceneId ? data.playbackSync[renderSceneId] : null;

                        if (renderSync) {
                            // Find the scene in the CURRENT store state (which was updated above)
                            const currentScenes = useProjectStore.getState().scenes;
                            const nextScene = currentScenes.find(s => s.id === renderSceneId);

                            if (nextScene) {
                                useTimelineStore.getState().loadSceneState({
                                    keyframes: nextScene.keyframes || [],
                                    duration: nextScene.timelineDuration || 30,
                                    currentTime: renderSync.currentTime,
                                    isPlaying: renderSync.isPlaying
                                }, useProjectStore.getState().updateSurface);
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
                if (event.data.type === "SYNC_REQUEST") {
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
                }
            };

            let lastProjectStateStr = "";
            let lastEffectsStateStr = "";
            let lastPlaybackSyncStr = "";
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

                // Sync the project and effects state (throttled by stringify check)
                const projectData = {
                    surfaces: projectState.surfaces,
                    mediaAssets: projectState.mediaAssets,
                    scenes: projectState.scenes.map(s => ({
                        ...s,
                        currentTime: undefined, // Omit from static sync
                        isPlaying: undefined    // Omit from static sync
                    })),
                    projectSettings: projectState.projectSettings,
                    activeSceneId: projectState.activeSceneId,
                    currentProjectId: projectState.currentProjectId
                };

                const currentProjectStr = JSON.stringify(projectData);
                const currentEffectsStr = JSON.stringify({
                    surfaceEffects: effectsState.surfaceEffects,
                    globalEffects: effectsState.globalEffects
                });

                const updateData: any = {};
                let hasUpdates = false;

                if (currentProjectStr !== lastProjectStateStr) {
                    updateData.project = projectData;
                    lastProjectStateStr = currentProjectStr;
                    hasUpdates = true;
                }
                if (currentEffectsStr !== lastEffectsStateStr) {
                    updateData.effects = {
                        surfaceEffects: effectsState.surfaceEffects,
                        globalEffects: effectsState.globalEffects
                    };
                    lastEffectsStateStr = currentEffectsStr;
                    hasUpdates = true;
                }

                // HIGH FREQUENCY PLAYBACK SYNC
                const playbackSync: Record<string, any> = {};
                let advanceBackgroundTime = false;
                const newBackgroundTimes: Record<string, number> = {};

                projectState.scenes.forEach(scene => {
                    if (scene.id === activeId) {
                        playbackSync[scene.id] = {
                            currentTime: timelineState.currentTime,
                            isPlaying: timelineState.isPlaying
                        };
                    } else if (scene.id === playingId && scene.isPlaying) {
                        // Advance time for the BACKGROUND live scene
                        const cTime = (scene.currentTime + deltaTime) % (scene.timelineDuration || 30);
                        playbackSync[scene.id] = { currentTime: cTime, isPlaying: true };
                        newBackgroundTimes[scene.id] = cTime;
                        advanceBackgroundTime = true;
                    } else {
                        playbackSync[scene.id] = {
                            currentTime: scene.currentTime,
                            isPlaying: scene.isPlaying
                        };
                    }
                });

                // Update the store with advanced background times (buffered to once per few frames if needed, but setState is fine)
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

                const currentPlaybackStr = JSON.stringify(playbackSync);
                if (currentPlaybackStr !== lastPlaybackSyncStr) {
                    updateData.playbackSync = playbackSync;
                    lastPlaybackSyncStr = currentPlaybackStr;
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
