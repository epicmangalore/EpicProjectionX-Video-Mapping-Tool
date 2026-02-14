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
import { db } from "./db";

const FILE_EXTENSION = ".projectx";
const FORMAT_VERSION = "1.0.0";
const APP_VERSION = "1.0.0";

type SaveFilePickerHandle = {
    createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
    }>;
};

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

async function requestSaveFileHandle(suggestedName: string): Promise<SaveFilePickerHandle | null> {
    const picker = (window as Window & {
        showSaveFilePicker?: (options?: {
            suggestedName?: string;
            types?: Array<{
                description?: string;
                accept: Record<string, string[]>;
            }>;
        }) => Promise<SaveFilePickerHandle>;
    }).showSaveFilePicker;

    if (!picker) return null;

    try {
        return await picker({
            suggestedName,
            types: [
                {
                    description: "ProjectionX Project File",
                    accept: {
                        "application/zip": [FILE_EXTENSION],
                    },
                },
            ],
        });
    } catch (err: unknown) {
        // User canceled the native picker.
        if ((err as { name?: string })?.name === "AbortError") {
            return null;
        }
        throw err;
    }
}

async function writeBlobToHandle(handle: SaveFilePickerHandle, blob: Blob): Promise<void> {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
}

function downloadBlobFallback(blob: Blob, filename: string): void {
    try {
        saveAs(blob, filename);
        return;
    } catch {
        // Fall through to manual anchor download.
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
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

    const name = projectName || projectState.projectSettings.name || "Untitled Project";
    const targetFilename = `${sanitizeFilename(name)}${FILE_EXTENSION}`;

    console.log("💾 [Save] Starting project save process for:", name);

    // Request native save target - moved slightly later to see if it hangs
    let saveHandle: SaveFilePickerHandle | null = null;
    try {
        console.log("💾 [Save] Requesting native save handle...");
        saveHandle = await requestSaveFileHandle(targetFilename);
        console.log("💾 [Save] Native handle received:", !!saveHandle);
    } catch (e) {
        console.warn("💾 [Save] Native picker failed/unsupported, falling back to download:", e);
    }

    const zip = new JSZip();
    const settingsFolder = zip.folder("settings")!;
    const assetsFolder = zip.folder("assets")!;

    // ── Collect & embed binary assets ──────────────────────────────
    console.log("💾 [Save] Collecting binary assets...");
    const assetEntries: AssetEntry[] = [];

    if (includeAssets) {
        for (const media of projectState.mediaAssets) {
            if (!media.url) continue;
            console.log("💾 [Save] Fetching asset:", media.name, media.id);

            const blob = await fetchBlobFromUrl(media.url);
            if (!blob || blob.size === 0) {
                console.warn("💾 [Save] Failed to fetch blob for:", media.id);
                continue;
            }

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
            console.log("💾 [Save] Checking IndexedDB for stored files...");
            const storedFiles = await db.files.toArray();
            console.log("💾 [Save] Found", storedFiles.length, "files in DB");
            for (const file of storedFiles) {
                const referencedMedia = projectState.mediaAssets.find(
                    (m) => m.url?.includes(file.id) || m.id === file.id
                );
                if (!referencedMedia) continue;
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
        } catch (e) {
            console.error("💾 [Save] IndexedDB access failed during save:", e);
        }
    }

    // ── Settings JSON files ────────────────────────────────────────
    console.log("💾 [Save] Serializing settings...");
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
                scenes: projectState.scenes,
                activeSceneId: projectState.activeSceneId,
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
    console.log("💾 [Save] Generating preview thumbnail...");
    try {
        const canvas = document.querySelector("canvas");
        if (canvas) {
            const blob = await new Promise<Blob | null>((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn("💾 [Save] Canvas.toBlob timed out!");
                    resolve(null);
                }, 2000);
                canvas.toBlob((b) => {
                    clearTimeout(timeout);
                    resolve(b);
                }, "image/jpeg", 0.7);
            });
            if (blob) {
                console.log("💾 [Save] Thumbnail generated, size:", blob.size);
                zip.file("preview.jpg", blob);
            }
        } else {
            console.warn("💾 [Save] Canvas not found for thumbnail");
        }
    } catch (e) {
        console.error("💾 [Save] Preview generation failed:", e);
    }

    // ── Generate & download ────────────────────────────────────────
    console.log("💾 [Save] Generating ZIP archive...");
    const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
    });
    console.log("💾 [Save] ZIP generated, total size:", zipBlob.size);

    if (saveHandle) {
        console.log("💾 [Save] Writing to file handle...");
        try {
            await writeBlobToHandle(saveHandle, zipBlob);
            console.log("💾 [Save] File write complete!");
            return;
        } catch (e) {
            console.error("💾 [Save] Failed to write to handle, falling back to manual download:", e);
        }
    }

    console.log("💾 [Save] Triggering fallback download...");
    downloadBlobFallback(zipBlob, targetFilename);
    console.log("💾 [Save] Process finished.");
}

