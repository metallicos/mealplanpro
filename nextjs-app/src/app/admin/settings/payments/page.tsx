'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, CreditCard, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

type TabType = 'general' | 'stripe' | 'paypal' | 'cmi';

export default function PaymentSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

    const [formData, setFormData] = useState({
        // General
        payment_premium_price_usd: '2.99',
        payment_premium_price_mad: '29',
        payment_trial_days: '14',

        // Stripe
        stripe_enabled: 'false',
        stripe_mode: 'test',
        stripe_test_publishable_key: '',
        stripe_test_secret_key: '',
        stripe_live_publishable_key: '',
        stripe_live_secret_key: '',
        stripe_webhook_secret: '',
        stripe_price_id: '',

        // PayPal
        paypal_enabled: 'false',
        paypal_mode: 'sandbox',
        paypal_sandbox_client_id: '',
        paypal_sandbox_secret: '',
        paypal_live_client_id: '',
        paypal_live_secret: '',
        paypal_plan_id: '',

        // CMI
        cmi_enabled: 'false',
        cmi_mode: 'test',
        cmi_merchant_id: '',
        cmi_store_key: '',
        cmi_ok_url: '',
        cmi_fail_url: '',
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings/payments');
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, ...data }));
            }
        } catch (error) {
            console.error('Failed to load payment settings', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/settings/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save');

            setMessage({ type: 'success', text: 'Payment settings saved successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving payment settings' });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSecretVisibility = (field: string) => {
        setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const SecretInput = ({ name, value, placeholder }: { name: string; value: string; placeholder: string }) => (
        <div className="relative">
            <input
                type={showSecrets[name] ? 'text' : 'password'}
                className="form-input w-full pr-10"
                value={value}
                onChange={e => setFormData({ ...formData, [name]: e.target.value })}
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={() => toggleSecretVisibility(name)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
                {showSecrets[name] ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );

    const tabs: { id: TabType; label: string; icon: string }[] = [
        { id: 'general', label: 'General', icon: '⚙️' },
        { id: 'stripe', label: 'Stripe', icon: '💳' },
        { id: 'paypal', label: 'PayPal', icon: '🅿️' },
        { id: 'cmi', label: 'CMI Morocco', icon: '🇲🇦' },
    ];

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <CreditCard className="text-emerald-500" />
                        Payment Settings
                    </h1>
                    <p className="text-gray-400">Configure payment gateways and subscription pricing</p>
                </div>
                <Link href="/admin/settings" className="text-sm text-gray-400 hover:text-white">
                    ← Back to Settings
                </Link>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gray-800/50 text-gray-400 hover:text-white border border-transparent'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="card p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold border-b border-gray-800 pb-3">💰 Pricing & Trial</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="form-label block mb-1">Premium Price (USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input w-full"
                                        value={formData.payment_premium_price_usd}
                                        onChange={e => setFormData({ ...formData, payment_premium_price_usd: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Monthly subscription price</p>
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Premium Price (MAD)</label>
                                    <input
                                        type="number"
                                        step="1"
                                        className="form-input w-full"
                                        value={formData.payment_premium_price_mad}
                                        onChange={e => setFormData({ ...formData, payment_premium_price_mad: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">For Moroccan users</p>
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Trial Period (days)</label>
                                    <input
                                        type="number"
                                        className="form-input w-full"
                                        value={formData.payment_trial_days}
                                        onChange={e => setFormData({ ...formData, payment_trial_days: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Free trial for new signups</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stripe Tab */}
                    {activeTab === 'stripe' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <h2 className="text-lg font-semibold">💳 Stripe Configuration</h2>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.stripe_enabled === 'true'}
                                        onChange={e => setFormData({ ...formData, stripe_enabled: e.target.checked ? 'true' : 'false' })}
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-emerald-500"
                                    />
                                    <span className="text-sm text-gray-300">Enable Stripe</span>
                                </label>
                            </div>

                            <div className="flex gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="stripe_mode"
                                        checked={formData.stripe_mode === 'test'}
                                        onChange={() => setFormData({ ...formData, stripe_mode: 'test' })}
                                        className="text-emerald-500"
                                    />
                                    <span className="text-sm">Test Mode</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="stripe_mode"
                                        checked={formData.stripe_mode === 'live'}
                                        onChange={() => setFormData({ ...formData, stripe_mode: 'live' })}
                                        className="text-emerald-500"
                                    />
                                    <span className="text-sm">Live Mode</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="form-label block mb-1">Test Publishable Key</label>
                                    <input
                                        type="text"
                                        className="form-input w-full"
                                        value={formData.stripe_test_publishable_key}
                                        onChange={e => setFormData({ ...formData, stripe_test_publishable_key: e.target.value })}
                                        placeholder="pk_test_..."
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Test Secret Key</label>
                                    <SecretInput
                                        name="stripe_test_secret_key"
                                        value={formData.stripe_test_secret_key}
                                        placeholder="sk_test_..."
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Live Publishable Key</label>
                                    <input
                                        type="text"
                                        className="form-input w-full"
                                        value={formData.stripe_live_publishable_key}
                                        onChange={e => setFormData({ ...formData, stripe_live_publishable_key: e.target.value })}
                                        placeholder="pk_live_..."
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Live Secret Key</label>
                                    <SecretInput
                                        name="stripe_live_secret_key"
                                        value={formData.stripe_live_secret_key}
                                        placeholder="sk_live_..."
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Webhook Secret</label>
                                    <SecretInput
                                        name="stripe_webhook_secret"
                                        value={formData.stripe_webhook_secret}
                                        placeholder="whsec_..."
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Price ID</label>
                                    <input
                                        type="text"
                                        className="form-input w-full"
                                        value={formData.stripe_price_id}
                                        onChange={e => setFormData({ ...formData, stripe_price_id: e.target.value })}
                                        placeholder="price_..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PayPal Tab */}
                    {activeTab === 'paypal' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <h2 className="text-lg font-semibold">🅿️ PayPal Configuration</h2>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.paypal_enabled === 'true'}
                                        onChange={e => setFormData({ ...formData, paypal_enabled: e.target.checked ? 'true' : 'false' })}
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-emerald-500"
                                    />
                                    <span className="text-sm text-gray-300">Enable PayPal</span>
                                </label>
                            </div>

                            <div className="flex gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paypal_mode"
                                        checked={formData.paypal_mode === 'sandbox'}
                                        onChange={() => setFormData({ ...formData, paypal_mode: 'sandbox' })}
                                        className="text-emerald-500"
                                    />
                                    <span className="text-sm">Sandbox Mode</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paypal_mode"
                                        checked={formData.paypal_mode === 'live'}
                                        onChange={() => setFormData({ ...formData, paypal_mode: 'live' })}
                                        className="text-emerald-500"
                                    />
                                    <span className="text-sm">Live Mode</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="form-label block mb-1">Sandbox Client ID</label>
                                    <input
                                        type="text"
                                        className="form-input w-full"
                                        value={formData.paypal_sandbox_client_id}
                                        onChange={e => setFormData({ ...formData, paypal_sandbox_client_id: e.target.value })}
                                        placeholder="AYSq..."
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Sandbox Secret</label>
                                    <SecretInput
                                        name="paypal_sandbox_secret"
                                        value={formData.paypal_sandbox_secret}
                                        placeholder="EJT..."
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Live Client ID</label>
                                    <input
                                        type="text"
                                        className="form-input w-full"
                                        value={formData.paypal_live_client_id}
                                        onChange={e => setFormData({ ...formData, paypal_live_client_id: e.target.value })}
                                        placeholder="AYSq..."
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Live Secret</label>
                                    <SecretInput
                                        name="paypal_live_secret"
                                        value={formData.paypal_live_secret}
                                        placeholder="EJT..."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="form-label block mb-1">Subscription Plan ID</label>
                                    <input
                                        type="text"
                                        className="form-input w-full"
                                        value={formData.paypal_plan_id}
                                        onChange={e => setFormData({ ...formData, paypal_plan_id: e.target.value })}
                                        placeholder="P-..."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Create this in PayPal Dashboard → Products → Subscription Plans</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CMI Tab */}
                    {activeTab === 'cmi' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <h2 className="text-lg font-semibold">🇲🇦 CMI Configuration (Morocco)</h2>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.cmi_enabled === 'true'}
                                        onChange={e => setFormData({ ...formData, cmi_enabled: e.target.checked ? 'true' : 'false' })}
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-emerald-500"
                                    />
                                    <span className="text-sm text-gray-300">Enable CMI</span>
                                </label>
                            </div>

                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300 mb-4">
                                ℹ️ CMI (Centre Monétique Interbancaire) is Morocco&apos;s main payment processor. This payment method will only be shown to users in Morocco.
                            </div>

                            <div className="flex gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="cmi_mode"
                                        checked={formData.cmi_mode === 'test'}
                                        onChange={() => setFormData({ ...formData, cmi_mode: 'test' })}
                                        className="text-emerald-500"
                                    />
                                    <span className="text-sm">Test Mode</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="cmi_mode"
                                        checked={formData.cmi_mode === 'live'}
                                        onChange={() => setFormData({ ...formData, cmi_mode: 'live' })}
                                        className="text-emerald-500"
                                    />
                                    <span className="text-sm">Live Mode</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="form-label block mb-1">Merchant ID</label>
                                    <input
                                        type="text"
                                        className="form-input w-full"
                                        value={formData.cmi_merchant_id}
                                        onChange={e => setFormData({ ...formData, cmi_merchant_id: e.target.value })}
                                        placeholder="Your CMI merchant ID"
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Store Key</label>
                                    <SecretInput
                                        name="cmi_store_key"
                                        value={formData.cmi_store_key}
                                        placeholder="Your CMI store key"
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Success Callback URL</label>
                                    <input
                                        type="url"
                                        className="form-input w-full"
                                        value={formData.cmi_ok_url}
                                        onChange={e => setFormData({ ...formData, cmi_ok_url: e.target.value })}
                                        placeholder="https://yourapp.com/api/subscription/webhook/cmi"
                                    />
                                </div>
                                <div>
                                    <label className="form-label block mb-1">Failure Callback URL</label>
                                    <input
                                        type="url"
                                        className="form-input w-full"
                                        value={formData.cmi_fail_url}
                                        onChange={e => setFormData({ ...formData, cmi_fail_url: e.target.value })}
                                        placeholder="https://yourapp.com/subscription/failed"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-gray-800 flex justify-end">
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
