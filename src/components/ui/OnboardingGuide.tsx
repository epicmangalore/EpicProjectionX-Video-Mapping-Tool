"use client";

import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useUIStore } from "@/store/ui-store";

const STORAGE_KEY = "promap-has-onboarded";

export function OnboardingGuide() {
    const [run, setRun] = useState(false);
    const [mounted, setMounted] = useState(false);
    const setToolMode = useUIStore((state) => state.setToolMode);

    useEffect(() => {
        setMounted(true);
        const hasOnboarded = localStorage.getItem(STORAGE_KEY);
        if (!hasOnboarded) {
            setRun(true);
        }
    }, []);

    if (!mounted) return null;

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem(STORAGE_KEY, "true");
        }
    };

    const steps: Step[] = [
        {
            target: "body",
            content: (
                <div className="text-left">
                    <h3 className="font-bold text-lg mb-2 text-electric-cyan">Welcome to ProjectionX!</h3>
                    <p className="mb-2">A professional projection mapping tool with advanced audio reactivity and creative effects.</p>
                    <p className="text-sm text-zinc-400">Let's explore the key features to get you started!</p>
                </div>
            ),
            placement: "center",
            disableBeacon: true,
        },
        {
            target: "[data-tour='toolbar']",
            content: "These are your main tools: Select (V), Transform (T), Corner Pin (C), Mesh Warp (M), and Pen Tool for custom shapes.",
            placement: "bottom",
        },
        {
            target: "[data-tour='layers-panel']",
            content: "This panel manages your Surfaces. Each Surface is a quad you can map to physical objects in your scene.",
            placement: "right",
        },
        {
            target: "[data-tour='add-surface']",
            content: "Click 'Surface' to add a rectangular surface, or 'Text' for text layers. You can also use the Shape Library for preset shapes!",
            placement: "right",
        },
        {
            target: "[data-tour='shape-library']",
            content: "NEW! Access 25+ preset shapes including triangles, stars, polygons, and arrows. Perfect for creative projection mapping.",
            placement: "right",
        },
        {
            target: "[data-tour='assets-tab']",
            content: "Switch to the Assets tab to import images, videos, and colors. Drag assets onto surfaces to apply them.",
            placement: "right",
        },
        {
            target: "[data-tour='corner-pin']",
            content: "Use the Corner Pin tool to align surface corners with your physical projection targets. Essential for mapping!",
            placement: "bottom",
            data: {
                action: () => setToolMode("corner-pin"),
            }
        },
        {
            target: "[data-tour='audio-panel']",
            content: "NEW! Audio Reactivity lets you sync visuals to music. Map audio bands (bass, mid, treble, energy, etc.) to visual properties like opacity, scale, color, and more!",
            placement: "left",
        },
        {
            target: "[data-tour='video-sync']",
            content: "NEW! Use the Video Sync button to force all video surfaces to match the timeline position. Prevents drift during live performances.",
            placement: "bottom",
        },
        {
            target: "[data-tour='effects-panel']",
            content: "Apply visual effects like blur, chromatic aberration, color grading, and distortion. Stack multiple effects for unique looks!",
            placement: "left",
        },
        {
            target: "[data-tour='timeline-panel']",
            content: "The timeline controls playback and lets you create keyframe animations. Sync your entire project to music or BPM.",
            placement: "top",
        },
        {
            target: "[data-tour='export-menu']",
            content: "NEW! Export your project to After Effects or Premiere Pro for further editing. Also save as .projectx files to share with others!",
            placement: "bottom",
        },
        {
            target: "[data-tour='launch-output']",
            content: "When ready to project, open the Output Window. Drag it to your projector display and go fullscreen for the final output!",
            placement: "bottom-end",
        },
    ];

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: "#06b6d4", // electric-cyan
                    textColor: "#fafafa",
                    backgroundColor: "#18181b", // zinc-900
                    arrowColor: "#18181b",
                },
                buttonNext: {
                    backgroundColor: "#06b6d4",
                    color: "#000",
                    fontWeight: "bold",
                    borderRadius: "4px",
                },
                buttonBack: {
                    color: "#a1a1aa",
                },
                tooltipContainer: {
                    textAlign: "left",
                },
                tooltipContent: {
                    padding: "10px 0",
                },
            }}
        />
    );
}
