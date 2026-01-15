'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Time window for double-press to exit (in milliseconds)
const EXIT_TIMEOUT = 2000;

/**
 * Hook to handle hardware back button on Android and iOS
 * Implements native-like navigation behavior with double-tap to exit
 */
export function useBackButton() {
    const router = useRouter();
    const pathname = usePathname();
    const lastBackPressRef = useRef<number>(0);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const showExitToast = () => {
            // Create a simple toast element
            const toast = document.createElement('div');
            toast.textContent = 'Press back again to exit';
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(toast);

            // Remove toast after timeout
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
            toastTimeoutRef.current = setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.opacity = '0';
                    toast.style.transition = 'opacity 0.2s ease';
                    setTimeout(() => toast.remove(), 200);
                }
            }, EXIT_TIMEOUT);
        };

        const handleBackButton = async () => {
            // Pages where back should exit the app (dashboard is at root '/')
            const exitPages = ['/'];

            // Pages where back should go to dashboard (root '/')
            const toDashboardPages = ['/coach', '/fasting', '/macros', '/meals', '/statistics', '/profile'];

            if (exitPages.includes(pathname)) {
                const now = Date.now();
                const timeSinceLastPress = now - lastBackPressRef.current;

                if (timeSinceLastPress < EXIT_TIMEOUT) {
                    // Second press within timeout - exit the app
                    await App.minimizeApp();
                } else {
                    // First press - show toast and record time
                    lastBackPressRef.current = now;
                    showExitToast();
                }
            } else if (toDashboardPages.includes(pathname)) {
                // On feature pages, go back to dashboard (root)
                router.push('/');
            } else {
                // On other pages, use browser history
                router.back();
            }
        };

        // Register back button listener
        const listener = App.addListener('backButton', handleBackButton);

        return () => {
            listener.then(l => l.remove());
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, [pathname, router]);
}

/**
 * Component wrapper that sets up back button handling
 */
export function BackButtonHandler({ children }: { children: React.ReactNode }) {
    useBackButton();
    return <>{children}</>;
}
