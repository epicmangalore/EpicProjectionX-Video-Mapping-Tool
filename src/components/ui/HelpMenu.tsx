"use client";

import { useState, useEffect } from "react";
import {
    HelpCircle,
    RefreshCcw,
    Download,
    ChevronDown,
    ExternalLink,
    Zap
} from "lucide-react";
import { toast } from "@/store/toast-store";

export function HelpMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<string>("idle");
    const [downloadProgress, setDownloadProgress] = useState<number>(0);

    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).electron?.onUpdateStatus) {
            const cleanup = (window as any).electron.onUpdateStatus((status: string, info: any) => {
                setUpdateStatus(status);
                if (status === "downloading" && typeof info === "number") {
                    setDownloadProgress(info);
                }

                if (status === "available") {
                    toast.info("Update available! Downloading...");
                } else if (status === "downloaded") {
                    toast.success("Update downloaded! Restart to apply.");
                } else if (status === "not-available" && updateStatus === "checking") {
                    toast.info("You are on the latest version.");
                } else if (status === "error") {
                    toast.error(`Update error: ${info}`);
                }
            });
            return cleanup;
        }
    }, [updateStatus]);

    const handleCheckUpdates = () => {
        if (typeof window !== "undefined" && (window as any).electron?.checkForUpdates) {
            setUpdateStatus("checking");
            (window as any).electron.checkForUpdates();
        }
    };

    const handleRestart = () => {
        if (typeof window !== "undefined" && (window as any).electron?.restartApp) {
            (window as any).electron.restartApp();
        }
    };

    const handleInstall = () => {
        if (typeof window !== "undefined" && (window as any).electron?.quitAndInstall) {
            (window as any).electron.quitAndInstall();
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-1.5 text-sm glass glass-hover rounded-md flex items-center gap-2"
                title="Help and Updates"
            >
                <HelpCircle className="w-4 h-4 text-electric-cyan" />
                Help
                <ChevronDown className="w-3 h-3 text-zinc-500" />
                {updateStatus === "downloaded" && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-900 animate-pulse" />
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-1 w-64 glass rounded-md shadow-lg z-50 py-1 border border-white/5">
                        <div className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1">
                            Software Management
                        </div>

                        {updateStatus === "downloaded" ? (
                            <button
                                onClick={handleInstall}
                                className="w-full px-4 py-2 text-sm text-left hover:bg-green-500/20 text-green-400 flex items-center gap-2 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Install Update & Restart
                            </button>
                        ) : (
                            <button
                                onClick={handleCheckUpdates}
                                disabled={updateStatus === "checking" || updateStatus === "downloading"}
                                className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                <RefreshCcw className={`w-4 h-4 ${updateStatus === "checking" ? "animate-spin" : ""}`} />
                                {updateStatus === "checking" ? "Checking..." :
                                    updateStatus === "downloading" ? `Downloading ${Math.round(downloadProgress)}%` :
                                        "Check for Updates"}
                            </button>
                        )}

                        <button
                            onClick={handleRestart}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2 transition-colors text-zinc-400"
                        >
                            <Zap className="w-4 h-4" />
                            Force Restart App
                        </button>

                        <div className="h-px bg-white/10 my-1" />

                        <div className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1">
                            Support
                        </div>

                        <a
                            href="https://wa.me/917411967696?text=HI%2C%20I%20need%20help%20with%20ProjectX"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Get WhatsApp Help
                        </a>

                        <div className="mt-2 px-4 py-2 bg-zinc-950/50 rounded-b-md">
                            <div className="flex justify-between items-center text-[9px] text-zinc-600 font-bold uppercase">
                                <span>ProjectX v1.0.1</span>
                                <span className="text-zinc-800">EPIC PLATFORM</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
