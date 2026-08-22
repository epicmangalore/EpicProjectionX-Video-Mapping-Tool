import { useProjectStore } from "@/store/project-store";

/**
 * Hook to get surfaces from the currently active scene
 * Returns empty array if no active scene
 */
export function useActiveSurfaces() {
    return useProjectStore(state => state.getActiveSurfaces());
}

/**
 * Hook to get the currently active scene
 * Returns null if no active scene
 */
export function useActiveScene() {
    return useProjectStore(state => state.getActiveScene());
}
