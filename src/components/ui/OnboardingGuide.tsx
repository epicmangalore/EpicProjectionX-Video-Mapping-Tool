"use client";

import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useUIStore } from "@/store/ui-store";

const STORAGE_KEY = "promap-has-onboarded";

export function OnboardingGuide() {
    const [run, setRun] = useState(false);
    const setToolMode = useUIStore((state) => state.setToolMode);

    useEffect(() => {
        const hasOnboarded = localStorage.getItem(STORAGE_KEY);
        if (!hasOnboarded) {
            setRun(true);
        }
    }, []);

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
                    <p>Let's get you started with your first projection mapping setup.</p>
                </div>
            ),
            placement: "center",
            disableBeacon: true,
        },
        {
            target: "[data-tour='toolbar']",
            content: "These are your main tools. Select (V), Transform (T), Corner Pin (C), and Mesh Warp (M).",
            placement: "bottom",
        },
        {
            target: "[data-tour='layers-panel']",
            content: "This panel manages your Surfaces and Layers. Think of a Surface as a quad you project onto a physical object.",
            placement: "right",
        },
        {
            target: "[data-tour='add-surface']",
            content: "Click here to add your first Surface. It will appear in the center of the canvas.",
            placement: "right",
        },
        {
            target: "[data-tour='assets-tab']",
            content: "Switch to the Assets tab to import images and videos.",
            placement: "right",
        },
        {
            target: "[data-tour='corner-pin']",
            content: "Use the Corner Pin tool to drag the corners of your surface to match your physical object.",
            placement: "bottom",
            data: {
                action: () => setToolMode("corner-pin"), // Auto-switch tool for user
            }
        },
        {
            target: "[data-tour='launch-output']",
            content: "When you're ready, click here to open the separate Output Window. Drag it to your projector display and maximize it.",
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
