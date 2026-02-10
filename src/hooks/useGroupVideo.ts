import { useEffect, useState } from "react";
import {
    acquireGroupVideo,
    releaseGroupVideo,
} from "@/lib/group-video-cache";

/**
 * React hook that provides a shared HTMLVideoElement for a surface group.
 *
 * When `groupId` is defined the hook acquires a reference from the
 * module-level cache, creating the element on first access.  On
 * unmount (or when the groupId / url changes) the reference is
 * released.
 *
 * Returns `null` when the surface is not part of a group — the
 * caller should fall back to its own video element in that case.
 */
export function useGroupVideo(
    groupId: string | undefined,
    mediaUrl: string | undefined
): HTMLVideoElement | null {
    const [video, setVideo] = useState<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!groupId || !mediaUrl) {
            setVideo(null);
            return;
        }

        const el = acquireGroupVideo(groupId, mediaUrl);
        setVideo(el);

        return () => {
            releaseGroupVideo(groupId);
            setVideo(null);
        };
    }, [groupId, mediaUrl]);

    return video;
}
