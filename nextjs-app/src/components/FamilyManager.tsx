'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Crown, User, X } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export default function FamilyManager() {
    const { user } = useUser();
    const tFamily = useTranslations('family');
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [familyRefreshTrigger, setFamilyRefreshTrigger] = useState(0);

    if (user?.role !== 'master') return null;

    return (
        <div className="card border-emerald-500/30 bg-emerald-500/5 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">{tFamily('myFamily')} <Users size={20} /></h3>
                    <p className="text-sm text-[var(--text-secondary)]">{tFamily('manageHousehold')}</p>
                </div>
                <button
                    onClick={() => setShowFamilyModal(true)}
                    className="btn-primary w-full sm:w-auto"
                >
                    + {tFamily('addMember')}
                </button>
            </div>

            <FamilyList refreshTrigger={familyRefreshTrigger} />

            {showFamilyModal && (
                <FamilyModal
                    onClose={() => setShowFamilyModal(false)}
                    onSuccess={() => {
                        setFamilyRefreshTrigger(prev => prev + 1);
                        setShowFamilyModal(false);
                    }}
                />
            )}
        </div>
    );
}

function FamilyList({ refreshTrigger }: { refreshTrigger: number }) {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const tFamily = useTranslations('family');

    useEffect(() => {
        fetch('/api/family')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setMembers(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [refreshTrigger]);

    if (loading) return <div className="text-sm text-gray-400">{tFamily('loadingFamily')}</div>;

    return (
        <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
            {members.map(member => (
                <div
                    key={member.id}
                    className="flex-shrink-0 w-40 sm:w-auto p-2 sm:p-3 rounded-lg bg-[var(--bg-secondary)] flex items-center gap-2"
                >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        {member.role === 'master' ? (
                            <Crown size={16} className="text-amber-400" />
                        ) : (
                            <User size={16} className="text-violet-400" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base flex items-center gap-1 truncate">
                            {member.full_name}
                            {member.role === 'master' && (
                                <span className="text-[10px] sm:text-xs bg-yellow-500/20 text-yellow-500 px-1 rounded">{tFamily('master')}</span>
                            )}
                        </div>
                        <div className="text-[10px] sm:text-xs text-[var(--text-muted)] truncate">{member.email}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function FamilyModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const tFamily = useTranslations('family');
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/family', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to add member');

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-sm animate-fade-in relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={18} /></button>
                <h3 className="text-lg font-bold mb-4">{tFamily('addFamilyMember')}</h3>

                {error && <div className="bg-red-500/20 text-red-500 p-2 rounded text-sm mb-3">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="form-label">{tFamily('fullName')}</label>
                        <input
                            className="form-input w-full"
                            value={formData.fullName}
                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">{tFamily('email')}</label>
                        <input
                            type="email"
                            className="form-input w-full"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">{tFamily('password')}</label>
                        <input
                            type="password"
                            className="form-input w-full"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary w-full mt-2"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? tFamily('adding') : tFamily('addMember')}
                    </button>
                </form>
            </div>
        </div>
    );
}
