'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Settings, Camera, Shuffle, Globe, Heart, MessageSquare, Trash2 } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import FamilyManager from '@/components/FamilyManager';

export default function ProfilePage() {
    const { user, settings, updateSettings, isLoading } = useUser();
    const router = useRouter();
    const t = useTranslations('profile');

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

    // Socials
    const [facebook, setFacebook] = useState('');
    const [instagram, setInstagram] = useState('');
    const [twitter, setTwitter] = useState('');

    const [activeTab, setActiveTab] = useState<'profile' | 'posts'>('profile');
    const [myPosts, setMyPosts] = useState<any[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initialize form with user data
    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '');
            setEmail(user.email || '');
            setAvatarUrl(user.avatarUrl || '');
            // Need to fetch extra profile details (socials)
            fetch('/api/profile?user_id=' + user.id)
                .then(res => res.json())
                .then(data => {
                    if (data) {
                        setAvatarUrl(data.avatar_url || user.avatarUrl || ''); // Priority to profile
                        setNewsletterSubscribed(!!data.newsletterSubscribed);
                        // Assuming API returns socials (it does now)
                        if (data.facebook) setFacebook(data.facebook);
                        if (data.instagram) setInstagram(data.instagram);
                        if (data.twitter) setTwitter(data.twitter);
                    }
                });
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'posts' && user) {
            fetch(`/api/forum?user_id=${user.id}`)
                .then(res => res.json())
                .then(data => setMyPosts(data.posts || []));
        }
    }, [activeTab, user]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                setAvatarUrl(data.url);
            }
        } catch (err) { }
    };

    const generateAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
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
                    user_id: user?.id,
                    ...settings, // Include current settings to prevent overwriting with defaults
                    full_name: fullName,
                    email: email,
                    password: password || undefined,
                    avatar_url: avatarUrl,
                    facebook,
                    instagram,
                    twitter
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setPassword('');
                setConfirmPassword('');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setMessage({ type: 'error', text: 'Failed to update profile' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            const res = await fetch(`/api/forum/${postId}`, { method: 'DELETE' });
            if (res.ok) {
                setMyPosts(myPosts.filter(p => p.id !== postId));
            } else {
                alert('Failed to delete post');
            }
        } catch (err) { console.error(err); }
    };

    const handleUnsubscribe = async () => {
        if (!confirm('Are you sure you want to unsubscribe from the newsletter?')) return;
        try {
            const res = await fetch('/api/newsletter/unsubscribe', { method: 'POST' });
            if (res.ok) {
                setNewsletterSubscribed(false);
                setMessage({ type: 'success', text: 'Unsubscribed successfully.' });
            } else {
                setMessage({ type: 'error', text: 'Failed to unsubscribe.' });
            }
        } catch (err) { }
    };

    const handleDeleteAccount = async () => {
        if (!confirm('DANGER: Are you sure you want to delete your account? This action cannot be undone.')) return;
        if (!confirm('Please confirm again. All your data will be permanently lost.')) return;

        setIsSaving(true);
        try {
            const res = await fetch('/api/profile', { method: 'DELETE' });
            if (res.ok) {
                alert('Account deleted. Goodbye.');
                window.location.href = '/login';
            } else {
                setMessage({ type: 'error', text: 'Failed to delete account.' });
                setIsSaving(false);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred.' });
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!user) return <div className="p-8 text-center">Please log in to view profile.</div>;

    return (
        <div className="animate-fade-in max-w-4xl mx-auto p-4">
            <h1 className="page-title mb-6 flex items-center gap-2">{t('management')} <Settings size={24} className="text-violet-400" /></h1>

            <div className="flex gap-4 mb-6 border-b border-gray-800">
                <button
                    className={`pb-2 px-4 ${activeTab === 'profile' ? 'border-b-2 border-[var(--accent-primary)] text-white' : 'text-gray-400'}`}
                    onClick={() => setActiveTab('profile')}
                >
                    {t('editProfile')}
                </button>
                <button
                    className={`pb-2 px-4 ${activeTab === 'posts' ? 'border-b-2 border-[var(--accent-primary)] text-white' : 'text-gray-400'}`}
                    onClick={() => setActiveTab('posts')}
                >
                    {t('myPosts')}
                </button>
            </div>

            {activeTab === 'profile' ? (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="card p-6">
                        {message && (
                            <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-8 mb-8 items-center md:items-start">
                            {/* Avatar */}
                            <div className="text-center">
                                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700 mx-auto mb-4 border-4 border-[var(--accent-primary)] relative">
                                    {avatarUrl ? (
                                        <Image src={avatarUrl} alt="Avatar" width={128} height={128} className="object-cover w-full h-full" unoptimized />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl">{user.fullName?.[0]}</div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="btn-secondary text-xs py-2 cursor-pointer flex items-center gap-1 justify-center">
                                        <Camera size={14} /> {t('uploadPhoto')}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                    </label>
                                    <button type="button" onClick={generateAvatar} className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 justify-center">
                                        <Shuffle size={12} /> {t('generateAvatar')}
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <form onSubmit={handleSubmit} className="flex-1 w-full space-y-4">
                                <div>
                                    <label className="form-label">{t('fullName')}</label>
                                    <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="form-label">{t('email')}</label>
                                    <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>

                                <hr className="border-gray-800 my-4" />
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Globe size={16} /> {t('socialLinks')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="form-label text-xs">Facebook</label>
                                        <input className="form-input text-sm" placeholder="URL" value={facebook} onChange={e => setFacebook(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="form-label text-xs">Instagram</label>
                                        <input className="form-input text-sm" placeholder="URL" value={instagram} onChange={e => setInstagram(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="form-label text-xs">Twitter/X</label>
                                        <input className="form-input text-sm" placeholder="URL" value={twitter} onChange={e => setTwitter(e.target.value)} />
                                    </div>
                                </div>

                                <hr className="border-gray-800 my-4" />
                                <h3 className="font-semibold mb-4 flex items-center gap-2">{t('appTheme')}</h3>
                                <div className="flex flex-wrap gap-3 mb-2">
                                    {[
                                        { id: 'auto', color: '#333', label: t('themeAuto') },
                                        { id: 'emerald', color: '#10b981', label: t('themeEmerald') },
                                        { id: 'blue', color: '#3b82f6', label: t('themeBlue') },
                                        { id: 'purple', color: '#8b5cf6', label: t('themePurple') },
                                        { id: 'pink', color: '#ec4899', label: t('themePink') },
                                        { id: 'orange', color: '#f97316', label: t('themeOrange') },
                                        { id: 'cyan', color: '#06b6d4', label: t('themeCyan') },
                                    ].map((theme) => (
                                        <button
                                            key={theme.id}
                                            type="button"
                                            onClick={() => updateSettings({ themePreference: theme.id })}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${(settings.themePreference || 'auto') === theme.id
                                                ? 'ring-2 ring-white scale-110'
                                                : 'opacity-70 hover:opacity-100 hover:scale-105'
                                                }`}
                                            style={{ background: theme.id === 'auto' ? 'linear-gradient(to right, #10b981, #ec4899)' : theme.color }}
                                            title={theme.label}
                                        >
                                            {(settings.themePreference || 'auto') === theme.id && <div className="w-3 h-3 bg-white rounded-full shadow-md" />}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mb-4">{t('accentColorDesc')}</p>

                                <hr className="border-gray-800 my-4" />
                                <h3 className="font-semibold mb-2 flex items-center gap-2">{t('currency')}</h3>
                                <div className="relative">
                                    <CustomSelect
                                        value={settings.currency || 'USD'}
                                        onChange={(value) => updateSettings({ currency: value })}
                                        options={[
                                            { code: 'USD', name: 'US Dollar ($)' },
                                            { code: 'EUR', name: 'Euro (€)' },
                                            { code: 'GBP', name: 'British Pound (£)' },
                                            { code: 'CAD', name: 'Canadian Dollar ($)' },
                                            { code: 'AUD', name: 'Australian Dollar ($)' },
                                            { code: 'JPY', name: 'Japanese Yen (¥)' },
                                            { code: 'CNY', name: 'Chinese Yuan (¥)' },
                                            { code: 'INR', name: 'Indian Rupee (₹)' },
                                            { code: 'BRL', name: 'Brazilian Real (R$)' },
                                            { code: 'RUB', name: 'Russian Ruble (₽)' },
                                            { code: 'KRW', name: 'South Korean Won (₩)' },
                                            { code: 'SGD', name: 'Singapore Dollar ($)' },
                                            { code: 'NZD', name: 'New Zealand Dollar ($)' },
                                            { code: 'MXN', name: 'Mexican Peso ($)' },
                                            { code: 'HKD', name: 'Hong Kong Dollar ($)' },
                                            { code: 'CHF', name: 'Swiss Franc (Fr)' },
                                            { code: 'SEK', name: 'Swedish Krona (kr)' },
                                            { code: 'NOK', name: 'Norwegian Krone (kr)' },
                                            { code: 'DKK', name: 'Danish Krone (kr)' },
                                            { code: 'PLN', name: 'Polish Złoty (zł)' },
                                            { code: 'TRY', name: 'Turkish Lira (₺)' },
                                            { code: 'ZAR', name: 'South African Rand (R)' },
                                            { code: 'THB', name: 'Thai Baht (฿)' },
                                            { code: 'IDR', name: 'Indonesian Rupiah (Rp)' },
                                            { code: 'MYR', name: 'Malaysian Ringgit (RM)' },
                                            { code: 'PHP', name: 'Philippine Peso (₱)' },
                                            { code: 'VND', name: 'Vietnamese Dong (₫)' },
                                            { code: 'MAD', name: 'Moroccan Dirham (MAD)' }
                                        ].map(c => ({
                                            value: c.code,
                                            label: `${c.code} - ${c.name}`
                                        }))}
                                    />
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2 mb-4">{t('currencyDesc')}</p>

                                <hr className="border-gray-800 my-4" />
                                <div>
                                    <label className="form-label">{t('newPasswordOptional')}</label>
                                    <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} minLength={6} placeholder={t('leaveBlank')} />
                                </div>
                                {password && (
                                    <div>
                                        <label className="form-label">{t('confirmPassword')}</label>
                                        <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                    </div>
                                )}

                                <div className="flex justify-end pt-4">
                                    <button type="submit" disabled={isSaving} className="btn-primary">
                                        {isSaving ? t('saving') : t('saveChanges')}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Newsletter Section */}
                        <div className="mt-8 border-t border-gray-800 pt-8">
                            <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare size={16} /> Newsletter</h3>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div>
                                    <p className="font-medium">{newsletterSubscribed ? 'Subscribed' : 'Not Subscribed'}</p>
                                    <p className="text-sm text-gray-400">{newsletterSubscribed ? 'You are receiving updates.' : 'You are not valid for newsletter.'}</p>
                                </div>
                                {newsletterSubscribed && (
                                    <button
                                        type="button"
                                        onClick={handleUnsubscribe}
                                        className="text-sm text-red-400 hover:text-red-300 underline"
                                    >
                                        Unsubscribe
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="mt-8 border-t border-red-500/20 pt-8">
                            <h3 className="font-semibold mb-4 text-red-400 flex items-center gap-2"><Trash2 size={16} /> Danger Zone</h3>
                            <div className="p-4 border border-red-500/20 rounded-lg bg-red-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <p className="font-medium text-red-200">Delete Account</p>
                                    <p className="text-sm text-red-300/60">Permanently delete your account and all data.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors border border-red-500/20"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Family Management Section */}
                    <FamilyManager />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myPosts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 w-full col-span-2">{t('noPosts')}</div>
                    ) : (
                        myPosts.map(post => (
                            <div key={post.id} className="card relative group">
                                <Link href={`/forum/${post.id}`}>
                                    <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                                    <p className="text-sm text-gray-400 line-clamp-2">{post.content}</p>
                                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                                        <Heart size={12} className="text-red-400" /> {post.likes}
                                        <span>•</span>
                                        <MessageSquare size={12} /> {post.comment_count}
                                        <span>•</span>
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </div>
                                </Link>
                                <button
                                    onClick={() => handleDeletePost(post.id)}
                                    className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 p-2 rounded flex items-center gap-1"
                                >
                                    <Trash2 size={14} /> {t('delete')}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
