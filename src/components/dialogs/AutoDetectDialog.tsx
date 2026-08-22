"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Camera, Sparkles, Loader2, Check, Trash2 } from "lucide-react";
import { detectAllSurfaces, type DetectedSurface, type DetectionOptions } from "@/lib/cv-utils";
import { useProjectStore } from "@/store/project-store";

interface AutoDetectDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AutoDetectDialog({ isOpen, onClose }: AutoDetectDialogProps) {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [imageUrl, setImageUrl] = useState<string>("");
    const [isDetecting, setIsDetecting] = useState(false);
    const [detections, setDetections] = useState<DetectedSurface[]>([]);
    const [selectedDetections, setSelectedDetections] = useState<Set<string>>(new Set());
    const [sensitivity, setSensitivity] = useState(0.5);
    const [minArea, setMinArea] = useState(1000);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCameraMode, setIsCameraMode] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const addSurface = useProjectStore((state) => state.addSurface);
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const resolution = useProjectStore((state) => state.projectSettings.resolution);

    const [cvLoaded, setCvLoaded] = useState(false);
    const [cvLoading, setCvLoading] = useState(false);

    // Clean up on unmount and pre-load CV
    useEffect(() => {
        if (isOpen && !cvLoaded && !cvLoading) {
            const load = async () => {
                setCvLoading(true);
                try {
                    const { loadOpenCV } = await import("@/lib/cv-utils");
                    await loadOpenCV();
                    setCvLoaded(true);
                } catch (err) {
                    console.error("OpenCV load failed:", err);
                } finally {
                    setCvLoading(false);
                }
            };
            load();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [isOpen, cvLoaded, cvLoading, stream, imageUrl]);

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setImageUrl(url);

        const img = new Image();
        img.onload = () => {
            setImage(img);
            drawImage(img);
        };
        img.src = url;
    };

    // Start camera
    const handleStartCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            setStream(mediaStream);
            setIsCameraMode(true);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play();
            }
        } catch (error) {
            console.error("Failed to start camera:", error);
            alert("Failed to access camera. Please check permissions.");
        }
    };

    // Capture from camera
    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);

        // Stop camera
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraMode(false);

        // Create image from canvas
        const img = new Image();
        img.onload = () => {
            setImage(img);
            drawImage(img);
        };
        img.src = canvas.toDataURL();
    };

    // Draw image on canvas
    const drawImage = (img: HTMLImageElement) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Fit image to canvas while maintaining aspect ratio
        const maxWidth = 800;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
    };

    // Run detection
    const handleDetect = async () => {
        if (!image || !canvasRef.current) return;

        setIsDetecting(true);
        setDetections([]);
        setSelectedDetections(new Set());

        try {
            // Use the already downscaled canvas for detection to significantly improve performance
            const detectionTarget = canvasRef.current;
            const options: DetectionOptions = {
                sensitivity,
                minArea,
                maxSurfaces: 10,
                detectRectangular: true,
                detectCurved: true,
                detectIrregular: true
            };

            const detected = await detectAllSurfaces(detectionTarget, options);
            setDetections(detected);

            // Auto-select all detections
            setSelectedDetections(new Set(detected.map(d => d.id)));

            // Draw detections on canvas
            drawDetections(detected);
        } catch (error) {
            console.error("Detection failed:", error);
            alert("Detection failed. Please try a different image or adjust settings.");
        } finally {
            setIsDetecting(false);
        }
    };

    // Draw detections on canvas
    const drawDetections = (dets: DetectedSurface[]) => {
        if (!canvasRef.current || !image) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Redraw image
        drawImage(image);

        // Draw each detection
        dets.forEach((detection, index) => {
            const isSelected = selectedDetections.has(detection.id);
            const color = isSelected ? getDetectionColor(index) : '#888888';
            const alpha = isSelected ? 0.5 : 0.2;

            // Draw polygon
            ctx.beginPath();
            ctx.moveTo(detection.corners[0].x, detection.corners[0].y);
            for (let i = 1; i < detection.corners.length; i++) {
                ctx.lineTo(detection.corners[i].x, detection.corners[i].y);
            }
            ctx.closePath();

            ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw corners
            detection.corners.forEach((corner, cornerIdx) => {
                ctx.beginPath();
                ctx.arc(corner.x, corner.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw corner number
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(String(cornerIdx + 1), corner.x + 10, corner.y - 10);
            });

            // Draw label
            const centerX = detection.boundingBox.x + detection.boundingBox.width / 2;
            const centerY = detection.boundingBox.y + detection.boundingBox.height / 2;

            ctx.fillStyle = color;
            ctx.fillRect(centerX - 40, centerY - 15, 80, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Surface ${index + 1}`, centerX, centerY + 5);
            ctx.textAlign = 'left';
        });
    };

    // Get color for detection
    const getDetectionColor = (index: number): string => {
        const colors = [
            '#00ff00', // Green
            '#0080ff', // Blue
            '#ff00ff', // Magenta
            '#ffff00', // Yellow
            '#00ffff', // Cyan
            '#ff8000', // Orange
            '#8000ff', // Purple
            '#ff0080', // Pink
        ];
        return colors[index % colors.length];
    };

    // Toggle detection selection
    const toggleDetection = (id: string) => {
        const newSelected = new Set(selectedDetections);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedDetections(newSelected);
        drawDetections(detections);
    };

    // Generate surfaces from selected detections
    const handleGenerate = () => {
        const selected = detections.filter(d => selectedDetections.has(d.id));

        selected.forEach((detection, index) => {
            // Scale coordinates from image space to canvas space
            const scaleX = resolution.width / (canvasRef.current?.width || 1);
            const scaleY = resolution.height / (canvasRef.current?.height || 1);

            // Scale from image coordinates to normalized coordinates (-0.5 to 0.5)
            const normalizedCorners = detection.corners.map(corner => ({
                x: (corner.x / (canvasRef.current?.width || 1)) - 0.5,
                y: 0.5 - (corner.y / (canvasRef.current?.height || 1))
            }));

            // Create surface with default values
            addSurface();

            // Get the newly created surface ID (it's the last one and auto-selected)
            const surfaces = useProjectStore.getState().surfaces;
            const newSurfaceId = surfaces[surfaces.length - 1].id;

            // Update with detected coordinates
            updateSurface(newSurfaceId, {
                name: `Auto Surface ${index + 1}`,
                corners: normalizedCorners.slice(0, 4), // Use first 4 corners for corner pin
                duration: 30
            });
        });

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="bg-dark-800 border border-dark-700 rounded-lg shadow-2xl w-[90vw] h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-700">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-electric-cyan" />
                        <h2 className="text-lg font-semibold">Auto Surface Detection</h2>
                        {cvLoading && (
                            <div className="flex items-center gap-2 ml-4 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded text-xs animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading AI Core...
                            </div>
                        )}
                        {cvLoaded && (
                            <div className="flex items-center gap-2 ml-4 px-2 py-0.5 bg-green-500/20 text-green-500 rounded text-xs">
                                <Check className="w-3 h-3" />
                                AI Ready
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-dark-700 rounded transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Canvas Preview */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-dark-900">
                        {!image && !isCameraMode && (
                            <div className="text-center">
                                <p className="text-gray-400 mb-4">Upload an image or use your camera</p>
                                <div className="flex gap-4 justify-center">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2 bg-electric-cyan text-black rounded hover:bg-electric-cyan/80 transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload Image
                                    </button>
                                    <button
                                        onClick={handleStartCamera}
                                        className="flex items-center gap-2 px-4 py-2 bg-dark-700 rounded hover:bg-dark-600 transition-colors"
                                    >
                                        <Camera className="w-4 h-4" />
                                        Use Camera
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>
                        )}

                        {isCameraMode && (
                            <div className="relative">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="max-w-full max-h-[70vh] rounded"
                                />
                                <button
                                    onClick={handleCapture}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-electric-cyan text-black rounded-full hover:bg-electric-cyan/80 transition-colors font-semibold"
                                >
                                    Capture
                                </button>
                            </div>
                        )}

                        {image && !isCameraMode && (
                            <canvas
                                ref={canvasRef}
                                className="max-w-full max-h-full rounded shadow-lg"
                            />
                        )}
                    </div>

                    {/* Right: Controls & Detections */}
                    <div className="w-80 border-l border-dark-700 flex flex-col">
                        {/* Settings */}
                        <div className="p-4 border-b border-dark-700">
                            <h3 className="font-semibold mb-3">Detection Settings</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">
                                        Sensitivity: {Math.round(sensitivity * 100)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={sensitivity}
                                        onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">
                                        Min Area: {minArea}px
                                    </label>
                                    <input
                                        type="range"
                                        min="500"
                                        max="5000"
                                        step="100"
                                        value={minArea}
                                        onChange={(e) => setMinArea(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                <button
                                    onClick={handleDetect}
                                    disabled={!image || isDetecting}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-electric-cyan text-black rounded hover:bg-electric-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDetecting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Detecting...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Detect Surfaces
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Detections List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <h3 className="font-semibold mb-3">
                                Detected Surfaces ({detections.length})
                            </h3>

                            {detections.length === 0 && !isDetecting && (
                                <p className="text-sm text-gray-400">
                                    No surfaces detected yet. Upload an image and click "Detect Surfaces".
                                </p>
                            )}

                            <div className="space-y-2">
                                {detections.map((detection, index) => (
                                    <div
                                        key={detection.id}
                                        className={`p-3 rounded border cursor-pointer transition-colors ${selectedDetections.has(detection.id)
                                            ? 'border-electric-cyan bg-electric-cyan/10'
                                            : 'border-dark-600 hover:border-dark-500'
                                            }`}
                                        onClick={() => toggleDetection(detection.id)}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">Surface {index + 1}</span>
                                            <div
                                                className="w-4 h-4 rounded"
                                                style={{ backgroundColor: getDetectionColor(index) }}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-400 space-y-1">
                                            <div>Type: {detection.type}</div>
                                            <div>Corners: {detection.corners.length}</div>
                                            <div>Confidence: {Math.round(detection.confidence * 100)}%</div>
                                            <div>Area: {Math.round(detection.area)}px</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-dark-700 space-y-2">
                            <button
                                onClick={handleGenerate}
                                disabled={selectedDetections.size === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check className="w-4 h-4" />
                                Generate {selectedDetections.size} Surface{selectedDetections.size !== 1 ? 's' : ''}
                            </button>

                            {image && (
                                <button
                                    onClick={() => {
                                        setImage(null);
                                        setImageUrl("");
                                        setDetections([]);
                                        setSelectedDetections(new Set());
                                        if (canvasRef.current) {
                                            const ctx = canvasRef.current.getContext("2d");
                                            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-dark-700 rounded hover:bg-dark-600 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
