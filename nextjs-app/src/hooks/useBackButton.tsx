'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Hook to handle hardware back button on Android and iOS
 * Implements native-like navigation behavior
 */
export function useBackButton() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const handleBackButton = async () => {
            // Pages where back should exit the app
            const exitPages = ['/', '/dashboard'];

            // Pages where back should go to dashboard
            const toDashboardPages = ['/coach', '/fasting', '/macros', '/meals', '/statistics', '/profile'];

            if (exitPages.includes(pathname)) {
                // On main pages, minimize the app (Android) or do nothing (iOS)
                await App.minimizeApp();
            } else if (toDashboardPages.includes(pathname)) {
                // On feature pages, go back to dashboard
                router.push('/dashboard');
            } else {
                // On other pages, use browser history
                router.back();
            }
        };

        // Register back button listener
        const listener = App.addListener('backButton', handleBackButton);

        return () => {
            listener.then(l => l.remove());
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
