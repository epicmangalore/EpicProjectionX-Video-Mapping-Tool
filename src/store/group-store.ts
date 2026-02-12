import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId } from "@/lib/utils";
import { useProjectStore, type BlendMode, type Vector2 } from "@/store/project-store";
import { updateGroupVideoUrl } from "@/lib/group-video-cache";

// ── Types ────────────────────────────────────────────────────────────

export interface SurfaceGroup {
    id: string;
    name: string;
    color: string;
    position: Vector2;
    rotation: number;
    scale: Vector2;
    aspectRatioLocked: boolean;
    mediaId: string | null;
    opacity: number;
    blendMode: BlendMode;
    playbackRate: number;
    loop: boolean;
    surfaceIds: string[];
    collapsed: boolean;
}

// ── Constants ────────────────────────────────────────────────────────

const GROUP_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#06b6d4", // cyan
    "#8b5cf6", // violet
    "#ec4899", // pink
];

let colorIndex = 0;
function nextColor(): string {
    const c = GROUP_COLORS[colorIndex % GROUP_COLORS.length];
    colorIndex += 1;
    return c;
}

// ── Store Interface ──────────────────────────────────────────────────

interface GroupStore {
    // State
    groups: SurfaceGroup[];
    selectedGroupId: string | null;

    // Group CRUD
    createGroup: (name: string, surfaceIds: string[]) => string;
    deleteGroup: (groupId: string) => void;
    renameGroup: (groupId: string, name: string) => void;
    setGroupColor: (groupId: string, color: string) => void;
    updateGroup: (groupId: string, updates: Partial<SurfaceGroup>) => void;
    toggleGroupCollapsed: (groupId: string) => void;
    selectGroup: (groupId: string | null) => void;

    // Member management
    addSurfaceToGroup: (groupId: string, surfaceId: string) => void;
    removeSurfaceFromGroup: (groupId: string, surfaceId: string) => void;

    // Media & playback
    setGroupMedia: (groupId: string, mediaId: string | null) => void;
    setGroupOpacity: (groupId: string, opacity: number) => void;
    setGroupBlendMode: (groupId: string, blendMode: BlendMode) => void;
    setGroupPlaybackRate: (groupId: string, rate: number) => void;
    setGroupLoop: (groupId: string, loop: boolean) => void;

    // Helpers
    getGroupForSurface: (surfaceId: string) => SurfaceGroup | undefined;
}

// ── Helper: update surfaces in project store ─────────────────────────

function updateProjectSurface(surfaceId: string, updates: Record<string, unknown>) {
    useProjectStore.getState().updateSurface(surfaceId, updates);
}

// ── Store ────────────────────────────────────────────────────────────

