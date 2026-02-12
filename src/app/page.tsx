"use client";

import { ProjectionCanvas } from "@/components/canvas/ProjectionCanvas";
import { SurfaceProperties } from "@/components/panels/SurfaceProperties";
import { TimelinePanel } from "@/components/panels/TimelinePanel";
import { SceneList } from "@/components/panels/CueList";
import { LeftSidebar } from "@/components/panels/LeftSidebar";
import { ProjectMenu } from "@/components/ui/ProjectMenu";
import { PerformanceMonitor } from "@/components/ui/PerformanceMonitor";
import { useUIStore } from "@/store/ui-store";
import { useProjectStore } from "@/store/project-store";
import { useOutputStore } from "@/store/output-store";
import { useHotkeys, APP_HOTKEYS } from "@/hooks/useHotkeys";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useSync } from "@/hooks/useSync";
import { MIDIMapper } from "@/components/panels/MIDIMapper";
import { CanvasSettings } from "@/components/panels/CanvasSettings";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";
import { useState, useEffect } from "react";
import { MousePointer2, Move, Grid3x3, Monitor, Layers, Zap, Settings as SettingsIcon, Pen, ChevronDown, ArrowRight } from "lucide-react";
import { LightBeamButton } from "@/components/ui/LightBeamButton";
import { saveProjectFile } from "@/lib/project-file-manager";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { WarpControlBar } from "@/components/canvas/WarpControlBar";

