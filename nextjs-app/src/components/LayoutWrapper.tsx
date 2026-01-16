'use client';

import { useUser } from '@/contexts/UserContext';
import Sidebar from '@/components/Sidebar';
import { BackButtonHandler } from '@/hooks/useBackButton';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useEffect, useState } from 'react';
import { Network } from '@capacitor/network';
import OfflinePage from './OfflinePage';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useUser();
    const [isOnline, setIsOnline] = useState(true);

    // Track page views for analytics
    useAnalytics({ userId: user?.id, enabled: !isLoading });

    useEffect(() => {
        // Initial check
        Network.getStatus().then(status => {
            setIsOnline(status.connected);
        });

        // Listen for changes
        const listener = Network.addListener('networkStatusChange', status => {
            setIsOnline(status.connected);
        });

        return () => {
            listener.then(handle => handle.remove());
        };
    }, []);

    const showSidebar = !!user;

    if (!isOnline) {
        return <OfflinePage onRetry={() => Network.getStatus().then(s => setIsOnline(s.connected))} />;
    }

    return (
        <BackButtonHandler>
            <div className="min-h-screen">
                <Sidebar />
                <main className={`main-content ${!showSidebar ? 'no-sidebar' : ''}`}>
                    {children}
                </main>
            </div>
        </BackButtonHandler>
    );
}
