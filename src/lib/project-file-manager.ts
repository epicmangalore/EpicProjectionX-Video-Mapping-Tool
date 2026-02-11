/**
 * ProjectFileManager - Save/load entire workspace as a .projectx ZIP archive.
 *
 * .projectx format:
 *   manifest.json        - Project metadata and asset registry
 *   settings/
 *     surfaces.json      - All surface configurations
 *     media-assets.json  - Media asset metadata
 *     effects.json       - Per-surface and global effects
 *     timeline.json      - Timeline keyframes and settings
 *     scenes.json        - Scene snapshots
 *     project.json       - Project settings (resolution, fps, etc.)
 *   assets/
 *     <id>.<ext>         - Binary media files (videos, images)
 *   preview.jpg          - Project thumbnail
 */

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useProjectStore } from "@/store/project-store";
import { useEffectsStore } from "@/store/effects-store";
import { useTimelineStore } from "@/store/timeline-store";
import { useSceneStore } from "@/store/cue-store";
import { db } from "./db";

const FILE_EXTENSION = ".projectx";
const FORMAT_VERSION = "1.0.0";
const APP_VERSION = "1.0.0";

interface AssetEntry {
    id: string;
    originalName: string;
    filename: string;
    type: string;
    size?: number;
    width?: number;
    height?: number;
    duration?: number;
}

interface ProjectManifest {
    formatVersion: string;
    appVersion: string;
    projectId: string;
    name: string;
    createdAt: string;
    modifiedAt: string;
    settings: {
        resolution: { width: number; height: number };
        fps: number;
    };
    assets: AssetEntry[];
}

function sanitizeFilename(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9\-_\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        || "untitled";
}

function getExtensionFromUrl(url: string, fallback = "bin"): string {
    try {
        // Handle blob URLs by checking the MIME type later
        if (url.startsWith("blob:")) return fallback;
        const pathname = new URL(url).pathname;
        const ext = pathname.split(".").pop()?.toLowerCase();
        if (ext && ext.length <= 5) return ext;
    } catch { }
    return fallback;
}

async function fetchBlobFromUrl(url: string): Promise<Blob | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.blob();
    } catch {
        return null;
    }
}

function getExtFromMime(mime: string): string {
    const map: Record<string, string> = {
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/ogg": "ogv",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
    };
    return map[mime] || "bin";
}

/**
 * Save the current workspace as a .projectx file (ZIP archive).
 */
export async function saveProjectFile(
    projectName?: string,
    options: { includeAssets?: boolean } = {}
): Promise<void> {
    const { includeAssets = true } = options;

    const projectState = useProjectStore.getState();
    const effectsState = useEffectsStore.getState();
    const timelineState = useTimelineStore.getState();
    const sceneState = useSceneStore.getState();

    const name = projectName || projectState.projectSettings.name || "Untitled Project";
    const zip = new JSZip();
    const settingsFolder = zip.folder("settings")!;
    const assetsFolder = zip.folder("assets")!;

    // ── Collect & embed binary assets ──────────────────────────────
    const assetEntries: AssetEntry[] = [];

    if (includeAssets) {
        for (const media of projectState.mediaAssets) {
            if (!media.url) continue;

            const blob = await fetchBlobFromUrl(media.url);
            if (!blob || blob.size === 0) continue;

            const ext = blob.type ? getExtFromMime(blob.type) : getExtensionFromUrl(media.url);
            const filename = `${media.id}.${ext}`;

            assetsFolder.file(filename, blob);

            assetEntries.push({
                id: media.id,
                originalName: media.name,
                filename: `assets/${filename}`,
                type: media.type,
                size: blob.size,
                width: media.width,
                height: media.height,
                duration: media.duration,
            });
        }

        // Also save blobs stored in IndexedDB (files table)
        try {
            const storedFiles = await db.files.toArray();
            for (const file of storedFiles) {
                // Check if any media asset references this file
                const referencedMedia = projectState.mediaAssets.find(
                    (m) => m.url?.includes(file.id) || m.id === file.id
                );
                if (!referencedMedia) continue;

                // Skip if we already captured it via URL fetch above
                if (assetEntries.some((a) => a.id === file.id)) continue;

                const ext = file.blob.type ? getExtFromMime(file.blob.type) : "bin";
                const filename = `${file.id}.${ext}`;
                assetsFolder.file(filename, file.blob);

                assetEntries.push({
                    id: file.id,
                    originalName: referencedMedia?.name || file.id,
                    filename: `assets/${filename}`,
                    type: referencedMedia?.type || "unknown",
                    size: file.blob.size,
                });
            }
        } catch {
            // IndexedDB may not be available in all contexts
        }
    }

    // ── Settings JSON files ────────────────────────────────────────
    // Strip URL fields from media assets (they'll be re-created on load)
    const mediaAssetsForSave = projectState.mediaAssets.map((m) => ({
        ...m,
        url: undefined, // Don't store blob URLs
    }));

    settingsFolder.file("surfaces.json", JSON.stringify(projectState.surfaces, null, 2));
    settingsFolder.file("media-assets.json", JSON.stringify(mediaAssetsForSave, null, 2));
    settingsFolder.file("project.json", JSON.stringify(projectState.projectSettings, null, 2));
    settingsFolder.file(
        "effects.json",
        JSON.stringify(
            {
                surfaceEffects: effectsState.surfaceEffects,
                globalEffects: effectsState.globalEffects,
            },
            null,
            2
        )
    );
    settingsFolder.file(
        "timeline.json",
        JSON.stringify(
            {
                keyframes: timelineState.keyframes,
                duration: timelineState.duration,
                loop: timelineState.loop,
                snapToGrid: timelineState.snapToGrid,
                gridSize: timelineState.gridSize,
            },
            null,
            2
        )
    );
    settingsFolder.file(
        "scenes.json",
        JSON.stringify(
            {
                scenes: sceneState.scenes,
                activeSceneId: sceneState.activeSceneId,
            },
            null,
            2
        )
    );

    // ── Manifest ───────────────────────────────────────────────────
    const manifest: ProjectManifest = {
        formatVersion: FORMAT_VERSION,
        appVersion: APP_VERSION,
        projectId: projectState.currentProjectId?.toString() || crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        settings: {
            resolution: projectState.projectSettings.resolution,
            fps: projectState.projectSettings.fps,
        },
        assets: assetEntries,
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // ── Preview thumbnail ──────────────────────────────────────────
    try {
        const canvas = document.querySelector("canvas");
        if (canvas) {
            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7)
            );
            if (blob) zip.file("preview.jpg", blob);
        }
    } catch { }

    // ── Generate & download ────────────────────────────────────────
    const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
    });

    saveAs(zipBlob, `${sanitizeFilename(name)}${FILE_EXTENSION}`);
}

