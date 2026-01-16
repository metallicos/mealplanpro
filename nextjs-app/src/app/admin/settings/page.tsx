'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_pass: '',
        smtp_secure: false,
        smtp_from_email: '',
        smtp_from_name: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    ...data,
                    smtp_secure: data.smtp_secure === true || data.smtp_secure === 'true'
                });
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save');

            setMessage({ type: 'success', text: 'Settings saved successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">System Settings</h1>
                    <p className="text-gray-400">Configure email delivery (SMTP)</p>
                </div>
                <Link href="/admin" className="text-sm text-gray-400 hover:text-white">
                    ← Back to Dashboard
                </Link>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="card p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-800">
                        <Mail className="text-violet-500" />
                        <h2 className="text-lg font-semibold">SMTP Configuration</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label block mb-1">SMTP Host</label>
                            <input
                                type="text"
                                className="form-input w-full"
                                value={formData.smtp_host}
                                onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div>
                            <label className="form-label block mb-1">SMTP Port</label>
                            <input
                                type="number"
                                className="form-input w-full"
                                value={formData.smtp_port}
                                onChange={e => setFormData({ ...formData, smtp_port: e.target.value })}
                                placeholder="587"
                            />
                        </div>
                        <div>
                            <label className="form-label block mb-1">SMTP User</label>
                            <input
                                type="text"
                                className="form-input w-full"
                                value={formData.smtp_user}
                                onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                                placeholder="user@example.com"
                            />
                        </div>
                        <div>
                            <label className="form-label block mb-1">SMTP Password</label>
                            <input
                                type="password"
                                className="form-input w-full"
                                value={formData.smtp_pass}
                                onChange={e => setFormData({ ...formData, smtp_pass: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="form-label block mb-1">From Name</label>
                            <input
                                type="text"
                                className="form-input w-full"
                                value={formData.smtp_from_name}
                                onChange={e => setFormData({ ...formData, smtp_from_name: e.target.value })}
                                placeholder="Meal Plan Pro"
                            />
                        </div>
                        <div>
                            <label className="form-label block mb-1">From Email</label>
                            <input
                                type="email"
                                className="form-input w-full"
                                value={formData.smtp_from_email}
                                onChange={e => setFormData({ ...formData, smtp_from_email: e.target.value })}
                                placeholder="noreply@mealplanpro.com"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="secure"
                            checked={formData.smtp_secure}
                            onChange={e => setFormData({ ...formData, smtp_secure: e.target.checked })}
                            className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-violet-500"
                        />
                        <label htmlFor="secure" className="text-sm text-gray-300">
                            Use Secure Connection (SSL/TLS)
                        </label>
                    </div>

                    <div className="pt-6 border-t border-gray-800 flex justify-end gap-3">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
                            onClick={() => alert('Test function not implemented yet')} // Placeholder
                        >
                            Test Connection
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="btn-primary flex items-center gap-2 px-6"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