/**
 * Load a .projectx file and restore the entire workspace.
 */
export async function loadProjectFile(file: File): Promise<string> {
    if (!file.name.endsWith(FILE_EXTENSION)) {
        throw new Error(`Invalid file format. Expected ${FILE_EXTENSION}`);
    }

    console.log("📂 [Load] Starting project load for file:", file.name);
    const zip = await JSZip.loadAsync(file);
    console.log("📂 [Load] ZIP archive loaded successfully");

    // ── Read manifest ──────────────────────────────────────────────
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
        console.error("📂 [Load] Missing manifest.json");
        throw new Error("Invalid project file: missing manifest.json");
    }
    const manifest: ProjectManifest = JSON.parse(await manifestFile.async("text"));
    console.log("📂 [Load] Manifest read, project:", manifest.name, "ID:", manifest.projectId);

    // Version check (major version compatibility)
    const [fmtMajor] = manifest.formatVersion.split(".");
    const [appMajor] = FORMAT_VERSION.split(".");
    if (fmtMajor !== appMajor) {
        console.error("📂 [Load] Version mismatch:", manifest.formatVersion, "vs supported", FORMAT_VERSION);
        throw new Error(
            `Incompatible project version ${manifest.formatVersion}. This app supports ${FORMAT_VERSION}.`
        );
    }

    // ── Load settings ──────────────────────────────────────────────
    console.log("📂 [Load] Reading settings files...");
    const readJson = async (path: string) => {
        const f = zip.file(path);
        if (!f) {
            console.warn("📂 [Load] Setting file not found:", path);
            return null;
        }
        return JSON.parse(await f.async("text"));
    };

    const surfaces = await readJson("settings/surfaces.json");
    const mediaAssets = await readJson("settings/media-assets.json");
    const projectSettings = await readJson("settings/project.json");
    const effects = await readJson("settings/effects.json");
    const timeline = await readJson("settings/timeline.json");
    const scenes = await readJson("settings/scenes.json");

    // ── Restore binary assets ──────────────────────────────────────
    console.log("📂 [Load] Restoring binary assets...");
    const urlMap = new Map<string, string>(); // assetId → new blob URL

    for (const entry of manifest.assets) {
        const assetFile = zip.file(entry.filename);
        if (!assetFile) {
            console.warn("📂 [Load] Asset file missing from ZIP:", entry.filename);
            continue;
        }

        const blob = await assetFile.async("blob");
        console.log("📂 [Load] Restored asset blob:", entry.id, "size:", blob.size);

        // Store in IndexedDB for persistence
        try {
            await db.files.put({
                id: entry.id,
                blob,
                timestamp: Date.now(),
            });
        } catch (e) {
            console.warn("📂 [Load] Failed to store asset in IndexedDB:", e);
        }

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
    console.log("📂 [Load] Restoring store states...");
    // Stop timeline playback first
    useTimelineStore.getState().stop();

    // Project store
    const projectStore = useProjectStore.getState();
    const restoredSurfaces = surfaces || [];
    const restoredScenes = scenes?.scenes || [];
    const restoredActiveSceneId = scenes?.activeSceneId || null;

    console.log("📂 [Load] Scenes to restore:", restoredScenes.length);

    // Prefer explicit scenes data when present; fall back to single-scene import from legacy surfaces.
    if (restoredScenes.length > 0) {
        useProjectStore.setState({
            mediaAssets: restoredMediaAssets,
            scenes: restoredScenes,
            activeSceneId: restoredActiveSceneId,
            projectSettings: projectSettings || projectStore.projectSettings,
            selectedSurfaceIds: [],
            history: [],
            future: [],
        });
    } else {
        console.log("📂 [Load] Falling back to single-scene (legacy) load");
        const sceneId = `scene_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        useProjectStore.setState({
            mediaAssets: restoredMediaAssets,
            scenes: [{
                id: sceneId,
                name: "Scene 1",
                surfaces: restoredSurfaces,
                effects: {},
                keyframes: [],
                timelineDuration: 30,
                transitionDuration: 1.0,
                currentTime: 0,
                isPlaying: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }],
            activeSceneId: sceneId,
            projectSettings: projectSettings || projectStore.projectSettings,
            selectedSurfaceIds: [],
            history: [],
            future: [],
        });
    }

    // Effects store
    if (effects) {
        console.log("📂 [Load] Restoring effects...");
        useEffectsStore.setState({
            surfaceEffects: effects.surfaceEffects || {},
            globalEffects: effects.globalEffects || useEffectsStore.getState().globalEffects,
        });
    }

    // Timeline store
    if (timeline) {
        console.log("📂 [Load] Restoring timeline...");
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

    console.log("📂 [Load] Project load complete!");
    return manifest.name;
}

/**
 * Save project without binary assets (lightweight JSON-only export inside ZIP).
 */
export async function saveProjectFileLight(projectName?: string): Promise<void> {
    return saveProjectFile(projectName, { includeAssets: false });
}
