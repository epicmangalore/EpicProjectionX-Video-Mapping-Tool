"use client";

import { useEffect } from "react";
import { useOutputStore } from "@/store/output-store";

export function PerformanceMonitor() {
    const showMonitor = useOutputStore((state) => state.showPerformanceMonitor);
    const fps = useOutputStore((state) => state.fps);
    const frameTime = useOutputStore((state) => state.frameTime);
    const memoryUsage = useOutputStore((state) => state.memoryUsage);
    const updateMetrics = useOutputStore((state) => state.updatePerformanceMetrics);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationId: number;

        const measurePerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;

            if (deltaTime >= 1000) {
                const currentFps = Math.round((frameCount * 1000) / deltaTime);
                const avgFrameTime = deltaTime / frameCount;

                // Get memory usage if available
                const memory = (performance as any).memory
                    ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
                    : 0;

                updateMetrics(currentFps, avgFrameTime, memory);

                frameCount = 0;
                lastTime = currentTime;
            }

            animationId = requestAnimationFrame(measurePerformance);
        };

        if (showMonitor) {
            animationId = requestAnimationFrame(measurePerformance);
        }

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [showMonitor, updateMetrics]);

    if (!showMonitor) return null;

    const getFpsColor = () => {
        if (fps >= 55) return "text-green-400";
        if (fps >= 30) return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="fixed top-4 right-4 z-50 glass rounded-lg p-3 min-w-[180px]">
            <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">FPS:</span>
                    <span className={`font-bold ${getFpsColor()}`}>{fps}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Frame:</span>
                    <span className="text-white">{frameTime.toFixed(2)}ms</span>
                </div>
                {memoryUsage > 0 && (
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Memory:</span>
                        <span className="text-white">{memoryUsage}MB</span>
                    </div>
                )}
            </div>
        </div>
    );
}
