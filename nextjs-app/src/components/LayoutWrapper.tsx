'use client';

import { useUser } from '@/contexts/UserContext';
import Sidebar from '@/components/Sidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useUser();

    // While loading, we can show a spinner or just render the content without sidebar to avoid flicker
    // However, for better UX on protected routes, we might want to wait. 
    // But since this wraps everything, let's just default to "no sidebar" state if loading or no user.

    const showSidebar = !!user;

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className={`main-content ${!showSidebar ? 'no-sidebar' : ''}`}>
                {children}
            </main>
        </div>
    );
}
