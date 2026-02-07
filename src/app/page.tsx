"use client";

import { ProjectionCanvas } from "@/components/canvas/ProjectionCanvas";
import { SurfaceProperties } from "@/components/panels/SurfaceProperties";
import { TimelinePanel } from "@/components/panels/TimelinePanel";
import { CueList } from "@/components/panels/CueList";
import { LeftSidebar } from "@/components/panels/LeftSidebar";
import { ProjectMenu } from "@/components/ui/ProjectMenu";
import { PerformanceMonitor } from "@/components/ui/PerformanceMonitor";
import { useUIStore } from "@/store/ui-store";
import { useOutputStore } from "@/store/output-store";
import { useHotkeys, APP_HOTKEYS } from "@/hooks/useHotkeys";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useSync } from "@/hooks/useSync";
import { MIDIMapper } from "@/components/panels/MIDIMapper";
import { CanvasSettings } from "@/components/panels/CanvasSettings";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";
import { useState } from "react";
import { MousePointer2, Move, Grid3x3, Monitor, Layers, Zap, Settings as SettingsIcon, Pen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Home() {
    const setToolMode = useUIStore((state) => state.setToolMode);
    const toolMode = useUIStore((state) => state.toolMode);
    const openOutputWindow = useOutputStore((state) => state.openOutputWindow);

    // Activate Auto-Save and Sync
    useAutoSave();
    useSync();

    // UI State for MIDI Panel
    const [showMIDIPanel, setShowMIDIPanel] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Initialize Global Hotkeys
    useHotkeys([
        { key: APP_HOTKEYS.SELECT_MODE, callback: () => setToolMode("select") },
        { key: APP_HOTKEYS.CORNER_PIN_MODE, callback: () => setToolMode("corner-pin") },
        { key: APP_HOTKEYS.MESH_WARP_MODE, callback: () => setToolMode("mesh-warp") },
        { key: APP_HOTKEYS.PEN_MODE, callback: () => setToolMode("pen") },
        { key: "m", ctrl: true, callback: () => setShowMIDIPanel((prev) => !prev) }, // Ctrl+M for MIDI
    ]);

    return (
        <TooltipProvider>
            <main className="h-screen w-screen overflow-hidden bg-zinc-950 flex flex-col text-zinc-100 font-sans">
                <OnboardingGuide />
                {/* Top Toolbar - Pro Minimalist */}
                <header className="h-12 bg-zinc-900 border-b border-white/5 flex items-center px-4 gap-4 z-50">
                    <div className="flex items-center gap-2">
                        <img
                            src="/logo.svg"
                            alt="ProjectionX"
                            className="h-8 w-auto" // Adjust height to fit header
                        />
                    </div>

                    <div className="h-4 w-px bg-white/10 mx-2" />

                    {/* File Menu Component */}
                    <ProjectMenu />

                    <div className="flex-1 flex justify-center">
                        {/* Tool Modes - Flat Segmented Control */}
                        <div className="flex bg-zinc-950/50 rounded p-0.5 border border-white/5" data-tour="toolbar">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setToolMode("select")}
                                        className={`px-3 py-1 rounded-sm text-xs transition-colors flex items-center gap-2 ${toolMode === "select"
                                            ? "bg-zinc-800 text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                            }`}
                                    >
                                        <MousePointer2 className="w-3 h-3" />
                                        <span className="hidden lg:inline">Select</span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Select (V)</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setToolMode("corner-pin")}
                                        className={`px-3 py-1 rounded-sm text-xs transition-colors flex items-center gap-2 ${toolMode === "corner-pin"
                                            ? "bg-zinc-800 text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                            }`}
                                        data-tour="corner-pin"
                                    >
                                        <Grid3x3 className="w-3 h-3" />
                                        <span className="hidden lg:inline">Corner Pin</span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Corner Pin (C)</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setToolMode("mesh-warp")}
                                        className={`px-3 py-1 rounded-sm text-xs transition-colors flex items-center gap-2 ${toolMode === "mesh-warp"
                                            ? "bg-zinc-800 text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                            }`}
                                    >
                                        <Layers className="w-3 h-3" />
                                        <span className="hidden lg:inline">Mesh Warp</span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Mesh Warp (M)</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setToolMode("pen")}
                                        className={`px-3 py-1 rounded-sm text-xs transition-colors flex items-center gap-2 ${toolMode === "pen"
                                            ? "bg-zinc-800 text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                            }`}
                                    >
                                        <Pen className="w-3 h-3" />
                                        <span className="hidden lg:inline">Pen</span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Pen Tool (P)</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="flex gap-2 items-center relative">
                        <button
                            onClick={() => setShowMIDIPanel(!showMIDIPanel)}
                            className={`p-1.5 rounded transition-all ${showMIDIPanel
                                ? "bg-electric-cyan text-black"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}
                            title="MIDI Mapping"
                        >
                            <Zap className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-1.5 rounded transition-all ${showSettings
                                ? "bg-zinc-800 text-white"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}
                            title="Canvas Settings"
                        >
                            <SettingsIcon className="w-4 h-4" />
                        </button>

                        {/* Settings Popover */}
                        {showSettings && (
                            <div className="absolute top-12 right-0 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <CanvasSettings />
                            </div>
                        )}

                        <button
                            onClick={openOutputWindow}
                            className="ml-2 px-3 py-1.5 text-xs font-bold bg-zinc-100 text-zinc-900 hover:bg-white rounded transition-all shadow-sm active:scale-95 border border-white/5"
                            data-tour="launch-output"
                        >
                            LAUNCH OUTPUT
                        </button>
                    </div>
                </header>

                {/* Application Body */}
                <div className="flex-1 flex overflow-hidden relative">
                    {/* Unified Left Sidebar */}
                    <LeftSidebar />

                    {/* Main Workspace */}
                    <div className="flex-1 flex flex-col relative">
                        <div className="flex-1 relative bg-zinc-900 overflow-hidden">
                            {/* 3D Canvas */}
                            {/* Centered canvas container with padding for "Artboard" feel */}
                            <div className="absolute inset-4 bg-black border border-white/5 shadow-2xl rounded-sm overflow-hidden">
                                <ProjectionCanvas />
                            </div>

                            {/* Performance Monitor Overlay */}
                            <PerformanceMonitor />

                            {/* MIDI Panel Overlay */}
                            {showMIDIPanel && (
                                <div className="absolute top-4 right-4 bottom-4 w-64 z-50 animate-in slide-in-from-right-4 duration-300">
                                    <MIDIMapper />
                                </div>
                            )}
                        </div>

                        {/* Bottom Panel: Timeline & Cues */}
                        <div className="h-64 border-t border-white/5 bg-zinc-900 relative z-30 flex">
                            {/* Cues Panel (Fixed Width) */}
                            <div className="w-64 border-r border-white/5">
                                <CueList />
                            </div>

                            {/* Timeline Panel (Flexible) */}
                            <div className="flex-1">
                                <TimelinePanel />
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Properties */}
                    <div className="w-80 border-l border-white/5 bg-zinc-900 flex flex-col">
                        <SurfaceProperties />
                    </div>
                </div>
            </main>
        </TooltipProvider>
    );
}
