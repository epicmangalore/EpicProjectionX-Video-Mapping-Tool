/**
 * One-time migration of legacy "projectionx-*" localStorage keys to "projectx-*".
 *
 * This module must be imported BEFORE any store module so the rename happens
 * before zustand persist hydrates (which occurs synchronously at store creation
 * for localStorage-backed stores).
 */

const RENAMED_KEYS: ReadonlyArray<readonly [string, string]> = [
    ["projectionx-timeline-storage", "projectx-timeline-storage"],
    ["projectionx-effects-storage", "projectx-effects-storage"],
    ["projectionx-groups", "projectx-groups"],
    ["projectionx-layer-storage", "projectx-layer-storage"],
];

if (typeof window !== "undefined") {
    for (const [legacyKey, newKey] of RENAMED_KEYS) {
        try {
            const value = window.localStorage.getItem(legacyKey);
            if (value === null) continue;
            if (window.localStorage.getItem(newKey) === null) {
                window.localStorage.setItem(newKey, value);
            }
            window.localStorage.removeItem(legacyKey);
        } catch {
            // Storage unavailable (private mode, quota, etc.) — skip migration
        }
    }
}

export {};
