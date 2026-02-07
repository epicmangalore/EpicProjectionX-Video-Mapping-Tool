"use client";

import { useProjectStore } from "@/store/project-store";
import { Eye, EyeOff, Lock, Unlock, Layers, Search, ChevronUp, ChevronDown, Trash2, GripVertical, Copy, ClipboardPaste, ArrowUpToLine, ArrowDownToLine, FlipHorizontal, FlipVertical } from "lucide-react";
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
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Row Component
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
    flipVertical
}: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(surface.name);

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
        : index % 2 === 0 ? "bg-zinc-900/30" : "bg-transparent";

    const textClass = isSelected ? "text-electric-cyan" : "text-zinc-300";

    const menuItems: any[] = [
        { label: "Copy", icon: <Copy className="w-3.5 h-3.5" />, shortcut: "⌘C", onClick: () => copySurface(surface.id) },
        "separator",
        { label: "Bring to Front", icon: <ArrowUpToLine className="w-3.5 h-3.5" />, onClick: () => bringToFront(surface.id) },
        { label: "Send to Back", icon: <ArrowDownToLine className="w-3.5 h-3.5" />, onClick: () => sendToBack(surface.id) },
        "separator",
        { label: "Hide", icon: surface.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />, onClick: () => toggleVisibility(surface.id) },
        { label: "Lock", icon: surface.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />, onClick: () => toggleLock(surface.id) },
        "separator",
        { label: "Flip Horizontal", icon: <FlipHorizontal className="w-3.5 h-3.5" />, onClick: () => flipHorizontal(surface.id) },
        { label: "Flip Vertical", icon: <FlipVertical className="w-3.5 h-3.5" />, onClick: () => flipVertical(surface.id) },
        "separator",
        { label: "Delete", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, shortcut: "⌫", onClick: () => deleteSurface(surface.id) },
    ];

    return (
        <ContextMenu items={menuItems}>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                onClick={() => selectSurface(surface.id)}
                onDoubleClick={() => {
                    setIsEditing(true);
                    setEditValue(surface.name);
                }}
                className={`group flex items-center h-7 px-1 cursor-pointer transition-colors border-b border-white/5 ${bgClass} ${isDragging ? "opacity-50 ring-1 ring-electric-cyan" : ""}`}
            >
                {/* Drag Handle & Index */}
                <div className="w-6 flex items-center justify-center relative group/handle" {...listeners}>
                    <div className="group-hover/handle:hidden text-[9px] font-mono opacity-50">
                        {totalCount - index}
                    </div>
                    <div className="hidden group-hover/handle:flex text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-3 h-3" />
                    </div>
                </div>

                {/* Surface Name */}
                <div className={`flex-1 px-2 text-[10px] font-medium truncate ${textClass} ${!surface.visible ? "opacity-40" : ""}`}>
                    {isEditing ? (
                        <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-zinc-800 border-none outline-none text-white px-1 py-0 h-5"
                        />
                    ) : (
                        surface.name
                    )}
                </div>

                {/* Controls (Right Aligned) */}
                <div className="w-16 flex justify-end gap-1 px-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    {/* Visibility Toggle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleVisibility(surface.id);
                        }}
                        className={`w-6 h-full flex items-center justify-center hover:text-white ${surface.visible ? "text-zinc-400" : "text-zinc-700"}`}
                    >
                        {surface.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>

                    {/* Lock Toggle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleLock(surface.id);
                        }}
                        className={`w-6 h-full flex items-center justify-center hover:text-white ${surface.locked ? "text-electric-orange" : "text-zinc-700"}`}
                    >
                        {surface.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
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

export function SurfaceOutliner() {
    const surfaces = useProjectStore((state) => state.surfaces);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const selectSurface = useProjectStore((state) => state.selectSurface);
    const toggleVisibility = useProjectStore((state) => state.toggleVisibility);
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

    const [searchQuery, setSearchQuery] = useState("");

    // Sort surfaces by zIndex (reverse so top layers are first in list)
    const sortedSurfaces = [...surfaces]
        .sort((a, b) => b.zIndex - a.zIndex)
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = sortedSurfaces.findIndex((s) => s.id === active.id);
            const newIndex = sortedSurfaces.findIndex((s) => s.id === over?.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                // Convert UI index (descending zIndex) to Store index (ascending zIndex)
                // UI: [Top (N), ..., Bottom (0)]
                // Store: [Bottom (0), ..., Top (N)]
                // Target Store Index = (Count - 1) - New UI Index

                const targetStoreIndex = (sortedSurfaces.length - 1) - newIndex;
                reorderSurface(active.id as string, targetStoreIndex);
            }
        }
    };

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
                <div className="w-16 flex justify-end gap-1 px-1">
                    <span className="w-6 text-center">Vis</span>
                    <span className="w-6 text-center">Lock</span>
                </div>
            </div>

            {/* Surface List */}
            <div
                className="flex-1 overflow-y-auto bg-zinc-950"
                onContextMenu={(e) => {
                    if (e.target === e.currentTarget && hasClipboard) {
                        // Show paste menu if clicking empty area
                        // This would requires another ContextMenu wrap or direct handler
                    }
                }}
            >
                <ContextMenu
                    items={[
                        {
                            label: "Paste Layer",
                            icon: <ClipboardPaste className="w-3.5 h-3.5" />,
                            shortcut: "⌘V",
                            disabled: !hasClipboard,
                            onClick: pasteSurface
                        }
                    ]}
                >
                    <div className="min-h-full">
                        {sortedSurfaces.length === 0 ? (
                            <div className="p-4 text-center text-[10px] text-zinc-600 uppercase tracking-widest mt-10">
                                {searchQuery ? "No Matches" : "Empty"}
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={sortedSurfaces.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                    disabled={searchQuery !== ""} // Disable drag when filtering
                                >
                                    {sortedSurfaces.map((surface, index) => (
                                        <SortableLayerRow
                                            key={surface.id}
                                            surface={surface}
                                            index={index}
                                            isSelected={selectedIds.includes(surface.id)}
                                            selectSurface={selectSurface}
                                            toggleVisibility={toggleVisibility}
                                            toggleLock={toggleLock}
                                            deleteSurface={deleteSurface}
                                            updateSurface={updateSurface}
                                            copySurface={copySurface}
                                            bringToFront={bringToFront}
                                            sendToBack={sendToBack}
                                            flipHorizontal={flipHorizontal}
                                            flipVertical={flipVertical}
                                            totalCount={sortedSurfaces.length}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </ContextMenu>
            </div>

            {/* Footer Stats */}
            <div className="p-1 px-2 bg-zinc-900 border-t border-white/5 flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                <span>Total</span>
                <span>{surfaces.length} Items</span>
            </div>
        </aside>
    );
}
