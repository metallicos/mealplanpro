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

        // Check if dismissed recently (within 24 hours)
        const dismissed = localStorage.getItem('onboarding_dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const hoursSince = (Date.now() - dismissedTime) / (1000 * 60 * 60);
            if (hoursSince < 24) {
                setHasChecked(true);
                return;
            }
        }

        const checkProfile = async () => {
            try {
                const res = await fetch('/api/v2/user/profile');
                if (res.status === 404) {
                    setShowOnboarding(true);
                } else if (res.ok) {
                    const profile = await res.json();
                    if (!profile.profile?.goals) {
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

    const handleDismiss = () => {
        localStorage.setItem('onboarding_dismissed', Date.now().toString());
        setShowOnboarding(false);
    };

    return (
        <OnboardingModal
            isOpen={showOnboarding}
            onComplete={() => {
                setShowOnboarding(false);
                window.location.reload();
            }}
            onDismiss={handleDismiss}
        />
    );
}
