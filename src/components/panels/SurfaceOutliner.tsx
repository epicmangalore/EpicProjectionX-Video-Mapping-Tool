"use client";

import { useProjectStore } from "@/store/project-store";
import { useGroupStore, type SurfaceGroup } from "@/store/group-store";
import {
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Layers,
    Search,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    Trash2,
    GripVertical,
    Copy,
    ClipboardPaste,
    ArrowUpToLine,
    ArrowDownToLine,
    FlipHorizontal,
    FlipVertical,
    FolderPlus,
    FolderMinus,
    Palette,
} from "lucide-react";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { useState } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    useDroppable,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Group Header Row ─────────────────────────────────────────────────

function GroupHeaderRow({
    group,
    isSelected,
}: {
    group: SurfaceGroup;
    isSelected: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(group.name);

    const renameGroup = useGroupStore((state) => state.renameGroup);
    const deleteGroup = useGroupStore((state) => state.deleteGroup);
    const toggleGroupCollapsed = useGroupStore(
        (state) => state.toggleGroupCollapsed
    );
    const selectGroup = useGroupStore((state) => state.selectGroup);
    const setGroupColor = useGroupStore((state) => state.setGroupColor);
    const deselectAll = useProjectStore((state) => state.deselectAll);

    const { setNodeRef, isOver } = useDroppable({
        id: `group-drop-${group.id}`,
    });

    const handleRename = () => {
        if (editValue.trim() && editValue !== group.name) {
            renameGroup(group.id, editValue.trim());
        } else {
            setEditValue(group.name);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleRename();
        if (e.key === "Escape") {
            setEditValue(group.name);
            setIsEditing(false);
        }
    };

    const colorOptions = [
        "#ef4444",
        "#f97316",
        "#eab308",
        "#22c55e",
        "#06b6d4",
        "#8b5cf6",
        "#ec4899",
    ];

    const menuItems: any[] = [
        {
            label: "Rename Group",
            icon: <Palette className="w-3.5 h-3.5" />,
            onClick: () => {
                setIsEditing(true);
                setEditValue(group.name);
            },
        },
        "separator",
        ...colorOptions.map((c) => ({
            label: (
                <span className="flex items-center gap-2">
                    <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: c }}
                    />
                    {c === group.color ? "✓ Current" : "Set Color"}
                </span>
            ),
            onClick: () => setGroupColor(group.id, c),
        })),
        "separator",
        {
            label: "Delete Group",
            icon: <Trash2 className="w-3.5 h-3.5" />,
            danger: true,
            onClick: () => deleteGroup(group.id),
        },
    ];

    const bgClass = isSelected
        ? "bg-white/10 text-white"
        : "bg-zinc-800/50";

    return (
        <ContextMenu items={menuItems}>
            <div
                ref={setNodeRef}
                onClick={() => {
                    deselectAll();
                    selectGroup(group.id);
                }}
                onDoubleClick={() => {
                    setIsEditing(true);
                    setEditValue(group.name);
                }}
                className={`group flex items-center h-7 px-1 cursor-pointer transition-colors border-b border-white/5 ${bgClass} ${isOver ? "ring-1 ring-electric-cyan bg-electric-cyan/10" : ""}`}
            >
                {/* Collapse Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapsed(group.id);
                    }}
                    className="w-5 h-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                    <ChevronRight
                        className={`w-3 h-3 transition-transform ${!group.collapsed ? "rotate-90" : ""
                            }`}
                    />
                </button>

                {/* Color Dot */}
                <span
                    className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                />

                {/* Group Name */}
                <div className="flex-1 px-1 text-[10px] font-bold uppercase tracking-wider truncate text-zinc-300">
                    {isEditing ? (
                        <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-zinc-800 border-none outline-none text-white px-1 py-0 h-5 normal-case"
                        />
                    ) : (
                        group.name
                    )}
                </div>

                {/* Member Count */}
                <span className="text-[9px] font-mono text-zinc-500 mr-1">
                    {group.surfaceIds.length}
                </span>

                {/* Delete (hover only) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(group.id);
                    }}
                    className="w-4 h-full flex items-center justify-center text-zinc-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                    <Trash2 className="w-2.5 h-2.5" />
                </button>
            </div>
        </ContextMenu>
    );
}

// ── Sortable Layer Row (modified for groups) ─────────────────────────

function SortableLayerRow({
    surface,
    index,
    isSelected,
    selectSurface,
    toggleVisibility,
    toggleLock,
    deleteSurface,
    updateSurface,
    totalCount,
    copySurface,
    bringToFront,
    sendToBack,
    flipHorizontal,
    flipVertical,
    group,
}: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(surface.name);

    const groups = useGroupStore((state) => state.groups);
    const createGroup = useGroupStore((state) => state.createGroup);
    const addSurfaceToGroup = useGroupStore(
        (state) => state.addSurfaceToGroup
    );
    const removeSurfaceFromGroup = useGroupStore(
        (state) => state.removeSurfaceFromGroup
    );
    const selectGroupAction = useGroupStore((state) => state.selectGroup);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: surface.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : "auto",
        position: "relative" as "relative",
    };

    const handleRename = () => {
        if (editValue.trim() && editValue !== surface.name) {
            updateSurface(surface.id, { name: editValue.trim() });
        } else {
            setEditValue(surface.name);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleRename();
        if (e.key === "Escape") {
            setEditValue(surface.name);
            setIsEditing(false);
        }
    };

    // Traktor Zebra Striping: Darker alternating rows
    const bgClass = isSelected
        ? "bg-electric-cyan/20 text-electric-cyan"
        : index % 2 === 0
            ? "bg-zinc-900/30"
            : "bg-transparent";

    const textClass = isSelected ? "text-electric-cyan" : "text-zinc-300";

    // Build context menu items
    const menuItems: any[] = [
        {
            label: "Copy",
            icon: <Copy className="w-3.5 h-3.5" />,
            shortcut: "⌘C",
            onClick: () => copySurface(surface.id),
        },
        "separator",
        {
            label: "Bring to Front",
            icon: <ArrowUpToLine className="w-3.5 h-3.5" />,
            onClick: () => bringToFront(surface.id),
        },
        {
            label: "Send to Back",
            icon: <ArrowDownToLine className="w-3.5 h-3.5" />,
            onClick: () => sendToBack(surface.id),
        },
        "separator",
        {
            label: "Hide",
            icon: surface.visible ? (
                <EyeOff className="w-3.5 h-3.5" />
            ) : (
                <Eye className="w-3.5 h-3.5" />
            ),
            onClick: () => toggleVisibility(surface.id),
        },
        {
            label: "Lock",
            icon: surface.locked ? (
                <Unlock className="w-3.5 h-3.5" />
            ) : (
                <Lock className="w-3.5 h-3.5" />
            ),
            onClick: () => toggleLock(surface.id),
        },
        "separator",
        {
            label: "Flip Horizontal",
            icon: <FlipHorizontal className="w-3.5 h-3.5" />,
            onClick: () => flipHorizontal(surface.id),
        },
        {
            label: "Flip Vertical",
            icon: <FlipVertical className="w-3.5 h-3.5" />,
            onClick: () => flipVertical(surface.id),
        },
        "separator",
    ];

    // Group context menu items
    if (group) {
        menuItems.push({
            label: "Remove from Group",
            icon: <FolderMinus className="w-3.5 h-3.5" />,
            onClick: () =>
                removeSurfaceFromGroup(group.id, surface.id),
        });
    } else {
        // "Add to Group" submenu entries
        if (groups.length > 0) {
            groups.forEach((g) => {
                menuItems.push({
                    label: (
                        <span className="flex items-center gap-2">
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: g.color }}
                            />
                            Add to {g.name}
                        </span>
                    ),
                    icon: <FolderPlus className="w-3.5 h-3.5" />,
                    onClick: () =>
                        addSurfaceToGroup(g.id, surface.id),
                });
            });
        }

        // "New Group" — groups selected surfaces or just this one
        menuItems.push({
            label: "New Group from Selected",
            icon: <FolderPlus className="w-3.5 h-3.5" />,
            onClick: () => {
                const ids =
                    selectedIds.length > 1
                        ? selectedIds
                        : [surface.id];
                createGroup(
                    `Group ${groups.length + 1}`,
                    ids
                );
            },
        });
    }

    menuItems.push("separator", {
        label: "Delete",
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        shortcut: "⌫",
        onClick: () => deleteSurface(surface.id),
    });

    const isGrouped = !!group;

    return (
        <ContextMenu items={menuItems}>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                onClick={() => {
                    selectGroupAction(null);
                    selectSurface(surface.id);
                }}
                onDoubleClick={() => {
                    setIsEditing(true);
                    setEditValue(surface.name);
                }}
                className={`group flex items-center h-7 cursor-pointer transition-colors border-b border-white/5 ${bgClass} ${isDragging
                    ? "opacity-50 ring-1 ring-electric-cyan"
                    : ""
                    } ${isGrouped ? "pl-5" : "px-1"}`}
            >
                {/* Group color indicator (for grouped surfaces) */}
                {isGrouped && (
                    <span
                        className="w-1 h-4 rounded-sm mr-1.5 flex-shrink-0"
                        style={{ backgroundColor: group.color }}
                    />
                )}

                {/* Drag Handle & Index */}
                <div
                    className="w-6 flex items-center justify-center relative group/handle"
                    {...listeners}
                >
                    <div className="group-hover/handle:hidden text-[9px] font-mono opacity-50">
                        {totalCount - index}
                    </div>
                    <div className="hidden group-hover/handle:flex text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-3 h-3" />
                    </div>
                </div>

                {/* Surface Name */}
                <div
                    className={`flex-1 px-2 text-[10px] font-medium truncate ${textClass} ${!surface.visible ? "opacity-40" : ""
                        }`}
                >
                    {isEditing ? (
                        <input
                            autoFocus
                            value={editValue}
                            onChange={(e) =>
                                setEditValue(e.target.value)
                            }
                            onBlur={handleRename}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-zinc-800 border-none outline-none text-white px-1 py-0 h-5"
                        />
                    ) : (
                        surface.name
                    )}
                </div>

                {/* Simple Delete (Hover only) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteSurface(surface.id);
                    }}
                    className="w-4 h-full flex items-center justify-center text-zinc-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-1"
                >
                    <Trash2 className="w-2.5 h-2.5" />
                </button>
            </div>
        </ContextMenu>
    );
}

// ── Main Outliner ────────────────────────────────────────────────────

export function SurfaceOutliner() {
    const surfaces = useProjectStore((state) => state.getActiveSurfaces());
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const selectSurface = useProjectStore((state) => state.selectSurface);
    const toggleVisibility = useProjectStore(
        (state) => state.toggleVisibility
    );
    const toggleLock = useProjectStore((state) => state.toggleLock);
    const deleteSurface = useProjectStore((state) => state.deleteSurface);
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const reorderSurface = useProjectStore((state) => state.reorderSurface);
    const copySurface = useProjectStore((state) => state.copySurface);
    const pasteSurface = useProjectStore((state) => state.pasteSurface);
    const bringToFront = useProjectStore((state) => state.bringToFront);
    const sendToBack = useProjectStore((state) => state.sendToBack);
    const flipHorizontal = useProjectStore((state) => state.flipHorizontal);
    const flipVertical = useProjectStore((state) => state.flipVertical);
    const hasClipboard = useProjectStore((state) => !!state.clipboard);

    const groups = useGroupStore((state) => state.groups);
    const selectedGroupId = useGroupStore(
        (state) => state.selectedGroupId
    );
    const addSurfaceToGroup = useGroupStore(
        (state) => state.addSurfaceToGroup
    );

    const [searchQuery, setSearchQuery] = useState("");

    // Build display list: groups (with members) + ungrouped surfaces
    const allSorted = [...surfaces].sort(
        (a, b) => b.zIndex - a.zIndex
    );
    const filteredSurfaces = allSorted.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Grouped surface IDs (across all groups)
    const groupedIds = new Set(
        groups.flatMap((g) => g.surfaceIds)
    );

    // Ungrouped surfaces
    const ungroupedSurfaces = filteredSurfaces.filter(
        (s) => !groupedIds.has(s.id)
    );

    // Build ordered display list for DnD (ungrouped only for now)
    const sortableIds = ungroupedSurfaces.map((s) => s.id);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const overId = over.id as string;

        // Dropped on a group header → add surface to that group
        if (overId.startsWith("group-drop-")) {
            const groupId = overId.replace("group-drop-", "");
            addSurfaceToGroup(groupId, active.id as string);
            return;
        }

        // Otherwise reorder within ungrouped surfaces
        if (active.id !== over.id) {
            const oldIndex = ungroupedSurfaces.findIndex(
                (s) => s.id === active.id
            );
            const newIndex = ungroupedSurfaces.findIndex(
                (s) => s.id === over.id
            );

            if (oldIndex !== -1 && newIndex !== -1) {
                const targetStoreIndex =
                    (ungroupedSurfaces.length - 1) - newIndex;
                reorderSurface(active.id as string, targetStoreIndex);
            }
        }
    };

    // Helper to get group for a surface
    const getGroupForSurface = (surfaceId: string) =>
        groups.find((g) => g.surfaceIds.includes(surfaceId));

    return (
        <aside className="w-full h-full flex flex-col pointer-events-auto bg-zinc-950 font-sans text-xs">
            {/* Search Bar */}
            <div className="p-1 border-b border-white/5 bg-zinc-900">
                <div className="relative">
                    <Search className="absolute left-2 top-1.5 w-3 h-3 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="SEARCH"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 rounded px-7 py-1 text-[10px] font-bold text-zinc-300 focus:outline-none focus:border-electric-cyan placeholder:text-zinc-600 uppercase tracking-wide"
                    />
                </div>
            </div>

            {/* Table Header */}
            <div className="flex items-center px-1 py-1 bg-zinc-900 border-b border-white/5 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                <div className="w-6 text-center">#</div>
                <div className="flex-1 px-2">Layer Name</div>
            </div>

            {/* Surface List */}
            <div className="flex-1 overflow-y-auto bg-zinc-950">
                <ContextMenu
                    items={[
                        {
                            label: "Paste Layer",
                            icon: (
                                <ClipboardPaste className="w-3.5 h-3.5" />
                            ),
                            shortcut: "⌘V",
                            disabled: !hasClipboard,
                            onClick: pasteSurface,
                        },
                    ]}
                >
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="min-h-full">
                            {/* ── Groups Section ── */}
                            {groups.map((group) => {
                                const memberSurfaces = group.surfaceIds
                                    .map((id) =>
                                        surfaces.find((s) => s.id === id)
                                    )
                                    .filter(Boolean)
                                    .filter((s) =>
                                        s!.name
                                            .toLowerCase()
                                            .includes(
                                                searchQuery.toLowerCase()
                                            )
                                    );

                                // Hide group if no members match search
                                if (
                                    searchQuery &&
                                    memberSurfaces.length === 0
                                )
                                    return null;

                                return (
                                    <div key={group.id}>
                                        <GroupHeaderRow
                                            group={group}
                                            isSelected={
                                                selectedGroupId ===
                                                group.id
                                            }
                                        />
                                        {!group.collapsed &&
                                            memberSurfaces.map(
                                                (surface, idx) => (
                                                    <SortableLayerRow
                                                        key={surface!.id}
                                                        surface={surface}
                                                        index={idx}
                                                        isSelected={selectedIds.includes(
                                                            surface!.id
                                                        )}
                                                        selectSurface={
                                                            selectSurface
                                                        }
                                                        toggleVisibility={
                                                            toggleVisibility
                                                        }
                                                        toggleLock={
                                                            toggleLock
                                                        }
                                                        deleteSurface={
                                                            deleteSurface
                                                        }
                                                        updateSurface={
                                                            updateSurface
                                                        }
                                                        copySurface={
                                                            copySurface
                                                        }
                                                        bringToFront={
                                                            bringToFront
                                                        }
                                                        sendToBack={
                                                            sendToBack
                                                        }
                                                        flipHorizontal={
                                                            flipHorizontal
                                                        }
                                                        flipVertical={
                                                            flipVertical
                                                        }
                                                        totalCount={
                                                            memberSurfaces.length
                                                        }
                                                        group={group}
                                                    />
                                                )
                                            )}
                                    </div>
                                );
                            })}

                            {/* ── Ungrouped Surfaces ── */}
                            {ungroupedSurfaces.length === 0 &&
                                groups.length === 0 ? (
                                <div className="p-4 text-center text-[10px] text-zinc-600 uppercase tracking-widest mt-10">
                                    {searchQuery
                                        ? "No Matches"
                                        : "Empty"}
                                </div>
                            ) : (
                                <SortableContext
                                    items={sortableIds}
                                    strategy={
                                        verticalListSortingStrategy
                                    }
                                    disabled={searchQuery !== ""}
                                >
                                    {ungroupedSurfaces.map(
                                        (surface, index) => (
                                            <SortableLayerRow
                                                key={surface.id}
                                                surface={surface}
                                                index={index}
                                                isSelected={selectedIds.includes(
                                                    surface.id
                                                )}
                                                selectSurface={
                                                    selectSurface
                                                }
                                                toggleVisibility={
                                                    toggleVisibility
                                                }
                                                toggleLock={
                                                    toggleLock
                                                }
                                                deleteSurface={
                                                    deleteSurface
                                                }
                                                updateSurface={
                                                    updateSurface
                                                }
                                                copySurface={
                                                    copySurface
                                                }
                                                bringToFront={
                                                    bringToFront
                                                }
                                                sendToBack={
                                                    sendToBack
                                                }
                                                flipHorizontal={
                                                    flipHorizontal
                                                }
                                                flipVertical={
                                                    flipVertical
                                                }
                                                totalCount={
                                                    ungroupedSurfaces.length
                                                }
                                                group={null}
                                            />
                                        )
                                    )}
                                </SortableContext>
                            )}
                        </div>
                    </DndContext>
                </ContextMenu>
            </div>

            {/* Footer Stats */}
            <div className="p-1 px-2 bg-zinc-900 border-t border-white/5 flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                <span>
                    {groups.length > 0
                        ? `${groups.length} Groups`
                        : "Total"}
                </span>
                <span>{surfaces.length} Items</span>
            </div>
        </aside>
    );
}
