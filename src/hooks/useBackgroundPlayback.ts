"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Hook to ensure playback continues when browser tab is hidden.
 * Critical for projection mapping where output might be on external display.
 */
export function useBackgroundPlayback() {
    const wasPlayingRef = useRef(false);
    const lastTimeRef = useRef(0);

    useEffect(() => {
        // Configure GSAP to handle background tabs better
        // Disable lag smoothing to prevent GSAP from trying to "catch up"
        // when tab becomes visible again
        gsap.ticker.lagSmoothing(0);

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab is now hidden
                console.log("📴 Tab hidden - maintaining playback in background");

                // Find all video elements and ensure they keep playing
                const videos = document.querySelectorAll('video');
                videos.forEach(video => {
                    if (!video.paused) {
                        wasPlayingRef.current = true;
                        // Force play to prevent browser auto-pause
                        video.play().catch((err) => {
                            console.warn("Could not maintain video playback:", err);
                        });
                    }
                });

                lastTimeRef.current = Date.now();
            } else {
                // Tab is now visible
                console.log("📱 Tab visible - verifying playback state");

                // If videos were playing, ensure they're still playing
                if (wasPlayingRef.current) {
                    const videos = document.querySelectorAll('video');
                    videos.forEach(video => {
                        if (video.paused) {
                            video.play().catch((err) => {
                                console.warn("Could not resume video playback:", err);
                            });
                        }
                    });
                }

                wasPlayingRef.current = false;
            }
        };

        // Set up visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Periodic check to ensure videos stay playing (fallback)
        const intervalId = setInterval(() => {
            if (document.hidden) {
                const videos = document.querySelectorAll('video');
                videos.forEach(video => {
                    // If video should be playing but is paused, restart it
                    if (video.readyState >= 2 && video.paused && !video.ended) {
                        video.play().catch(() => {
                            // Ignore errors
                        });
                    }
                });
            }
        }, 1000); // Check every second when tab is hidden

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId);
            // Restore default GSAP lag smoothing on cleanup
            gsap.ticker.lagSmoothing(500, 33);
        };
    }, []);
}
