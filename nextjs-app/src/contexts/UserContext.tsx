'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types
export interface UserSession {
    id: number;
    email: string;
    fullName: string;
    role: 'admin' | 'master' | 'member';
    householdId: number | null;
    householdName?: string;
    avatarUrl?: string;
}

export interface UserSettings {
    weight: number;
    height: number;
    age: number;
    gender: 'male' | 'female';
    activityLevel: string;
    goal: string;
    dailyCalorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    dietMode: 'normal' | 'low_carb' | 'keto';
    neck: number;
    waist: number;
    hip: number;
    themePreference?: string;
    currency?: string;
}

interface UserContextType {
    user: UserSession | null;
    settings: UserSettings;
    isLoading: boolean;
    isSaving: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    updateSettings: (newSettings: Partial<UserSettings>) => Promise<boolean>;
    theme: {
        primary: string;
        secondary: string;
        accent: string;
        gradient: string;
        glow: string;
    };
}

// Default settings fallback
const defaultSettings: UserSettings = {
    weight: 0,
    height: 0,
    age: 0,
    dietMode: 'normal',
    neck: 0,
    waist: 0,
    hip: 0,
    gender: 'male',
    activityLevel: 'sedentary',
    goal: 'maintain',
    dailyCalorieTarget: 2000,
    proteinTarget: 150,
    carbsTarget: 200,
    fatTarget: 66,
    themePreference: 'auto',
    currency: 'USD',
};

// Theme configurations - Vitality Theme (Emerald/Teal)
const themes = {
    male: {
        primary: '#10b981',
        secondary: '#14b8a6',
        accent: '#06b6d4',
        gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)',
        glow: '0 0 30px rgba(16, 185, 129, 0.25)',
    },
    female: {
        primary: '#ec4899',
        secondary: '#f472b6',
        accent: '#fb7185',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fb7185 100%)',
        glow: '0 0 30px rgba(236, 72, 153, 0.3)',
    },
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserSession | null>(null);
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Initial session check
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    setUser(data.user);
                    await loadProfile(data.user.id);
                } else {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Session check failed', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const loadProfile = async (userId: number) => {
        try {
            const res = await fetch(`/api/profile?user_id=${userId}`); // Note: API expects user_id, make sure profile API supports int ID now
            // Checking profile API: it expects user_id param. But I changed DB to int. 
            // I need to update API to handle int IDs or just pass string representation.

            if (res.ok) {
                const data = await res.json();
                setSettings({
                    weight: data.weight || defaultSettings.weight,
                    height: data.height || defaultSettings.height,
                    age: data.age || defaultSettings.age,
                    gender: data.gender || defaultSettings.gender,
                    activityLevel: data.activityLevel || defaultSettings.activityLevel,
                    goal: data.goal || defaultSettings.goal,
                    dailyCalorieTarget: data.dailyCalorieTarget || defaultSettings.dailyCalorieTarget,
                    proteinTarget: data.proteinTarget || defaultSettings.proteinTarget,
                    carbsTarget: data.carbsTarget || defaultSettings.carbsTarget,
                    fatTarget: data.fatTarget || defaultSettings.fatTarget,
                    dietMode: data.dietMode || defaultSettings.dietMode,
                    neck: data.neck || defaultSettings.neck,
                    waist: data.waist || defaultSettings.waist,
                    hip: data.hip || defaultSettings.hip,
                    themePreference: data.themePreference || 'auto',
                    currency: data.currency || 'USD',
                });
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        }
    };

    const login = async (email: string, pass: string) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Login failed');
        }

        setUser(data.user);
        await loadProfile(data.user.id);
    };

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
        setSettings(defaultSettings);
        window.location.href = '/login';
    };

    // Theme configurations
    const colorThemes: Record<string, any> = {
        emerald: {
            primary: '#10b981',
            secondary: '#14b8a6',
            accent: '#06b6d4',
            gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)',
            glow: '0 0 30px rgba(16, 185, 129, 0.25)',
        },
        blue: {
            primary: '#3b82f6',
            secondary: '#60a5fa',
            accent: '#2563eb',
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #2563eb 100%)',
            glow: '0 0 30px rgba(59, 130, 246, 0.3)',
        },
        purple: {
            primary: '#8b5cf6',
            secondary: '#a78bfa',
            accent: '#7c3aed',
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #7c3aed 100%)',
            glow: '0 0 30px rgba(139, 92, 246, 0.3)',
        },
        pink: {
            primary: '#ec4899',
            secondary: '#f472b6',
            accent: '#fb7185',
            gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fb7185 100%)',
            glow: '0 0 30px rgba(236, 72, 153, 0.3)',
        },
        orange: {
            primary: '#f97316',
            secondary: '#fb923c',
            accent: '#ea580c',
            gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #ea580c 100%)',
            glow: '0 0 30px rgba(249, 115, 22, 0.3)',
        },
        cyan: {
            primary: '#06b6d4',
            secondary: '#22d3ee',
            accent: '#0891b2',
            gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 50%, #0891b2 100%)',
            glow: '0 0 30px rgba(6, 182, 212, 0.3)',
        },
    };

    // ...

    const updateSettings = async (newSettings: Partial<UserSettings>): Promise<boolean> => {
        // ... (rest of implementation) 
        // Note: reusing existing updateSettings
        if (!user) return false;

        try {
            setIsSaving(true);
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id, // Using the new int ID
                    ...settings,
                    ...newSettings
                }),
            });

            if (res.ok) {
                const updated = { ...settings, ...newSettings };
                setSettings(updated);
                return true;
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error('Failed to save settings:', res.status, errData);
                return false;
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // Derived theme based on preference or gender
    const getTheme = () => {
        if (settings.themePreference && settings.themePreference !== 'auto' && colorThemes[settings.themePreference]) {
            return colorThemes[settings.themePreference];
        }
        // Fallback to gender based
        return settings.gender === 'female' ? colorThemes.pink : colorThemes.emerald;
    };

    const theme = getTheme();

    // Apply theme CSS variables
    useEffect(() => {
        document.documentElement.style.setProperty('--accent-primary', theme.primary);
        document.documentElement.style.setProperty('--accent-secondary', theme.secondary);
        document.documentElement.style.setProperty('--accent-gradient', theme.gradient);
        document.documentElement.style.setProperty('--accent-glow', theme.glow);
    }, [theme]);

    return (
        <UserContext.Provider value={{ user, settings, isLoading, isSaving, login, logout, updateSettings, theme }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within UserProvider');
    }
    return context;
}
