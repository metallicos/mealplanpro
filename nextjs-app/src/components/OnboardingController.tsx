'use client';

import { useEffect, useState } from 'react';
import OnboardingModal from './OnboardingModal';

export default function OnboardingController() {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        const checkProfile = async () => {
            try {
                const res = await fetch('/api/v2/user/profile');
                if (res.status === 404) {
                    setShowOnboarding(true);
                } else if (res.ok) {
                    // Profile exists, maybe update global context if we had one
                }
            } catch (error) {
                console.error('Failed to check profile:', error);
            } finally {
                setHasChecked(true);
            }
        };

        checkProfile();
    }, []);

    if (!hasChecked) return null; // Or a spinner if blocking

    return (
        <OnboardingModal
            isOpen={showOnboarding}
            onComplete={() => {
                setShowOnboarding(false);
                // Optional: Trigger a reload to refresh dashboard with new personalized data
                window.location.reload();
            }}
        />
    );
}
