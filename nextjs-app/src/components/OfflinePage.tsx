import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflinePageProps {
    onRetry: () => void;
}

const OfflinePage: React.FC<OfflinePageProps> = ({ onRetry }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#030712] p-6 text-center animate-fade-in">
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-full shadow-2xl shadow-emerald-900/20">
                    <WifiOff size={64} className="text-emerald-500" />
                </div>
            </div>

            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                No Connection
            </h1>

            <p className="text-slate-400 mb-8 max-w-xs">
                It looks like you're offline. Please check your internet connection and try again.
            </p>

            <button
                onClick={onRetry}
                className="group relative px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all active:scale-95 hover:shadow-emerald-500/40"
            >
                <span className="flex items-center gap-2">
                    <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                    Try Again
                </span>
            </button>
        </div>
    );
};

export default OfflinePage;
