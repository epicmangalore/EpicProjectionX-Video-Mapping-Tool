/**
 * Shared HTMLVideoElement cache for Surface Groups.
 *
 * Surfaces in the same group share a single HTMLVideoElement so that
 * playback is inherently synchronised.  The cache lives outside of any
 * React/Zustand store because DOM elements are not serialisable.
 *
 * Usage from React: prefer the `useGroupVideo` hook which wraps
 * acquire/release with proper lifecycle management.
 */

interface CacheEntry {
    video: HTMLVideoElement;
    refCount: number;
    url: string;
}

const cache = new Map<string, CacheEntry>();

/**
 * Acquire (or reuse) a shared video element for the given group.
 * Increments the internal reference count.
 */
export function acquireGroupVideo(
    groupId: string,
    url: string
): HTMLVideoElement {
    const existing = cache.get(groupId);

    if (existing) {
        // URL changed – update source on the existing element
        if (existing.url !== url) {
            existing.video.src = url;
            existing.video.load();
            existing.url = url;
        }
        existing.refCount += 1;
        return existing.video;
    }

    // Create a new video element with the same settings Surface.tsx uses
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    cache.set(groupId, { video, refCount: 1, url });
    return video;
}

/**
 * Release a reference to the group's shared video element.
 * When the last consumer releases, the element is disposed.
 */
export function releaseGroupVideo(groupId: string): void {
    const entry = cache.get(groupId);
    if (!entry) return;

    entry.refCount -= 1;

    if (entry.refCount <= 0) {
        entry.video.pause();
        entry.video.src = "";
        entry.video.load(); // release memory
        cache.delete(groupId);
    }
}

/**
 * Get the shared video element for a group without changing refCount.
 * Returns null if no element is cached.
 */
export function getGroupVideo(groupId: string): HTMLVideoElement | null {
    return cache.get(groupId)?.video ?? null;
}

/**
 * Force-update the source URL on an existing cached video.
 * Called by group-store when the group's media changes.
 */
export function updateGroupVideoUrl(
    groupId: string,
    url: string
): void {
    const entry = cache.get(groupId);
    if (!entry) return;
    if (entry.url === url) return;

    entry.video.src = url;
    entry.video.load();
    entry.url = url;
}
