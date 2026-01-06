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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [debug, setDebug] = useState('Initializing...');

    useEffect(() => {
        const scannerId = "reader";

        const startScanner = async () => {
            try {
                setDebug('Starting camera...');
                const formatsToSupport = [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E
                ];

                const html5QrCode = new Html5Qrcode(scannerId, {
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    }
                });

                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        formatsToSupport: formatsToSupport
                    },
                    async (decodedText) => {
                        // Success callback
                        setDebug(`Detected: ${decodedText}`);
                        if (isLoading) return; // Prevent double scan

                        setIsLoading(true);
                        // Stop scanning when found
                        try {
                            await html5QrCode.stop();
                        } catch (e) {
                            console.warn('Failed to stop scanner', e);
                        }

                        // Lookup product
                        try {
                            const response = await fetch(`/api/nutrition?barcode=${decodedText}`);
                            const data = await response.json();

                            if (data.found) {
                                onScanResult(data.product);
                            } else {
                                setError(data.error || 'Product not found');
                                setTimeout(() => {
                                    setIsLoading(false);
                                    setError(null);
                                    // Restart scanner? Maybe just close or let user try again
                                    // ideally we'd restart, but for now showing error is clear
                                    onClose();
                                }, 3000);
                            }
                        } catch (err) {
                            setError('Failed to lookup product');
                            setTimeout(() => {
                                onClose();
                            }, 3000);
                        }
                    },
                    (errorMessage) => {
                        // error callback (called for every frame fail)
                        // console.log(errorMessage);
                    }
                );
                setDebug('Scanner running');
            } catch (err) {
                console.error(err);
                setError('Camera failed to start. Permissions?');
                setDebug('Start Error: ' + err);
            }
        };

        // Delay slightly for safe mount
        const timer = setTimeout(startScanner, 100);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
                <h2 className="text-white font-semibold">Scan Barcode</h2>
                <button
                    onClick={() => {
                        if (scannerRef.current) {
                            scannerRef.current.stop().catch(console.error);
                        }
                        onClose();
                    }}
                    className="text-white p-2 rounded-full bg-white/20 hover:bg-white/30"
                >
                    ✕
                </button>
            </div>

            {/* Camera View */}
            <div className="flex-1 flex items-center justify-center bg-black relative">
                <div id="reader" className="w-full h-full"></div>

                {/* Overlay box */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-green-500 rounded-lg shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                        <div className="w-full h-1 bg-green-500/50 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    </div>
                </div>
            </div>

            {/* Footer / Debug */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent text-center">
                <p className="text-white/70 text-sm mb-2">Align barcode within the frame</p>
                {isLoading && (
                    <div className="inline-block px-4 py-1 bg-purple-600 rounded-full text-white text-sm animate-pulse">
                        Searching...
                    </div>
                )}
                {error && (
                    <div className="inline-block px-4 py-1 bg-red-600 rounded-full text-white text-sm">
                        {error}
                    </div>
                )}
                <p className="text-gray-500 text-xs mt-2">{debug}</p>
            </div>

            <style jsx global>{`
                #reader video {
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                }
            `}</style>
        </div>
    );
}
