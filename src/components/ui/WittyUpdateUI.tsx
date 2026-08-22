"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Zap, Rocket, Satellite } from "lucide-react";

const WITTY_MESSAGES = [
    "Recalibrating the flux capacitor...",
    "Teaching the pixels to behave...",
    "Downloading more talent (stand by)...",
    "Bribing the update server with virtual cookies...",
    "Optimizing for 4D experiences...",
    "Convincing the bits to move faster...",
    "Consulting the oracle for better performance...",
    "Applying extra polish to the UI tokens...",
    "Translating logic to 'fancy' mode...",
    "Aligning the stars for a perfect projection...",
    "Checking for alien interference...",
    "Feeding the code hamsters...",
    "Tightening the screws on the render engine...",
];

export function WittyUpdateUI() {
    const [message, setMessage] = useState(WITTY_MESSAGES[0]);
    const [isVisible, setIsVisible] = useState(false);
    const [progress, setProgress] = useState(0);

    // Simulate "checking for updates" every 5 minutes or on demand
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isVisible) {
                startChecking();
            }
        }, 1000 * 60 * 5); // 5 minutes

        return () => clearInterval(interval);
    }, [isVisible]);

    const startChecking = () => {
        const randomMsg = WITTY_MESSAGES[Math.floor(Math.random() * WITTY_MESSAGES.length)];
        setMessage(randomMsg);
        setIsVisible(true);
        setProgress(0);

        // Simulate progress
        let p = 0;
        const pInterval = setInterval(() => {
            p += Math.random() * 15;
            if (p >= 100) {
                p = 100;
                setProgress(100);
                clearInterval(pInterval);
                setTimeout(() => setIsVisible(false), 2000);
            } else {
                setProgress(p);
            }
        }, 300);
    };

    if (!isVisible) return (
        <button
            onClick={startChecking}
            className="fixed bottom-4 left-4 z-[9999] p-2 bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-full hover:bg-zinc-800 transition-all group scale-75 hover:scale-100 opacity-30 hover:opacity-100"
            title="Check for magic updates"
        >
            <Sparkles className="w-4 h-4 text-electric-cyan group-hover:animate-pulse" />
        </button>
    );

    return (
        <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 animate-in slide-in-from-left-4 fade-in duration-500">
            <div className="glass px-4 py-3 border border-white/10 rounded-2xl shadow-xl flex items-center gap-4 min-w-[280px]">
                <div className="relative">
                    <div className="p-2 bg-electric-cyan/10 rounded-xl relative z-10">
                        {progress < 100 ? (
                            <RefreshCw className="w-5 h-5 text-electric-cyan animate-spin-slow" />
                        ) : (
                            <Zap className="w-5 h-5 text-yellow-400 animate-bounce" />
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        {progress < 100 ? "Syncing Reality" : "Magic Applied!"}
                    </p>
                    <p className="text-sm font-medium text-white truncate max-w-[200px]">
                        {message}
                    </p>

                    {/* Tiny Progress Bar */}
                    <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-electric-cyan to-blue-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pl-2">
                <Satellite className="w-3 h-3 text-zinc-600 animate-pulse" />
                <span className="text-[10px] text-zinc-600 font-mono tracking-tighter uppercase">
                    Orbital Link Established
                </span>
            </div>
        </div>
    );
}