export default function Home() {
    const setToolMode = useUIStore((state) => state.setToolMode);
    const toolMode = useUIStore((state) => state.toolMode);
    const penSubMode = useUIStore((state) => state.penSubMode);
    const setPenSubMode = useUIStore((state) => state.setPenSubMode);
    const [penDropdownOpen, setPenDropdownOpen] = useState(false);
    const openOutputWindow = useOutputStore((state) => state.openOutputWindow);

    // Activate Auto-Save and Sync
    useAutoSave();
    useSync();

    // UI State for MIDI Panel
    const [showMIDIPanel, setShowMIDIPanel] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const deleteSurface = useProjectStore((state) => state.deleteSurface);
    const surfaces = useProjectStore((state) => state.getActiveSurfaces());
    const initializeMeshWarp = useProjectStore((state) => state.initializeMeshWarp);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const deselectAll = useProjectStore((state) => state.deselectAll);

    const handleMeshWarpClick = () => {
        if (selectedIds.length > 0) {
            const surface = surfaces.find(s => s.id === selectedIds[0]);
            if (surface && !surface.meshWarp) {
                initializeMeshWarp(surface.id);
            }
        }
        setToolMode("mesh-warp");
    };

    const undo = useProjectStore((state) => state.undo);
    const redo = useProjectStore((state) => state.redo);
    const copySurface = useProjectStore((state) => state.copySurface);
    const pasteSurface = useProjectStore((state) => state.pasteSurface);
    const duplicateSurfaces = useProjectStore((state) => state.duplicateSurfaces);
    const bringToFront = useProjectStore((state) => state.bringToFront);
    const sendToBack = useProjectStore((state) => state.sendToBack);
    // const groupSurfaces = useProjectStore((state) => state.groupSurfaces); // TODO: Implement grouping
    // const ungroupSurfaces = useProjectStore((state) => state.ungroupSurfaces); // TODO: Implement ungrouping

    // Initialize Global Hotkeys
    useHotkeys([
        // Tools
        { key: APP_HOTKEYS.SELECT_MODE, callback: () => setToolMode("select") },
        { key: APP_HOTKEYS.CORNER_PIN_MODE, callback: () => setToolMode("corner-pin") },
        { key: APP_HOTKEYS.MESH_WARP_MODE, callback: () => setToolMode("mesh-warp") },
        { key: APP_HOTKEYS.PEN_MODE, callback: () => setToolMode("pen") },
        { key: APP_HOTKEYS.PEN_DRAW.key, ctrl: APP_HOTKEYS.PEN_DRAW.ctrl, callback: () => setPenSubMode("draw") },
        { key: APP_HOTKEYS.PEN_EDIT.key, ctrl: APP_HOTKEYS.PEN_EDIT.ctrl, callback: () => setPenSubMode("edit") },
        { key: APP_HOTKEYS.HAND_MODE, callback: () => setToolMode("hand") }, // Placeholder if not impl yet

        // Clipboard & Edit
        {
            key: APP_HOTKEYS.DELETE, callback: () => {
                selectedIds.forEach(id => deleteSurface(id));
                deselectAll();
            }
        },
        {
            key: APP_HOTKEYS.DUPLICATE.key,
            ctrl: APP_HOTKEYS.DUPLICATE.ctrl,
            callback: () => duplicateSurfaces(selectedIds)
        },
        {
            key: APP_HOTKEYS.COPY.key,
            ctrl: APP_HOTKEYS.COPY.ctrl,
            callback: () => {
                if (selectedIds.length > 0) copySurface(selectedIds[0]); // Currently only single copy support
            }
        },
        {
            key: APP_HOTKEYS.PASTE.key,
            ctrl: APP_HOTKEYS.PASTE.ctrl,
            callback: () => pasteSurface()
        },
        {
            key: APP_HOTKEYS.CUT.key,
            ctrl: APP_HOTKEYS.CUT.ctrl,
            callback: () => {
                if (selectedIds.length > 0) {
                    copySurface(selectedIds[0]);
                    deleteSurface(selectedIds[0]);
                }
            }
        },
        { key: APP_HOTKEYS.SELECT_ALL.key, ctrl: APP_HOTKEYS.SELECT_ALL.ctrl, callback: () => useProjectStore.getState().selectAll() },

        // Undo / Redo
        { key: APP_HOTKEYS.UNDO.key, ctrl: APP_HOTKEYS.UNDO.ctrl, shift: false, callback: () => undo() },
        { key: APP_HOTKEYS.REDO.key, ctrl: APP_HOTKEYS.REDO.ctrl, shift: true, callback: () => redo() },

        // Arrangement
        { key: APP_HOTKEYS.BRING_FORWARD.key, ctrl: APP_HOTKEYS.BRING_FORWARD.ctrl, callback: () => selectedIds.forEach(id => bringToFront(id)) },
        { key: APP_HOTKEYS.SEND_BACKWARD.key, ctrl: APP_HOTKEYS.SEND_BACKWARD.ctrl, callback: () => selectedIds.forEach(id => sendToBack(id)) },

        // Selection
        { key: APP_HOTKEYS.DESELECT_ALL, callback: () => deselectAll() },

        // Save
        {
            key: APP_HOTKEYS.SAVE.key, ctrl: APP_HOTKEYS.SAVE.ctrl, callback: () => {
                saveProjectFile().catch(err => console.error("Save failed:", err));
            }
        },

        // Misc
        { key: "m", ctrl: true, callback: () => setShowMIDIPanel((prev) => !prev) }, // Ctrl+M for MIDI
    ]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

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
                                        onClick={handleMeshWarpClick}
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

                            {/* Pen Tool with Draw/Edit Dropdown */}
                            <div className="relative">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center">
                                            <button
                                                onClick={() => setToolMode("pen")}
                                                className={`px-2 py-1 rounded-sm text-xs transition-colors flex items-center gap-1.5 ${toolMode === "pen"
                                                    ? "bg-zinc-800 text-white shadow-sm"
                                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                                    }`}
                                            >
                                                <Pen className="w-3 h-3" />
                                                <span className="hidden lg:inline">{penSubMode === "draw" ? "Draw" : "Pen"}</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPenDropdownOpen(!penDropdownOpen);
                                                }}
                                                className={`px-1 py-1 rounded-sm text-xs transition-colors ${toolMode === "pen"
                                                    ? "bg-zinc-800 text-white/50 hover:text-white"
                                                    : "text-zinc-600 hover:text-zinc-400"
                                                    }`}
                                            >
                                                <ChevronDown className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{penSubMode === "draw" ? "Pen Draw Tool" : "Pen Edit Tool"} (P)</TooltipContent>
                                </Tooltip>

                                {penDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setPenDropdownOpen(false)} />
                                        <div className="absolute top-full left-0 mt-1 w-44 bg-zinc-900/95 border border-white/10 rounded-lg shadow-2xl backdrop-blur-md z-50 py-1">
                                            <button
                                                onClick={() => {
                                                    setPenSubMode("draw");
                                                    setPenDropdownOpen(false);
                                                }}
                                                className={`w-full px-3 py-2 text-xs text-left hover:bg-white/10 flex items-center justify-between ${penSubMode === "draw" ? "text-electric-cyan" : "text-zinc-300"}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Pen className="w-3.5 h-3.5" />
                                                    <span>Draw Tool</span>
                                                </div>
                                                <span className="text-[9px] opacity-40 font-mono">⌘F</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setPenSubMode("edit");
                                                    setPenDropdownOpen(false);
                                                }}
                                                className={`w-full px-3 py-2 text-xs text-left hover:bg-white/10 flex items-center justify-between ${penSubMode === "edit" ? "text-electric-cyan" : "text-zinc-300"}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Pen className="w-3.5 h-3.5" />
                                                    <span>Edit Tool</span>
                                                </div>
                                                <span className="text-[9px] opacity-40 font-mono">⌘E</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
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

                        <LightBeamButton
                            onClick={openOutputWindow}
                            className="ml-2 px-5 py-2 text-xs font-bold"
                            gradientColors={["#00f0ff", "#8b5cf6", "#00f0ff"]}
                            data-tour="launch-output"
                        >
                            LAUNCH OUTPUT <ArrowRight size={14} />
                        </LightBeamButton>
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
                                <WarpControlBar />
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

                        {/* Bottom Panel: Timeline & Scenes */}
                        <div className="h-64 border-t border-white/5 bg-zinc-900 relative z-30 flex">
                            {/* Scenes Panel (Fixed Width) */}
                            <div className="w-64 border-r border-white/5">
                                <SceneList />
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
