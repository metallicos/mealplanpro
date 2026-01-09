'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Keyboard, Hash, Camera, X } from 'lucide-react';

// Type definitions for the experimental BarcodeDetector API
interface DetectedBarcode {
    boundingBox: DOMRectReadOnly;
    rawValue: string;
    format: string;
    cornerPoints: { x: number; y: number }[];
}

interface BarcodeDetectorOptions {
    formats?: string[];
}

interface IBarcodeDetector {
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

declare global {
    interface Window {
        BarcodeDetector: {
            new(options?: BarcodeDetectorOptions): IBarcodeDetector;
            getSupportedFormats(): Promise<string[]>;
        };
    }
}

interface NutritionData {
    barcode: string;
    name: string;
    brand: string;
    image_url: string | null;
    serving_size: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g: number;
    nutriscore: string | null;
}

interface BarcodeScannerProps {
    onScanResult: (data: NutritionData) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScanResult, onClose }: BarcodeScannerProps) {
    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('Initializing Camera...');
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(undefined);
    const processingRef = useRef(false); // Ref for loop access

    useEffect(() => {
        if (mode !== 'camera') {
            stopCamera();
            return;
        }

        let detector: IBarcodeDetector | null = null;
        let isLooping = true;

        const initCamera = async () => {
            try {
                // 1. Check for Native Support
                if (!('BarcodeDetector' in window)) {
                    throw new Error("Native Barcode Detector not supported on this device. Please use Manual Mode.");
                }

                // 2. Initialize Detector
                const formats = await window.BarcodeDetector.getSupportedFormats();
                if (formats.length === 0) {
                    throw new Error("No barcode formats supported.");
                }
                detector = new window.BarcodeDetector({
                    formats: ['ean_13', 'upc_a', 'ean_8', 'upc_e', 'code_128', 'code_39']
                });

                // 3. Get Camera Stream (High Res)
                const constraints: MediaStreamConstraints = {
                    audio: false,
                    video: {
                        facingMode: "environment",
                        // Request 4K / 1080p strictly
                        width: { ideal: 3840, min: 1920 },
                        height: { ideal: 2160, min: 1080 },
                        // Force continuous focus
                        // @ts-expect-error - advanced constraints are not fully typed
                        advanced: [{ focusMode: "continuous" }]
                    }
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                streamRef.current = stream;

                if (videoRef.current) {
                    const video = videoRef.current;
                    video.srcObject = stream;
                    await video.play();

                    // Debug info
                    const track = stream.getVideoTracks()[0];
                    const settings = track.getSettings();
                    setDebugInfo(`${settings.width}x${settings.height} @ ${Math.round(settings.frameRate || 0)}fps`);
                    setProcessingMessage(""); // Ready

                    // Start Scan Loop
                    scanLoop();
                }

            } catch (err: unknown) {
                console.error("Scanner init error:", err);
                setError(err instanceof Error ? err.message : 'Camera failed.');
                setProcessingMessage('');
            }
        };

        const scanLoop = async () => {
            if (!isLooping || !videoRef.current || !detector) return;

            if (!processingRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                    const barcodes: DetectedBarcode[] = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        const code = barcodes[0].rawValue;
                        handleBarcode(code);
                    }
                } catch {
                    // Ignore detection errors (common in loop)
                }
            }
            requestRef.current = requestAnimationFrame(scanLoop);
        };

        initCamera();

        return () => {
            isLooping = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            stopCamera();
        };
    }, [mode]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }
    };

    const handleBarcode = async (barcode: string) => {
        if (processingRef.current) return;

        processingRef.current = true;
        setIsProcessing(true);
        setProcessingMessage('Found it! Fetching details...');
        setError(null);

        if (navigator.vibrate) navigator.vibrate(200);

        try {
            const response = await fetch(`/api/nutrition?barcode=${barcode}`);
            const data = await response.json();

            if (data.found) {
                setProcessingMessage('Product found!');
                stopCamera(); // Stop processing immediately
                onScanResult(data.product);
            } else {
                setError(data.error || 'Product not found.');
                // Cooldown
                setTimeout(() => {
                    processingRef.current = false;
                    setIsProcessing(false);
                    setError(null);
                    setProcessingMessage('');
                }, 2000);
            }
        } catch (err) {
            setError('Connection failed');
            setTimeout(() => {
                processingRef.current = false;
                setIsProcessing(false);
                setError(null);
            }, 2000);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (barcodeInput.length > 3) {
            handleBarcode(barcodeInput);
        }
    };

    return (
        <div className="fixed inset-0 h-[100dvh] w-screen bg-black z-50 flex flex-col pt-safe-area-inset-top pb-safe-area-inset-bottom text-white overflow-hidden overscroll-none touch-none">
            {/* Header */}
            <div className="flex-none p-4 flex justify-between items-center bg-black/80 backdrop-blur-md z-30 shadow-md">
                <h2 className="font-bold text-lg text-white">Native Scanner</h2>
                <div className="flex gap-4 items-center">
                    {debugInfo && <span className="text-[10px] font-mono text-green-400 bg-green-900/30 px-2 py-1 rounded">{debugInfo}</span>}
                    <button
                        onClick={() => {
                            stopCamera();
                            onClose();
                        }}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative overflow-hidden bg-black flex flex-col">
                {mode === 'camera' ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                        {/* Native Video Element */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* Overlays */}
                        {!error && !isProcessing && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                <div className="relative w-80 h-48 border-2 border-green-400/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                                    <div className="w-full h-[2px] bg-green-400 shadow-[0_0_10px_#4ade80] absolute top-1/2 -translate-y-1/2 animate-scan-line"></div>
                                </div>
                                <p className="absolute mt-60 text-sm font-medium text-white/90 bg-black/60 px-4 py-1 rounded-full text-center backdrop-blur-sm">
                                    Use Native Camera • Tap to Focus
                                </p>
                            </div>
                        )}

                        {/* Status/Error Messages */}
                        {isProcessing && (
                            <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-bold text-lg text-green-400">{processingMessage}</p>
                            </div>
                        )}

                        {error && (
                            <div className="absolute bottom-24 left-4 right-4 z-20">
                                <div className="bg-red-500/90 text-white p-4 rounded-xl text-center shadow-lg animate-bounce-subtle backdrop-blur-md">
                                    <p className="font-bold mb-1 flex items-center justify-center gap-2"><AlertTriangle size={18} /> {error}</p>
                                    <button
                                        onClick={() => setMode('manual')}
                                        className="text-xs underline font-medium mt-1 hover:text-white/80"
                                    >
                                        Use Manual Entry
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-900">
                        {/* Manual Mode UI */}
                        <div className="w-full max-w-sm">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                                    <Keyboard size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Manual Entry</h3>
                                <p className="text-gray-400">Enter barcode number below</p>
                            </div>
                            <form onSubmit={handleManualSubmit}>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-4 text-center text-2xl tracking-widest text-white mb-6 focus:border-green-500 focus:ring-0 outline-none transition-colors"
                                    placeholder="00000000"
                                    value={barcodeInput}
                                    onChange={e => setBarcodeInput(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={isProcessing || barcodeInput.length < 3}
                                    className="w-full btn-primary py-4 rounded-xl text-lg font-bold disabled:opacity-50"
                                >
                                    {isProcessing ? 'Searching...' : 'Search'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Config Check ID (Hidden) */}
            <div id="native-scanner-v1" className="hidden" />

            {/* Bottom Controls */}
            <div className="flex-none bg-black p-4 pb-8 flex gap-3 border-t border-white/10 z-30">
                <button
                    onClick={() => setMode('camera')}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold ${mode === 'camera'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/40'
                        : 'bg-gray-800 text-gray-400'
                        }`}
                >
                    <Camera size={20} />
                    <span>Scan</span>
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold ${mode === 'manual'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/40'
                        : 'bg-gray-800 text-gray-400'
                        }`}
                >
                    <Hash size={20} />
                    <span>Manual</span>
                </button>
            </div>

            <style jsx global>{`
                @keyframes scan-line {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
                .pt-safe-area-inset-top {
                    padding-top: env(safe-area-inset-top);
                }
                .pb-safe-area-inset-bottom {
                    padding-bottom: env(safe-area-inset-bottom);
                }
            `}</style>
        </div>
    );
}