export const useGroupStore = create<GroupStore>()(
    persist(
        (set, get) => ({
            groups: [],
            selectedGroupId: null,

            // ── CRUD ─────────────────────────────────────────────

            createGroup: (name, surfaceIds) => {
                const id = generateId();
                const color = nextColor();

                const newGroup: SurfaceGroup = {
                    id,
                    name,
                    color,
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    scale: { x: 1, y: 1 },
                    aspectRatioLocked: false,
                    mediaId: null,
                    opacity: 1,
                    blendMode: "normal",
                    playbackRate: 1,
                    loop: true,
                    surfaceIds: [...surfaceIds],
                    collapsed: false,
                };

                // Tag each surface with the group
                surfaceIds.forEach((sid) => {
                    updateProjectSurface(sid, { groupId: id });
                });

                set((state) => ({
                    groups: [...state.groups, newGroup],
                    selectedGroupId: id,
                }));

                return id;
            },

            deleteGroup: (groupId) => {
                const group = get().groups.find((g) => g.id === groupId);
                if (!group) return;

                // Clear groupId on all member surfaces
                group.surfaceIds.forEach((sid) => {
                    updateProjectSurface(sid, { groupId: undefined });
                });

                set((state) => ({
                    groups: state.groups.filter((g) => g.id !== groupId),
                    selectedGroupId:
                        state.selectedGroupId === groupId
                            ? null
                            : state.selectedGroupId,
                }));
            },

            renameGroup: (groupId, name) => {
                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId ? { ...g, name } : g
                    ),
                }));
            },

            setGroupColor: (groupId, color) => {
                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId ? { ...g, color } : g
                    ),
                }));
            },

            updateGroup: (groupId, updates) => {
                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId ? { ...g, ...updates } : g
                    ),
                }));
            },

            toggleGroupCollapsed: (groupId) => {
                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId
                            ? { ...g, collapsed: !g.collapsed }
                            : g
                    ),
                }));
            },

            selectGroup: (groupId) => {
                set({ selectedGroupId: groupId });
            },

            // ── Member management ────────────────────────────────

            addSurfaceToGroup: (groupId, surfaceId) => {
                const group = get().groups.find((g) => g.id === groupId);
                if (!group) return;
                if (group.surfaceIds.includes(surfaceId)) return;

                // Remove from any other group first
                const otherGroup = get().groups.find(
                    (g) =>
                        g.id !== groupId && g.surfaceIds.includes(surfaceId)
                );
                if (otherGroup) {
                    get().removeSurfaceFromGroup(otherGroup.id, surfaceId);
                }

                // Apply group's media to new member
                const updates: Record<string, unknown> = { groupId };
                if (group.mediaId) {
                    updates.mediaId = group.mediaId;
                }

                updateProjectSurface(surfaceId, updates);

                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId
                            ? { ...g, surfaceIds: [...g.surfaceIds, surfaceId] }
                            : g
                    ),
                }));
            },

            removeSurfaceFromGroup: (groupId, surfaceId) => {
                const group = get().groups.find((g) => g.id === groupId);
                if (!group) return;

                updateProjectSurface(surfaceId, { groupId: undefined });

                const remaining = group.surfaceIds.filter(
                    (id) => id !== surfaceId
                );

                if (remaining.length === 0) {
                    // Auto-delete empty groups
                    set((state) => ({
                        groups: state.groups.filter((g) => g.id !== groupId),
                        selectedGroupId:
                            state.selectedGroupId === groupId
                                ? null
                                : state.selectedGroupId,
                    }));
                } else {
                    set((state) => ({
                        groups: state.groups.map((g) =>
                            g.id === groupId
                                ? { ...g, surfaceIds: remaining }
                                : g
                        ),
                    }));
                }
            },

            // ── Media & Playback ─────────────────────────────────

            setGroupMedia: (groupId, mediaId) => {
                const group = get().groups.find((g) => g.id === groupId);
                if (!group) return;

                // Set media on all member surfaces
                group.surfaceIds.forEach((sid) => {
                    updateProjectSurface(sid, { mediaId });
                });

                // If we can resolve the URL, update the cached video element
                if (mediaId) {
                    const asset = useProjectStore
                        .getState()
                        .mediaAssets.find((a) => a.id === mediaId);
                    if (asset?.url) {
                        updateGroupVideoUrl(groupId, asset.url);
                    }
                }

                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId ? { ...g, mediaId } : g
                    ),
                }));
            },

            setGroupOpacity: (groupId, opacity) => {
                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId
                            ? { ...g, opacity: Math.max(0, Math.min(1, opacity)) }
                            : g
                    ),
                }));
            },

            setGroupBlendMode: (groupId, blendMode) => {
                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId ? { ...g, blendMode } : g
                    ),
                }));
            },

            setGroupPlaybackRate: (groupId, rate) => {
                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId
                            ? {
                                ...g,
                                playbackRate: Math.max(
                                    0.25,
                                    Math.min(4, rate)
                                ),
                            }
                            : g
                    ),
                }));
            },

            setGroupLoop: (groupId, loop) => {
                set((state) => ({
                    groups: state.groups.map((g) =>
                        g.id === groupId ? { ...g, loop } : g
                    ),
                }));
            },

            // ── Helpers ──────────────────────────────────────────

            getGroupForSurface: (surfaceId) => {
                return get().groups.find((g) =>
                    g.surfaceIds.includes(surfaceId)
                );
            },
        }),
        {
            name: "projectionx-groups",
            partialize: (state) => ({
                groups: state.groups,
            }),
        }
    )
);

// ── Cross-store subscription ─────────────────────────────────────────
// Watch for surface deletions in project-store and clean up groups.

useProjectStore.subscribe((state, prev) => {
    const surfaces = state.getActiveSurfaces();
    const prevSurfaces = prev.getActiveSurfaces();
    if (surfaces === prevSurfaces) return;

    const currentIds = new Set(surfaces.map((s) => s.id));
    const groupState = useGroupStore.getState();

    groupState.groups.forEach((group) => {
        group.surfaceIds.forEach((sid) => {
            if (!currentIds.has(sid)) {
                useGroupStore
                    .getState()
                    .removeSurfaceFromGroup(group.id, sid);
            }
        });
    });
});
