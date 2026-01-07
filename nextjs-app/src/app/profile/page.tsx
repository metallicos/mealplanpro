'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import Image from 'next/image';

export default function ProfilePage() {
    const { user, isLoading } = useUser();

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initialize form with user data
    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '');
            setEmail(user.email || '');
            setAvatarUrl(user.avatarUrl || '');
        }
    }, [user]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAvatarUrl(data.url);
            } else {
                setMessage({ type: 'error', text: 'Failed to upload avatar' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Upload error' });
        }
    };

    const generateAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
        // Using DiceBear Notionists style for specific gender-neutral look or specific style
        // Or 'avataaars'
        const url = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}`;
        setAvatarUrl(url);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (password && password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user?.id, // Explicitly target self
                    full_name: fullName,
                    email: email,
                    password: password || undefined, // Only send if changed
                    avatar_url: avatarUrl
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setPassword('');
                setConfirmPassword('');
                // Reload to refresh session
                setTimeout(() => window.location.reload(), 1000);
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!user) return <div className="p-8 text-center">Please log in to view profile.</div>;

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h1 className="page-title mb-6">Profile Management ⚙️</h1>

            <div className="card p-6">
                {message && (
                    <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                        {message.text}
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-8 mb-8 items-center md:items-start">
                    {/* Avatar Section */}
                    <div className="text-center">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700 mx-auto mb-4 border-4 border-[var(--accent-primary)] relative">
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt="Avatar"
                                    width={128}
                                    height={128}
                                    className="object-cover w-full h-full"
                                    unoptimized // For external avatars (DiceBear)
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">
                                    {user.fullName?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="btn-secondary text-xs py-2">
                                📷 Upload Photo
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            </label>
                            <button
                                type="button"
                                onClick={generateAvatar}
                                className="text-xs text-[var(--accent-primary)] hover:underline"
                            >
                                🎲 Generate Random Avatar
                            </button>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 w-full">
                        <div className="mb-4">
                            <h3 className="text-xl font-bold">{user.fullName}</h3>
                            <p className="text-[var(--text-secondary)]">{user.email}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="badge badge-primary uppercase text-xs">{user.role}</span>
                                {user.householdName && (
                                    <span className="badge bg-gray-700 text-gray-300 text-xs">🏠 {user.householdName}</span>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="form-label">Display Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <hr className="border-gray-800 my-4" />

                            <div>
                                <label className="form-label">New Password (optional)</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Leave blank to keep current"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    minLength={6}
                                />
                            </div>

                            {password && (
                                <div>
                                    <label className="form-label">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="btn-primary"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
