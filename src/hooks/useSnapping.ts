import { useState, useCallback, useRef } from "react";
import { useProjectStore, Surface } from "@/store/project-store";
import { useUIStore, SnapLine } from "@/store/ui-store";
import * as THREE from "three";

interface SnapCandidate {
    value: number;
    type: "min" | "center" | "max";
}

interface SnapResult {
    offset: { x: number; y: number };
}

export function useSnapping() {
    const surfaces = useProjectStore((state) => state.surfaces);
    const setSnapLines = useUIStore((state) => state.setSnapLines);

    // Candidates arrays (values to snap TO)
    const candidatesX = useRef<SnapCandidate[]>([]);
    const candidatesY = useRef<SnapCandidate[]>([]);

    const prepareSnap = useCallback((activeIds: string[]) => {
        const x: SnapCandidate[] = [];
        const y: SnapCandidate[] = [];

        // Canvas Center
        x.push({ value: 0, type: "center" });
        y.push({ value: 0, type: "center" });

        // Other Surfaces
        surfaces.forEach((s) => {
            if (activeIds.includes(s.id)) return;
            if (!s.visible) return;

            // Simplified AABB (assuming no rotation for now, or just center)
            // TODO: Handle rotation logic better if needed
            const center = s.position;
            const halfW = (s.scale.x / 2);
            const halfH = (s.scale.y / 2);

            x.push({ value: center.x, type: "center" });
            x.push({ value: center.x - halfW, type: "min" });
            x.push({ value: center.x + halfW, type: "max" });

            y.push({ value: center.y, type: "center" });
            y.push({ value: center.y - halfH, type: "min" });
            y.push({ value: center.y + halfH, type: "max" });
        });

        candidatesX.current = x;
        candidatesY.current = y;
    }, [surfaces]);

    const checkSnap = useCallback((
        rect: { min: { x: number, y: number }, max: { x: number, y: number }, center: { x: number, y: number } },
        threshold: number = 0.2 // World units distance
    ): SnapResult => {
        const lines: SnapLine[] = [];
        let offsetX = 0;
        let offsetY = 0;

        let minDistX = threshold;
        let minDistY = threshold;

        // Check if Shift is held? Maybe snapping should be always on or toggleable?
        // Assuming always on unless strict modifier is used by caller?
        // For now, simple logic.

        // X Snapping
        const xPoints = [
            { value: rect.center.x, type: "center" },
            { value: rect.min.x, type: "min" },
            { value: rect.max.x, type: "max" }
        ];

        for (const point of xPoints) {
            for (const candidate of candidatesX.current) {
                const dist = candidate.value - point.value;
                if (Math.abs(dist) < minDistX) {
                    minDistX = Math.abs(dist);
                    offsetX = dist;
                    // Add line
                    // Only add line for worst case (closest snap)? Or accumulate?
                    // We just want one line per axis usually.
                }
            }
        }

        // Re-check with best offset to generate line
        if (Math.abs(offsetX) > 0.0001) {
            const snappedCenter = rect.center.x + offsetX;
            const snappedMin = rect.min.x + offsetX;
            const snappedMax = rect.max.x + offsetX;

            // Find which point snapped
            // This is a bit brute force but safe
            for (const candidate of candidatesX.current) {
                if (Math.abs(candidate.value - snappedCenter) < 0.001 ||
                    Math.abs(candidate.value - snappedMin) < 0.001 ||
                    Math.abs(candidate.value - snappedMax) < 0.001) {
                    lines.push({
                        id: `x-${candidate.value}`,
                        type: "vertical",
                        position: candidate.value
                    });
                    break; // Visualise one
                }
            }
        }


        // Y Snapping
        const yPoints = [
            { value: rect.center.y, type: "center" },
            { value: rect.min.y, type: "min" },
            { value: rect.max.y, type: "max" }
        ];

        for (const point of yPoints) {
            for (const candidate of candidatesY.current) {
                const dist = candidate.value - point.value;
                if (Math.abs(dist) < minDistY) {
                    minDistY = Math.abs(dist);
                    offsetY = dist;
                }
            }
        }

        if (Math.abs(offsetY) > 0.0001) {
            const snappedCenter = rect.center.y + offsetY;
            const snappedMin = rect.min.y + offsetY;
            const snappedMax = rect.max.y + offsetY;

            for (const candidate of candidatesY.current) {
                if (Math.abs(candidate.value - snappedCenter) < 0.001 ||
                    Math.abs(candidate.value - snappedMin) < 0.001 ||
                    Math.abs(candidate.value - snappedMax) < 0.001) {
                    lines.push({
                        id: `y-${candidate.value}`,
                        type: "horizontal",
                        position: candidate.value
                    });
                    break;
                }
            }
        }

        setSnapLines(lines);

        return { offset: { x: offsetX, y: offsetY } };

    }, [setSnapLines]);

    const clearSnap = useCallback(() => {
        setSnapLines([]);
    }, [setSnapLines]);

    return { prepareSnap, checkSnap, clearSnap };
}
