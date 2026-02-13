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
                    <h3 className="font-bold text-lg mb-1 text-electric-cyan">Welcome to ProjectionX</h3>
                    <p className="text-sm text-zinc-300">Let's quickly cover the essentials to get you mapping.</p>
                </div>
            ),
            placement: "center",
            disableBeacon: true,
        },
        {
            target: "[data-tour='toolbar']",
            content: "Use the Toolbar to create surfaces and shapes. Try the Shape Library for 25+ presets.",
            placement: "bottom",
        },
        {
            target: "[data-tour='assets-tab']",
            content: "Import your media here. Simply drag and drop assets onto your surfaces.",
            placement: "right",
        },
        {
            target: "[data-tour='audio-panel']",
            content: "Link visual properties to audio bands or apply effects for dynamic visuals.",
            placement: "left",
        },
        {
            target: "[data-tour='export-menu']",
            content: "Save as .projectx or export to pro tools. Open the Output window to start projecting.",
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
