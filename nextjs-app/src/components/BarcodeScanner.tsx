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
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        if (mode !== 'camera') {
            stopScanner();
            return;
        }

        const scannerId = "reader";
        let isMounted = true;

        const startScanner = async () => {
            try {
                // Ensure previous instance is stopped
                if (scannerRef.current) {
                    try {
                        await scannerRef.current.stop();
                        scannerRef.current.clear();
                    } catch (e) {
                        // ignore stop errors
                    }
                }

                // Wait a moment for DOM to settle
                await new Promise(r => setTimeout(r, 300));

                if (!document.getElementById(scannerId)) {
                    console.warn("Scanner element not found");
                    return;
                }

                const html5QrCode = new Html5Qrcode(scannerId, {
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    },
                    verbose: false,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.CODE_128,
                    ]
                });

                scannerRef.current = html5QrCode;

                if (!isMounted) return;

                const config = {
                    fps: 15, // Increased FPS for faster scanning
                    qrbox: { width: 320, height: 150 }, // Slightly wider for EAN-13
                    aspectRatio: 1.0,
                    // vital for mobile focus
                    videoConstraints: {
                        facingMode: "environment",
                        focusMode: "continuous",
                        width: { min: 640, ideal: 1920, max: 2560 }, // Higher resolution
                        height: { min: 480, ideal: 1080, max: 1440 },
                        /* @ts-ignore - zoom is supported in modern browsers but missing from types */
                        zoom: 2.0 // Attempt to apply digital zoom for better macro focus
                    }
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    async (decodedText) => {
                        if (!isProcessing) {
                            handleBarcode(decodedText);
                        }
                    },
                    (errorMessage) => {
                        // ignore frame errors
                    }
                );
                setProcessingMessage('');
            } catch (err) {
                console.error("Camera start error:", err);
                if (isMounted) {
                    setError('Camera access failed. Please use Manual Mode.');
                }
            }
        };

        startScanner();

        return () => {
            isMounted = false;
            stopScanner();
        };
    }, [mode]);

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                const scanner = scannerRef.current;
                scannerRef.current = null; // Detach ref first
                await scanner.stop();
                scanner.clear();
            } catch (ignore) { }
        }
    };

    const handleBarcode = async (barcode: string) => {
        if (isProcessing) return;

        setIsProcessing(true);
        setProcessingMessage('Barcode detected! Fetching info...');
        setError(null);

        // Optional: Vibration feedback
        if (navigator.vibrate) navigator.vibrate(200);

        try {
            // Pause scanner but don't stop camera yet to keep UI fluid
            if (scannerRef.current) {
                scannerRef.current.pause();
            }

            const response = await fetch(`/api/nutrition?barcode=${barcode}`);
            const data = await response.json();

            if (data.found) {
                setProcessingMessage('Product found!');
                await stopScanner();
                onScanResult(data.product);
            } else {
                setError(data.error || 'Product not found.');
                setProcessingMessage('');
                // Resume scanning after a delay
                setTimeout(() => {
                    setIsProcessing(false);
                    setError(null);
                    if (scannerRef.current) scannerRef.current.resume();
                }, 2000);
            }
        } catch (err) {
            setError('Connection error.');
            setProcessingMessage('');
            setTimeout(() => {
                setIsProcessing(false);
                setError(null);
                if (scannerRef.current) scannerRef.current.resume();
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
            {/* Header - Fixed to top, high z-index */}
            <div className="flex-none p-4 flex justify-between items-center bg-black/80 backdrop-blur-md z-30 shadow-md">
                <h2 className="font-bold text-lg text-white">Scan Barcode</h2>
                <button
                    onClick={() => {
                        stopScanner();
                        onClose();
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden bg-black flex flex-col">
                {mode === 'camera' ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                        {/* Camera Container with explicit max dimensions for mobile */}
                        <div id="reader" className="w-full h-full absolute inset-0 bg-black">
                            {/* html5-qrcode injects video here */}
                        </div>

                        {/* Scanner Overlay UI */}
                        {!error && !isProcessing && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                <div className="relative w-72 h-48 border-2 border-cyan-400/60 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                    {/* Corner markers */}
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>

                                    {/* Scan line */}
                                    <div className="w-full h-[2px] bg-cyan-400 shadow-[0_0_10px_#22d3ee] absolute top-1/2 -translate-y-1/2 animate-scan-line"></div>
                                </div>
                                <p className="absolute mt-64 text-sm font-medium text-white/80 tracking-wide bg-black/60 px-4 py-1 rounded-full">
                                    Align Barcode in Frame
                                </p>
                            </div>
                        )}

                        {/* Status Messages */}
                        {isProcessing && (
                            <div className="absolute inset-0 z-20 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
                                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-bold text-lg text-cyan-400">{processingMessage}</p>
                            </div>
                        )}

                        {error && (
                            <div className="absolute bottom-8 left-4 right-4 z-20">
                                <div className="bg-red-500/90 text-white p-4 rounded-xl text-center shadow-lg animate-bounce-subtle backdrop-blur-md">
                                    <p className="font-bold mb-1">⚠️ {error}</p>
                                    <button
                                        onClick={() => setMode('manual')}
                                        className="text-xs underline font-medium mt-1 hover:text-white/80"
                                    >
                                        Tap here to switch to Manual Mode
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-900">
                        <div className="w-full max-w-sm">
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">⌨️</div>
                                <h3 className="text-2xl font-bold text-white mb-2">Manual Entry</h3>
                                <p className="text-gray-400">Enter the barcode number printed on the package.</p>
                            </div>
                            <form onSubmit={handleManualSubmit}>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-4 text-center text-2xl tracking-widest text-white mb-6 focus:border-cyan-500 focus:ring-0 outline-none transition-colors"
                                    placeholder="00000000"
                                    value={barcodeInput}
                                    onChange={e => setBarcodeInput(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={isProcessing || barcodeInput.length < 3}
                                    className="w-full btn-primary py-4 rounded-xl text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                                >
                                    {isProcessing ? 'Searching...' : 'Search Product'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="flex-none bg-black p-4 pb-8 flex gap-3 border-t border-white/10 z-30">
                <button
                    onClick={() => setMode('camera')}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold ${mode === 'camera'
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                        : 'bg-gray-800 text-gray-400'
                        }`}
                >
                    <span className="text-xl">📷</span>
                    <span>Scan</span>
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold ${mode === 'manual'
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                        : 'bg-gray-800 text-gray-400'
                        }`}
                >
                    <span className="text-xl">#️⃣</span>
                    <span>Manual</span>
                </button>
            </div>

            <style jsx global>{`
                #reader video {
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 0 !important;
                }
                #reader__scan_region {
                    display: none !important;
                }
                #reader__dashboard_section_csr span {
                    display: none !important;
                }
                @keyframes scan-line {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
                /* Safe Area Support */
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
