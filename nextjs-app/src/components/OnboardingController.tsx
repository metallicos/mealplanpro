'use client';

import { useEffect, useState } from 'react';
import OnboardingModal from './OnboardingModal';
import { useUser } from '@/contexts/UserContext';

export default function OnboardingController() {
    const { user, isLoading: isUserLoading } = useUser();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        // Skip if user is still loading
        if (isUserLoading) return;

        // Skip if no user logged in
        if (!user) {
            setHasChecked(true);
            return;
        }

        // Skip if user is admin
        if (user.role === 'admin') {
            console.log('[Onboarding] Skipping for admin user');
            setHasChecked(true);
            return;
        }

        // Check if dismissed recently (within 24 hours)
        const dismissed = localStorage.getItem('onboarding_dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const hoursSince = (Date.now() - dismissedTime) / (1000 * 60 * 60);
            console.log('[Onboarding] Dismissed', hoursSince.toFixed(1), 'hours ago');
            if (hoursSince < 24) {
                setHasChecked(true);
                return;
            } else {
                // Clear old dismissal
                localStorage.removeItem('onboarding_dismissed');
            }
        }

        const checkProfile = async () => {
            try {
                console.log('[Onboarding] Checking profile...');
                const res = await fetch('/api/v2/user/profile');
                console.log('[Onboarding] Profile response status:', res.status);

                if (res.status === 404) {
                    // No profile exists - show onboarding
                    console.log('[Onboarding] No profile found, showing onboarding');
                    setShowOnboarding(true);
                } else if (res.ok) {
                    const data = await res.json();
                    console.log('[Onboarding] Profile data:', data);
                    // Check if profile is incomplete (no goals set)
                    // The API returns { found: true, profile: { goals: ... } }
                    if (!data.profile?.goals) {
                        console.log('[Onboarding] Profile incomplete, showing onboarding');
                        setShowOnboarding(true);
                    } else {
                        console.log('[Onboarding] Profile complete, not showing');
                    }
                }
            } catch (error) {
                console.error('[Onboarding] Failed to check profile:', error);
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
