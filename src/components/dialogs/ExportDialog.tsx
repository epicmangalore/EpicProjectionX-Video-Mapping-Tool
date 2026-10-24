"use client";

import { useState } from "react";
import { X, FileVideo, Download, CheckCircle2 } from "lucide-react";
import { useProjectStore } from "@/store/project-store";
import { ExportOptions } from "@/lib/export/export-types";
import { exportToAfterEffects } from "@/lib/export/ae-exporter";
import { exportToPremiere } from "@/lib/export/premiere-exporter";
import { saveAs } from "file-saver";

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
    const scenes = useProjectStore((state) => state.scenes);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const projectSettings = useProjectStore((state) => state.projectSettings);
    const currentProjectId = useProjectStore((state) => state.currentProjectId);

    const [exportFormat, setExportFormat] = useState<"aftereffects" | "premiere">("aftereffects");
    const [includeMedia, setIncludeMedia] = useState(false);
    const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    if (!isOpen) return null;

    const handleExport = async () => {
        setIsExporting(true);
        setExportSuccess(false);

        try {
            const options: ExportOptions = {
                format: exportFormat,
                includeMedia,
                mediaFormat: "reference",
                frameRate: 30,
                resolution: {
                    width: projectSettings.resolution.width,
                    height: projectSettings.resolution.height
                },
                selectedScenes: selectedSceneIds.length > 0 ? selectedSceneIds : undefined,
                projectName: `ProjectX_${currentProjectId || 'Export'}`
            };

            const scenesToExport = selectedSceneIds.length > 0
                ? scenes.filter(s => selectedSceneIds.includes(s.id))
                : scenes;

            let blob: Blob;
            let filename: string;

            if (exportFormat === "aftereffects") {
                blob = await exportToAfterEffects(scenesToExport, mediaAssets, options);
                filename = `${options.projectName}.jsx`;
            } else {
                blob = await exportToPremiere(scenesToExport, mediaAssets, options);
                filename = `${options.projectName}.mogrt`;
            }

            saveAs(blob, filename);
            setExportSuccess(true);

            setTimeout(() => {
                onClose();
                setExportSuccess(false);
            }, 2000);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed. Please check the console for details.");
        } finally {
            setIsExporting(false);
        }
    };

    const toggleScene = (sceneId: string) => {
        setSelectedSceneIds(prev =>
            prev.includes(sceneId)
                ? prev.filter(id => id !== sceneId)
                : [...prev, sceneId]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-lg shadow-2xl w-[600px] flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-electric-cyan/10 rounded-lg">
                            <FileVideo className="h-5 w-5 text-electric-cyan" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Export Project</h2>
                            <p className="text-xs text-zinc-500">Export to professional video editing tools</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        disabled={isExporting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-3">Export Format</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setExportFormat("aftereffects")}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    exportFormat === "aftereffects"
                                        ? "border-electric-cyan bg-electric-cyan/10"
                                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                                }`}
                                disabled={isExporting}
                            >
                                <div className="font-bold text-white text-sm">After Effects</div>
                                <div className="text-xs text-zinc-400 mt-1">.jsx script file</div>
                            </button>
                            <button
                                onClick={() => setExportFormat("premiere")}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    exportFormat === "premiere"
                                        ? "border-electric-cyan bg-electric-cyan/10"
                                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                                }`}
                                disabled={isExporting}
                            >
                                <div className="font-bold text-white text-sm">Premiere Pro</div>
                                <div className="text-xs text-zinc-400 mt-1">.mogrt template</div>
                            </button>
                        </div>
                    </div>

                    {/* Scene Selection */}
                    {scenes.length > 1 && (
                        <div>
                            <label className="block text-sm font-bold text-white mb-3">
                                Scenes to Export
                                <span className="ml-2 text-xs font-normal text-zinc-500">
                                    (Leave empty to export all)
                                </span>
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {scenes.map((scene) => (
                                    <label
                                        key={scene.id}
                                        className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSceneIds.includes(scene.id)}
                                            onChange={() => toggleScene(scene.id)}
                                            disabled={isExporting}
                                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-electric-cyan focus:ring-electric-cyan focus:ring-offset-0"
                                        />
                                        <span className="text-sm text-white">{scene.name}</span>
                                        <span className="ml-auto text-xs text-zinc-500">
                                            {scene.surfaces.length} surface{scene.surfaces.length !== 1 ? 's' : ''}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Options */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-3">Options</label>
                        <label className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeMedia}
                                onChange={(e) => setIncludeMedia(e.target.checked)}
                                disabled={isExporting}
                                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-electric-cyan focus:ring-electric-cyan focus:ring-offset-0"
                            />
                            <div>
                                <div className="text-sm text-white">Include Media References</div>
                                <div className="text-xs text-zinc-500">Include paths to source media files</div>
                            </div>
                        </label>
                    </div>

                    {/* Export Info */}
                    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                        <div className="text-xs text-zinc-400 space-y-1">
                            <div><span className="text-zinc-500">Resolution:</span> {projectSettings.resolution.width} × {projectSettings.resolution.height}</div>
                            <div><span className="text-zinc-500">Frame Rate:</span> 30 fps</div>
                            <div><span className="text-zinc-500">Scenes:</span> {selectedSceneIds.length > 0 ? selectedSceneIds.length : scenes.length}</div>
                        </div>
                    </div>

                    {/* Instructions */}
                    {exportFormat === "aftereffects" && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="text-xs text-blue-300">
                                <strong>After Effects Instructions:</strong>
                                <ol className="mt-2 space-y-1 list-decimal list-inside">
                                    <li>Open After Effects</li>
                                    <li>Go to File → Scripts → Run Script File</li>
                                    <li>Select the exported .jsx file</li>
                                    <li>Update media paths in the script if needed</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {exportFormat === "premiere" && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                            <div className="text-xs text-purple-300">
                                <strong>Premiere Pro Instructions:</strong>
                                <ol className="mt-2 space-y-1 list-decimal list-inside">
                                    <li>Open Premiere Pro</li>
                                    <li>Go to Window → Essential Graphics</li>
                                    <li>Click Install Motion Graphics Template</li>
                                    <li>Select the exported .mogrt file</li>
                                </ol>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex items-center justify-between bg-zinc-950">
                    {exportSuccess ? (
                        <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Export successful!</span>
                        </div>
                    ) : (
                        <div className="text-xs text-zinc-500">
                            Export will download automatically
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isExporting}
                            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting || scenes.length === 0}
                            className="px-4 py-2 bg-electric-cyan text-black rounded-lg text-sm font-bold hover:bg-electric-cyan/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isExporting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Export
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
