'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';

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
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastCode, setLastCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const scannerRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    const lookupBarcode = useCallback(async (barcode: string) => {
        if (isLoading || barcode === lastCode) return;

        setLastCode(barcode);
        setIsLoading(true);

        try {
            const response = await fetch(`/api/nutrition?barcode=${barcode}`);
            const data = await response.json();

            if (data.found) {
                // Stop scanner
                Quagga.stop();
                setIsScanning(false);
                onScanResult(data.product);
            } else {
                setError(data.error || 'Product not found');
                setTimeout(() => setError(null), 3000);
            }
        } catch (err) {
            setError('Failed to lookup product');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, lastCode, onScanResult]);

    const startScanner = useCallback(() => {
        if (!scannerRef.current || hasInitialized.current) return;
        hasInitialized.current = true;

        Quagga.init(
            {
                inputStream: {
                    type: 'LiveStream',
                    target: scannerRef.current,
                    constraints: {
                        facingMode: 'environment',
                        aspectRatio: { min: 1, max: 2 },
                    },
                },
                decoder: {
                    readers: [
                        'ean_reader',
                        'ean_8_reader',
                        'upc_reader',
                        'upc_e_reader',
                    ],
                },
                locate: true,
                locator: {
                    patchSize: 'medium',
                    halfSample: true,
                },
            },
            (err) => {
                if (err) {
                    console.error('Quagga init error:', err);
                    setError('Camera access denied or not available');
                    return;
                }
                Quagga.start();
                setIsScanning(true);
            }
        );

        Quagga.onDetected((result) => {
            const code = result.codeResult?.code;
            if (code) {
                lookupBarcode(code);
            }
        });
    }, [lookupBarcode]);

    useEffect(() => {
        startScanner();

        return () => {
            Quagga.stop();
            hasInitialized.current = false;
        };
    }, [startScanner]);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50">
                <h2 className="text-lg font-semibold text-white">📷 Scan Barcode</h2>
                <button
                    onClick={() => {
                        Quagga.stop();
                        onClose();
                    }}
                    className="text-white text-2xl hover:opacity-70"
                >
                    ✕
                </button>
            </div>

            {/* Scanner viewport */}
            <div className="flex-1 relative overflow-hidden">
                <div
                    ref={scannerRef}
                    className="absolute inset-0"
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                />

                {/* Scanning overlay */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-48 border-2 border-purple-500 rounded-lg">
                        <div className="absolute inset-0 border-4 border-transparent animate-pulse"
                            style={{
                                background: 'linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.3) 50%, transparent 100%)',
                                animation: 'scan 2s infinite'
                            }}
                        />
                    </div>
                </div>

                {/* Status messages */}
                {isLoading && (
                    <div className="absolute inset-x-0 bottom-24 flex justify-center">
                        <div className="bg-purple-600 text-white px-4 py-2 rounded-full animate-pulse">
                            🔍 Looking up product...
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-x-0 bottom-24 flex justify-center">
                        <div className="bg-red-600 text-white px-4 py-2 rounded-full">
                            ⚠️ {error}
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="p-4 bg-black/50 text-center">
                <p className="text-white/80 text-sm">
                    {isScanning
                        ? 'Point camera at product barcode'
                        : 'Initializing camera...'}
                </p>
                <p className="text-white/50 text-xs mt-1">
                    Supports EAN-13, EAN-8, UPC-A, UPC-E barcodes
                </p>
            </div>

            <style jsx>{`
                @keyframes scan {
                    0%, 100% { transform: translateX(-100%); }
                    50% { transform: translateX(100%); }
                }
                :global(video), :global(canvas.drawingBuffer) {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
            `}</style>
        </div>
    );
}
