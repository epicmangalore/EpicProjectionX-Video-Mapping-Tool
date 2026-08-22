"use client";

import { useEffect, useRef } from "react";

/**
 * Global hidden container for video elements used as textures.
 * Some browsers/environments require video elements to be in the DOM 
 * to play correctly and avoid being throttled or garbage collected.
 * 
 * CRITICAL: This container MUST be initialized before any video elements are created.
 */
export function VideoContainer() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== "undefined" && containerRef.current) {
            (window as any).globalVideoContainer = containerRef.current;
            (window as any).globalVideoContainerReady = true;

            console.log("✓ Global video container initialized");

            // Dispatch event to notify that container is ready
            window.dispatchEvent(new CustomEvent("video-container-ready"));
        }

        return () => {
            if (typeof window !== "undefined") {
                (window as any).globalVideoContainer = null;
                (window as any).globalVideoContainerReady = false;
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            id="global-video-container"
            style={{
                position: "fixed",
                top: 0,
                left: "-1000px", // Move far off screen
                width: "100px",   // Non-zero size
                height: "100px",
                overflow: "hidden",
                opacity: 0.001,   // Non-zero opacity to avoid throttling
                pointerEvents: "none",
                zIndex: -1000,
                background: "black"
            }}
        />
    );
}
