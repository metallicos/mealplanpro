'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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
    const [isProcessing, setIsProcessing] = useState(false); // Unified loading state
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [debug, setDebug] = useState('');

    useEffect(() => {
        if (mode !== 'camera') {
            stopScanner();
            return;
        }

        const scannerId = "reader";
        const startScanner = async () => {
            try {
                // setDebug('Initializing camera...');
                const html5QrCode = new Html5Qrcode(scannerId, {
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    },
                    verbose: false
                });

                scannerRef.current = html5QrCode;

                const config = {
                    fps: 15, // Higher FPS for smoother scanning
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    videoConstraints: {
                        facingMode: "environment",
                        focusMode: "continuous", // critical for barcodes
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    async (decodedText) => {
                        handleBarcode(decodedText);
                    },
                    (errorMessage) => {
                        // ignore frame errors
                    }
                );
                // setDebug('Camera active');
            } catch (err) {
                console.error(err);
                setError('Could not access camera. Try Manual Mode.');
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(startScanner, 100);

        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, [mode]);

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (ignore) { }
        }
    };

    const handleBarcode = async (barcode: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setError(null);
        if (mode === 'camera') stopScanner(); // Stop camera once scanned

        try {
            const response = await fetch(`/api/nutrition?barcode=${barcode}`);
            const data = await response.json();

            if (data.found) {
                onScanResult(data.product);
            } else {
                setError(data.error || 'Product not found.');
                setIsProcessing(false);
                // If camera mode, maybe restart? For now, let user decide action
            }
        } catch (err) {
            setError('Failed to fetch product data.');
            setIsProcessing(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (barcodeInput.length > 3) {
            handleBarcode(barcodeInput);
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md absolute top-0 left-0 right-0 z-20">
                <h2 className="font-bold text-lg">Scan Information</h2>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                >
                    ✕
                </button>
            </div>

            {/* Content Swapper */}
            <div className="flex-1 relative bg-gray-900 flex flex-col justify-center">
                {mode === 'camera' ? (
                    <>
                        <div id="reader" className="w-full h-full absolute inset-0 object-cover" />
                        {!error && !isProcessing && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                {/* Modern "Technology" Overlay */}
                                <div className="relative w-64 h-48 border-2 border-cyan-400/50 rounded-lg">
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
                                    <div className="w-full h-[2px] bg-cyan-400/80 absolute top-1/2 -translate-y-1/2 animate-scan-line shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>
                                </div>
                                <p className="absolute mt-64 text-sm text-cyan-200/80 font-mono tracking-wider animate-pulse">
                                    ALIGN BARCODE
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="px-6 w-full max-w-sm mx-auto">
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-2">⌨️</div>
                            <h3 className="text-xl font-bold">Manual Entry</h3>
                            <p className="text-gray-400 text-sm">Type the barcode number below</p>
                        </div>
                        <form onSubmit={handleManualSubmit}>
                            <input
                                type="text"
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-center text-xl tracking-widest mb-4 focus:ring-2 focus:ring-cyan-500 outline-none"
                                placeholder="e.g. 6111242100992"
                                value={barcodeInput}
                                onChange={e => setBarcodeInput(e.target.value)}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={isProcessing || barcodeInput.length < 3}
                                className="w-full btn-primary py-3 rounded-xl disabled:opacity-50"
                            >
                                {isProcessing ? 'Searching...' : 'Search Product'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Loading / Error Overlay */}
                {isProcessing && mode === 'camera' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="font-mono text-cyan-400">ANALYZING...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute bottom-24 left-6 right-6 p-4 bg-red-500/90 text-white rounded-xl text-center z-30 animate-bounce-subtle">
                        {error}
                        {mode === 'camera' && (
                            <button
                                onClick={() => setMode('manual')}
                                className="block w-full mt-2 text-xs underline font-bold"
                            >
                                Switch to Manual Input
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="bg-black p-6 pb-8 flex justify-center gap-4">
                <button
                    onClick={() => setMode('camera')}
                    className={`flex-1 py-3 px-4 rounded-xl flex flex-col items-center gap-1 transition-all ${mode === 'camera'
                            ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    <span className="text-lg">📷</span>
                    <span className="text-xs font-bold">SCANNER</span>
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-3 px-4 rounded-xl flex flex-col items-center gap-1 transition-all ${mode === 'manual'
                            ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    <span className="text-lg">#️⃣</span>
                    <span className="text-xs font-bold">MANUAL</span>
                </button>
            </div>

            <style jsx global>{`
                #reader video {
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                }
                @keyframes scan-line {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
}
