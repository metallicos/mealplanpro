import React from 'react';
import { AlertCircle, Trash2, Info, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    isLoading = false,
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            icon: 'text-red-500',
            button: 'bg-red-600 hover:bg-red-700',
            iconComponent: Trash2
        },
        warning: {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            icon: 'text-amber-500',
            button: 'bg-amber-600 hover:bg-amber-700',
            iconComponent: AlertCircle
        },
        info: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            icon: 'text-blue-500',
            button: 'bg-blue-600 hover:bg-blue-700',
            iconComponent: Info
        }
    };

    const style = colors[type];
    const Icon = style.iconComponent;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className={`w-full max-w-md ${style.bg} border ${style.border} rounded-2xl p-6 shadow-2xl relative animate-scale-in`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${style.bg} ${style.border} border flex items-center justify-center ${style.icon}`}>
                        <Icon size={24} />
                    </div>

                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <p className="text-gray-300">{message}</p>

                    <div className="flex gap-3 w-full mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors font-medium border border-white/5"
                            disabled={isLoading}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2 rounded-xl text-white transition-all font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${style.button}`}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