/**
 * Load a .projectx file and restore the entire workspace.
 */
export async function loadProjectFile(file: File): Promise<string> {
    if (!file.name.endsWith(FILE_EXTENSION)) {
        throw new Error(`Invalid file format. Expected ${FILE_EXTENSION}`);
    }

    const zip = await JSZip.loadAsync(file);

    // ── Read manifest ──────────────────────────────────────────────
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
        throw new Error("Invalid project file: missing manifest.json");
    }
    const manifest: ProjectManifest = JSON.parse(await manifestFile.async("text"));

    // Version check (major version compatibility)
    const [fmtMajor] = manifest.formatVersion.split(".");
    const [appMajor] = FORMAT_VERSION.split(".");
    if (fmtMajor !== appMajor) {
        throw new Error(
            `Incompatible project version ${manifest.formatVersion}. This app supports ${FORMAT_VERSION}.`
        );
    }

    // ── Load settings ──────────────────────────────────────────────
    const readJson = async (path: string) => {
        const f = zip.file(path);
        if (!f) return null;
        return JSON.parse(await f.async("text"));
    };

    const surfaces = await readJson("settings/surfaces.json");
    const mediaAssets = await readJson("settings/media-assets.json");
    const projectSettings = await readJson("settings/project.json");
    const effects = await readJson("settings/effects.json");
    const timeline = await readJson("settings/timeline.json");
    const scenes = await readJson("settings/scenes.json");

    // ── Restore binary assets ──────────────────────────────────────
    const urlMap = new Map<string, string>(); // assetId → new blob URL

    for (const entry of manifest.assets) {
        const assetFile = zip.file(entry.filename);
        if (!assetFile) continue;

        const blob = await assetFile.async("blob");

        // Store in IndexedDB for persistence
        try {
            await db.files.put({
                id: entry.id,
                blob,
                timestamp: Date.now(),
            });
        } catch { }

        // Create blob URL for immediate use
        const blobUrl = URL.createObjectURL(blob);
        urlMap.set(entry.id, blobUrl);
    }

    // Re-attach blob URLs to media assets
    const restoredMediaAssets = (mediaAssets || []).map((m: any) => {
        const newUrl = urlMap.get(m.id);
        return { ...m, url: newUrl || m.url || undefined };
    });

    // ── Restore all stores ─────────────────────────────────────────
    // Stop timeline playback first
    useTimelineStore.getState().stop();

    // Project store
    useProjectStore.setState({
        surfaces: surfaces || [],
        mediaAssets: restoredMediaAssets,
        scenes: [],
        projectSettings: projectSettings || useProjectStore.getState().projectSettings,
        selectedSurfaceIds: [],
        history: [],
        future: [],
    });

    // Effects store
    if (effects) {
        useEffectsStore.setState({
            surfaceEffects: effects.surfaceEffects || {},
            globalEffects: effects.globalEffects || useEffectsStore.getState().globalEffects,
        });
    }

    // Timeline store
    if (timeline) {
        useTimelineStore.setState({
            keyframes: timeline.keyframes || [],
            duration: timeline.duration || 30,
            loop: timeline.loop ?? true,
            snapToGrid: timeline.snapToGrid ?? true,
            gridSize: timeline.gridSize ?? 0.1,
            currentTime: 0,
            isPlaying: false,
        });
    }

    // Scene store
    if (scenes) {
        useSceneStore.setState({
            scenes: scenes.scenes || [],
            activeSceneId: scenes.activeSceneId || null,
            isTransitioning: false,
        });
    }

    return manifest.name;
}

/**
 * Save project without binary assets (lightweight JSON-only export inside ZIP).
 */
export async function saveProjectFileLight(projectName?: string): Promise<void> {
    return saveProjectFile(projectName, { includeAssets: false });
}
