'use client';

import { useEffect, useState } from 'react';
import OnboardingModal from './OnboardingModal';
import { useUser } from '@/contexts/UserContext';

export default function OnboardingController() {
    const { user, isLoading: isUserLoading } = useUser();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        // Skip if user is still loading or if user is admin
        if (isUserLoading) return;
        if (user?.role === 'admin') {
            setHasChecked(true);
            return;
        }

        const checkProfile = async () => {
            try {
                const res = await fetch('/api/v2/user/profile');
                if (res.status === 404) {
                    // Profile doesn't exist - show onboarding
                    setShowOnboarding(true);
                } else if (res.ok) {
                    const profile = await res.json();
                    // Check if profile is incomplete (no goals set)
                    if (!profile.goals) {
                        setShowOnboarding(true);
                    }
                }
            } catch (error) {
                console.error('Failed to check profile:', error);
            } finally {
                setHasChecked(true);
            }
        };

        checkProfile();
    }, [user, isUserLoading]);

    if (!hasChecked || isUserLoading) return null;

    return (
        <OnboardingModal
            isOpen={showOnboarding}
            onComplete={() => {
                setShowOnboarding(false);
                // Reload to refresh dashboard with personalized data
                window.location.reload();
            }}
        />
    );
}
