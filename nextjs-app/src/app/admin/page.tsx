'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Settings, X } from 'lucide-react';

interface Household {
    id: number;
    name: string;
    master_email: string;
    master_name: string;
    member_count: number;
    created_at: string;
}

export default function AdminPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const router = useRouter();
    const [households, setHouseholds] = useState<Household[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        householdName: '',
        email: '',
        password: '',
        fullName: ''
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isUserLoading) {
            if (!user || user.role !== 'admin') {
                router.push('/');
                return;
            }
            fetchHouseholds();
        }
    }, [user, isUserLoading, router]);

    const fetchHouseholds = async () => {
        try {
            const res = await fetch('/api/admin/households');
            if (res.ok) {
                const data = await res.json();
                setHouseholds(data);
            }
        } catch (error) {
            console.error('Failed to fetch households', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/admin/households', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create household');
            }

            setShowModal(false);
            setFormData({ householdName: '', email: '', password: '', fullName: '' });
            fetchHouseholds();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error creating household');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isUserLoading || isLoading) return <div className="p-8 text-center">Loading admin panel...</div>;

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="page-title flex items-center gap-2">System Administration <Settings size={24} className="text-violet-400" /></h1>
                    <p className="page-subtitle">Manage master accounts and households</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    + Create Master Account
                </button>
            </div>

            {/* Households Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#ffffff1a]">
                            <th className="p-4 font-semibold text-[#a855f7]">Household Name</th>
                            <th className="p-4 font-semibold text-[#a855f7]">Master User</th>
                            <th className="p-4 font-semibold text-[#a855f7]">Members</th>
                            <th className="p-4 font-semibold text-[#a855f7]">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {households.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-400">
                                    No households found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            households.map((h) => (
                                <tr key={h.id} className="border-b border-[#ffffff0d] hover:bg-[#ffffff05]">
                                    <td className="p-4 font-medium">{h.name}</td>
                                    <td className="p-4">
                                        <div className="font-medium">{h.master_name}</div>
                                        <div className="text-xs text-gray-400">{h.master_email}</div>
                                    </td>
                                    <td className="p-4 flex items-center gap-2">
                                        <span className="bg-[#a855f733] text-[#d8b4fe] px-2 py-1 rounded text-xs font-bold">
                                            {h.member_count}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-400">
                                        {new Date(h.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-lg animate-fade-in relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X size={18} />
                        </button>

                        <h2 className="text-xl font-bold mb-6">Create New Master Account</h2>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="form-label">Household Name (e.g., &quot;The Smiths&quot;)</label>
                                <input
                                    type="text"
                                    className="form-input w-full"
                                    value={formData.householdName}
                                    onChange={e => setFormData({ ...formData, householdName: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Master Full Name</label>
                                <input
                                    type="text"
                                    className="form-input w-full"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input w-full"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Password</label>
                                    <input
                                        type="password"
                                        className="form-input w-full"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
