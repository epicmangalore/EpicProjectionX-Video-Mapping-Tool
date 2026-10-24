"use client";

import { useEffect, useState, useCallback } from "react";
import { Laptop, Projector, Maximize2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECTOR_SETUP_COPY } from "@/constants/projectorSetup";

type OSType = "windows" | "mac" | "other";

function detectOS(): OSType {
  if (typeof window === "undefined") return "windows";
  const ua = navigator.userAgent.toLowerCase();
  const uaData = (navigator as any).userAgentData;
  
  if (uaData?.platform) {
    const platform = uaData.platform.toLowerCase();
    if (platform.includes("win")) return "windows";
    if (platform.includes("mac")) return "mac";
  }
  
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "mac";
  return "windows";
}

interface ProjectorSetupPanelProps {
  onFullscreen?: () => void;
}

export function ProjectorSetupPanel({ onFullscreen }: ProjectorSetupPanelProps) {
  const [os, setOs] = useState<OSType>("windows");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [displayDetectionBlocked, setDisplayDetectionBlocked] = useState(false);
  const [isOnSecondaryDisplay, setIsOnSecondaryDisplay] = useState(false);

  useEffect(() => {
    setOs(detectOS());
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = document.fullscreenElement !== null;
      setIsFullscreen(isFs);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Try to detect displays using Window Management API
  useEffect(() => {
    const detectDisplays = async () => {
      try {
        if (typeof (window as any).getScreenDetails === "function") {
          const screenDetails = await (window as any).getScreenDetails();
          // Check if we're on a secondary display
          // A simple heuristic: if there are multiple screens and current window is not on the primary
          if (screenDetails.screens && screenDetails.screens.length > 1) {
            // Try to determine if on secondary display
            const currentScreen = screenDetails.currentScreen;
            if (currentScreen && screenDetails.screens[0] && 
                (currentScreen.label !== screenDetails.screens[0].label || 
                 currentScreen.left !== screenDetails.screens[0].left)) {
              // Basic check - if window left is > 0 and different from primary, likely secondary
              if (typeof window !== "undefined" && window.screenLeft > 0) {
                setIsOnSecondaryDisplay(true);
              }
            }
          }
        } else {
          setDisplayDetectionBlocked(true);
        }
      } catch (error: any) {
        if (error.name === "NotAllowedError" || error.name === "SecurityError") {
          setDisplayDetectionBlocked(true);
        } else {
          setDisplayDetectionBlocked(true);
        }
      }
    };

    detectDisplays();
  }, []);

  const handleGoFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(() => {
          // If request fails, just mark as needing fullscreen
        });
      }
    }
    if (onFullscreen) {
      onFullscreen();
    }
  }, [onFullscreen]);

  // If fullscreen is active, don't show the panel
  if (isFullscreen) {
    return null;
  }

  const steps = [
    {
      number: 1,
      title: PROJECTOR_SETUP_COPY.steps.extendDisplay.title,
      body: PROJECTOR_SETUP_COPY.steps.extendDisplay.body,
      complete: isOnSecondaryDisplay,
    },
    {
      number: 2,
      title: PROJECTOR_SETUP_COPY.steps.dragWindow.title,
      body: PROJECTOR_SETUP_COPY.steps.dragWindow.body,
      complete: isOnSecondaryDisplay,
    },
    {
      number: 3,
      title: PROJECTOR_SETUP_COPY.steps.goFullscreen.title,
      body: PROJECTOR_SETUP_COPY.steps.goFullscreen.body,
      complete: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5">
          <h1 className="text-lg font-semibold text-white mb-1">
            {PROJECTOR_SETUP_COPY.title}
          </h1>
          <p className="text-sm text-zinc-400">
            {PROJECTOR_SETUP_COPY.subtitle}
          </p>
        </div>

        {/* Diagram */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center text-center">
              <div className="p-2 mb-2 bg-white/5 rounded-lg">
                <Laptop className="w-6 h-6 text-zinc-300" aria-label="This computer" />
              </div>
              <div className="text-xs font-medium text-white">
                {PROJECTOR_SETUP_COPY.diagram.computer.label}
              </div>
              <div className="text-xs text-zinc-500">
                {PROJECTOR_SETUP_COPY.diagram.computer.description}
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="p-2 mb-2 bg-white/5 rounded-lg">
                <Projector className="w-6 h-6 text-zinc-300" aria-label="Projector" />
              </div>
              <div className="text-xs font-medium text-white">
                {PROJECTOR_SETUP_COPY.diagram.projector.label}
              </div>
              <div className="text-xs text-zinc-500">
                {PROJECTOR_SETUP_COPY.diagram.projector.description}
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-4">
          {steps.map((step) => (
            <div key={step.number} className="space-y-2">
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                    step.complete
                      ? "bg-green-600 text-white"
                      : "bg-white/10 text-white"
                  )}
                >
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      "text-sm font-medium",
                      step.complete ? "text-green-400" : "text-white"
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {step.body}
                  </p>
                </div>
              </div>

              {step.number === 1 && (
                <div className="ml-7 space-y-2">
                  <div className="flex bg-white/5 rounded-md p-0.5">
                    <button
                      onClick={() => setOs("windows")}
                      className={cn(
                        "flex-1 px-2 py-1 text-xs rounded transition-colors focus:outline-none focus:ring-1 focus:ring-white/20",
                        os === "windows"
                          ? "bg-white/10 text-white"
                          : "text-zinc-400 hover:text-white"
                      )}
                      aria-pressed={os === "windows"}
                    >
                      Windows
                    </button>
                    <button
                      onClick={() => setOs("mac")}
                      className={cn(
                        "flex-1 px-2 py-1 text-xs rounded transition-colors focus:outline-none focus:ring-1 focus:ring-white/20",
                        os === "mac"
                          ? "bg-white/10 text-white"
                          : "text-zinc-400 hover:text-white"
                      )}
                      aria-pressed={os === "mac"}
                    >
                      Mac
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 bg-white/5 rounded px-2 py-1.5">
                    {os === "windows"
                      ? PROJECTOR_SETUP_COPY.osInstructions.windows
                      : PROJECTOR_SETUP_COPY.osInstructions.mac}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Primary button */}
        <div className="px-5 py-4 border-t border-white/5 space-y-2">
          <button
            onClick={handleGoFullscreen}
            className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
            aria-label="Go fullscreen"
          >
            <div className="flex items-center justify-center gap-2">
              <Maximize2 className="w-4 h-4" />
              {PROJECTOR_SETUP_COPY.button.label}
            </div>
          </button>
          <p className="text-xs text-zinc-500 text-center">
            {PROJECTOR_SETUP_COPY.button.helper}
          </p>
        </div>

        {/* Notice */}
        {displayDetectionBlocked && (
          <div className="px-5 py-3 border-t border-white/5 bg-orange-950/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-orange-400">
                  {PROJECTOR_SETUP_COPY.notice.title}
                </h4>
                <p className="text-xs text-orange-300/80">
                  {PROJECTOR_SETUP_COPY.notice.body}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
