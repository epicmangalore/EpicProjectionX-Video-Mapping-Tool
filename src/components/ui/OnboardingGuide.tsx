"use client";

import { useState, useEffect } from "react";
import {
    Layers,
    MonitorPlay,
    Wand2,
    Play,
    ArrowRight,
    ArrowLeft,
    X,
    Sparkles,
    MousePointer,
    Palette,
    ChevronRight,
} from "lucide-react";

const STORAGE_KEY = "promap-has-onboarded";

interface OnboardingStep {
    icon: React.ReactNode;
    title: string;
    description: string;
    tips: string[];
    color: string; // gradient accent
}

const STEPS: OnboardingStep[] = [
    {
        icon: <Sparkles className="w-10 h-10" />,
        title: "Welcome to ProjectX",
        description:
            "ProjectX is a professional projection mapping tool that lets you map visuals onto any surface — walls, buildings, stages, and more.",
        tips: [
            "No complex setup needed — just add surfaces and assign media",
            "Works with images, videos, colors, and live text",
            "Output to a projector or secondary display in one click",
        ],
        color: "from-electric-cyan to-blue-500",
    },
    {
        icon: <Layers className="w-10 h-10" />,
        title: "Add Surfaces",
        description:
            "Surfaces are the rectangles on your canvas that represent the real-world areas you want to project onto. Each surface can display its own media.",
        tips: [
            "Click \"+ Surface\" in the Layers panel to add a blank rectangle",
            "Drag the corners to match the shape of your projection area",
            "Use \"Auto Detect\" if you have a photo of your setup",
        ],
        color: "from-electric-cyan to-teal-500",
    },
    {
        icon: <Palette className="w-10 h-10" />,
        title: "Assign Media",
        description:
            "Go to the Library tab to import images and videos. Then drag them onto surfaces, or select a surface and choose media from the properties panel.",
        tips: [
            "Supported formats: JPG, PNG, MP4, WebM, and more",
            "You can also add solid colors and text layers",
            "Each surface can have its own media source",
        ],
        color: "from-purple-500 to-electric-purple",
    },
    {
        icon: <MousePointer className="w-10 h-10" />,
        title: "Adjust & Align",
        description:
            "Use the toolbar tools to precisely align your surfaces to match the real-world projection surface.",
        tips: [
            "Select — move, resize, and rotate surfaces freely",
            "Corner Pin — drag individual corners for perspective correction",
            "Mesh Warp — bend surfaces to fit curved areas",
        ],
        color: "from-amber-500 to-orange-500",
    },
    {
        icon: <Play className="w-10 h-10" />,
        title: "Scenes & Playback",
        description:
            "Organize your show into scenes. Each scene has its own set of surfaces and media. Hit \"Go Live\" to play a scene.",
        tips: [
            "Create multiple scenes using the Scenes panel at the bottom-left",
            "Press number keys 1-9 to quickly trigger scenes",
            "Use the timeline to animate surface properties over time",
        ],
        color: "from-green-500 to-emerald-500",
    },
    {
        icon: <MonitorPlay className="w-10 h-10" />,
        title: "Launch Output",
        description:
            "When you're ready, click \"Launch Output\" to open a fullscreen window on your projector or secondary display.",
        tips: [
            "Connect a projector or second screen, then click \"Launch Output\"",
            "The output window mirrors your canvas in real time",
            "Everything you change on the canvas updates live on the output",
        ],
        color: "from-electric-cyan to-electric-purple",
    },
];

export function OnboardingGuide() {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const hasOnboarded = localStorage.getItem(STORAGE_KEY);
        if (!hasOnboarded) {
            setVisible(true);
        }
    }, []);

    if (!mounted || !visible) return null;

    const currentStep = STEPS[step];
    const isLast = step === STEPS.length - 1;
    const isFirst = step === 0;

    const handleNext = () => {
        if (isLast) {
            handleFinish();
        } else {
            setStep((s) => s + 1);
        }
    };

    const handleBack = () => {
        if (!isFirst) setStep((s) => s - 1);
    };

    const handleFinish = () => {
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, "true");
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-[520px] max-w-[90vw] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Top accent bar */}
                <div className={`h-1 bg-gradient-to-r ${currentStep.color}`} />

                {/* Close button */}
                <button
                    onClick={handleFinish}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                    title="Skip onboarding"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="p-8 pb-4">
                    {/* Icon */}
                    <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center text-white mb-5 shadow-lg`}
                    >
                        {currentStep.icon}
                    </div>

                    {/* Title & description */}
                    <h2 className="text-xl font-bold text-white mb-2">
                        {currentStep.title}
                    </h2>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                        {currentStep.description}
                    </p>

                    {/* Tips */}
                    <div className="space-y-2.5">
                        {currentStep.tips.map((tip, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-2.5 text-sm"
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-electric-cyan mt-0.5 shrink-0" />
                                <span className="text-zinc-300">{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 flex items-center justify-between border-t border-white/5">
                    {/* Step indicators */}
                    <div className="flex gap-1.5">
                        {STEPS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setStep(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === step
                                        ? "bg-electric-cyan w-5"
                                        : i < step
                                            ? "bg-electric-cyan/40"
                                            : "bg-zinc-700"
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center gap-2">
                        {!isFirst && (
                            <button
                                onClick={handleBack}
                                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back
                            </button>
                        )}
                        {isFirst && (
                            <button
                                onClick={handleFinish}
                                className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                Skip
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className={`px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r ${currentStep.color} text-white hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-lg`}
                        >
                            {isLast ? "Get Started" : "Next"}
                            {!isLast && (
                                <ArrowRight className="w-3.5 h-3.5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
