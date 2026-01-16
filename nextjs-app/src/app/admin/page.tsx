'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import {
    Settings, Users, Mail, Newspaper, Utensils, X, Search,
    CheckCircle2, AlertCircle, Trash2, Edit, Eye, Download,
    ChevronLeft, ChevronRight, Plus
} from 'lucide-react';

interface User {
    id: number;
    email: string;
    full_name: string;
    role: string;
    newsletter_subscribed: number;
    terms_accepted_at: string;
    created_at: string;
}

interface ContactSubmission {
    id: number;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: string;
    created_at: string;
}

interface Household {
    id: number;
    name: string;
    master_email: string;
    master_name: string;
    member_count: number;
    created_at: string;
}

interface Meal {
    id: number;
    title: string;
    description: string;
    category: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image_url: string;
    is_healthy: number;
    created_at: string;
}

type Tab = 'users' | 'contacts' | 'newsletter' | 'households' | 'meals';

export default function AdminPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('users');
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Data states
    const [users, setUsers] = useState<User[]>([]);
    const [contacts, setContacts] = useState<ContactSubmission[]>([]);
    const [households, setHouseholds] = useState<Household[]>([]);
    const [meals, setMeals] = useState<Meal[]>([]);

    // Modal states
    const [showCreateHousehold, setShowCreateHousehold] = useState(false);
    const [viewingContact, setViewingContact] = useState<ContactSubmission | null>(null);
    const [formData, setFormData] = useState({
        householdName: '',
        email: '',
        password: '',
        fullName: ''
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Meals specific states
    const [mealsPage, setMealsPage] = useState(1);
    const [mealsCategory, setMealsCategory] = useState('all');
    const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
    const [mealForm, setMealForm] = useState({
        title: '', description: '', category: 'other', calories: 0,
        protein: 0, carbs: 0, fat: 0, is_healthy: false
    });
    const MEALS_PER_PAGE = 10;

    useEffect(() => {
        if (!isUserLoading) {
            if (!user || user.role !== 'admin') {
                router.push('/');
                return;
            }
            loadData();
        }
    }, [user, isUserLoading, router, activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'users' || activeTab === 'newsletter') {
                const res = await fetch('/api/admin/users');
                if (res.ok) setUsers(await res.json());
            }
            if (activeTab === 'contacts') {
                const res = await fetch('/api/admin/contacts');
                if (res.ok) setContacts(await res.json());
            }
            if (activeTab === 'households') {
                const res = await fetch('/api/admin/households');
                if (res.ok) setHouseholds(await res.json());
            }
            if (activeTab === 'meals') {
                const res = await fetch('/api/admin/meals');
                if (res.ok) setMeals(await res.json());
            }
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateHousehold = async (e: React.FormEvent) => {
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
            if (!res.ok) throw new Error(data.error || 'Failed to create');
            setShowCreateHousehold(false);
            setFormData({ householdName: '', email: '', password: '', fullName: '' });
            loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkContactResolved = async (id: number) => {
        try {
            await fetch(`/api/admin/contacts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'resolved' })
            });
            loadData();
            setViewingContact(null);
        } catch (error) {
            console.error('Failed to update contact', error);
        }
    };

    const handleExportNewsletter = () => {
        const subscribers = users.filter(u => u.newsletter_subscribed === 1);
        const csv = 'Email,Name,Subscribed Date\n' +
            subscribers.map(u => `${u.email},"${u.full_name}",${u.created_at}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Meals filtering and pagination
    const filteredMeals = meals
        .filter(m => mealsCategory === 'all' || m.category === mealsCategory)
        .filter(m => m.title?.toLowerCase().includes(searchQuery.toLowerCase()));
    const totalMealsPages = Math.ceil(filteredMeals.length / MEALS_PER_PAGE);
    const paginatedMeals = filteredMeals.slice((mealsPage - 1) * MEALS_PER_PAGE, mealsPage * MEALS_PER_PAGE);
    const mealCategories = [...new Set(meals.map(m => m.category).filter(Boolean))];

    const handleEditMeal = (meal: Meal) => {
        setEditingMeal(meal);
        setMealForm({
            title: meal.title || '',
            description: meal.description || '',
            category: meal.category || 'other',
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
            is_healthy: meal.is_healthy === 1
        });
    };

    const handleSaveMeal = async () => {
        if (!editingMeal) return;
        setIsSubmitting(true);
        try {
            await fetch(`/api/admin/meals/${editingMeal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mealForm)
            });
            setEditingMeal(null);
            loadData();
        } catch (err) {
            console.error('Failed to save meal', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const newsletterSubscribers = users.filter(u => u.newsletter_subscribed === 1);

    if (isUserLoading) return <div className="p-8 text-center">Loading...</div>;

    const tabs = [
        { id: 'users' as Tab, label: 'Users', icon: Users, count: users.length },
        { id: 'contacts' as Tab, label: 'Contact Enquiries', icon: Mail, count: contacts.filter(c => c.status === 'new').length },
        { id: 'newsletter' as Tab, label: 'Newsletter', icon: Newspaper, count: newsletterSubscribers.length },
        { id: 'households' as Tab, label: 'Households', icon: Settings, count: households.length },
        { id: 'meals' as Tab, label: 'Meals', icon: Utensils, count: meals.length },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="page-title flex items-center gap-2">
                    Admin Dashboard <Settings size={24} className="text-violet-400" />
                </h1>
                <p className="page-subtitle">Manage users, contacts, newsletter, and system settings</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id
                            ? 'bg-violet-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-violet-500/30 text-violet-300'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="card">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : (
                    <>
                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div>
                                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                    <h3 className="font-semibold">All Users ({filteredUsers.length})</h3>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            className="pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-sm outline-none focus:border-violet-500"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/10 text-gray-400 text-sm">
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Role</th>
                                            <th className="p-4">Newsletter</th>
                                            <th className="p-4">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-4 font-medium">{u.full_name || 'N/A'}</td>
                                                <td className="p-4 text-gray-400">{u.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                                                        u.role === 'master' ? 'bg-violet-500/20 text-violet-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {u.newsletter_subscribed ? (
                                                        <CheckCircle2 size={18} className="text-emerald-400" />
                                                    ) : (
                                                        <X size={18} className="text-gray-500" />
                                                    )}
                                                </td>
                                                <td className="p-4 text-sm text-gray-400">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Contacts Tab */}
                        {activeTab === 'contacts' && (
                            <div>
                                <div className="p-4 border-b border-white/10">
                                    <h3 className="font-semibold">Contact Enquiries</h3>
                                </div>
                                {contacts.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">No contact submissions yet</div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/10 text-gray-400 text-sm">
                                                <th className="p-4">Status</th>
                                                <th className="p-4">From</th>
                                                <th className="p-4">Subject</th>
                                                <th className="p-4">Date</th>
                                                <th className="p-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contacts.map(c => (
                                                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="p-4">
                                                        {c.status === 'new' ? (
                                                            <span className="flex items-center gap-1 text-amber-400 text-sm">
                                                                <AlertCircle size={14} /> New
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-emerald-400 text-sm">
                                                                <CheckCircle2 size={14} /> Resolved
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium">{c.name}</div>
                                                        <div className="text-xs text-gray-400">{c.email}</div>
                                                    </td>
                                                    <td className="p-4 text-gray-300">{c.subject}</td>
                                                    <td className="p-4 text-sm text-gray-400">
                                                        {new Date(c.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => setViewingContact(c)}
                                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Newsletter Tab */}
                        {activeTab === 'newsletter' && (
                            <div>
                                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                    <h3 className="font-semibold">Newsletter Subscribers ({newsletterSubscribers.length})</h3>
                                    <button
                                        onClick={handleExportNewsletter}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm transition-colors"
                                    >
                                        <Download size={16} /> Export CSV
                                    </button>
                                </div>
                                {newsletterSubscribers.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">No newsletter subscribers yet</div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/10 text-gray-400 text-sm">
                                                <th className="p-4">Name</th>
                                                <th className="p-4">Email</th>
                                                <th className="p-4">Subscribed Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {newsletterSubscribers.map(u => (
                                                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="p-4 font-medium">{u.full_name || 'N/A'}</td>
                                                    <td className="p-4 text-gray-400">{u.email}</td>
                                                    <td className="p-4 text-sm text-gray-400">
                                                        {new Date(u.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Households Tab */}
                        {activeTab === 'households' && (
                            <div>
                                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                    <h3 className="font-semibold">Households ({households.length})</h3>
                                    <button
                                        onClick={() => setShowCreateHousehold(true)}
                                        className="btn-primary text-sm"
                                    >
                                        + Create Master Account
                                    </button>
                                </div>
                                {households.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">No households found</div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/10 text-gray-400 text-sm">
                                                <th className="p-4">Household</th>
                                                <th className="p-4">Master User</th>
                                                <th className="p-4">Members</th>
                                                <th className="p-4">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {households.map(h => (
                                                <tr key={h.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="p-4 font-medium">{h.name}</td>
                                                    <td className="p-4">
                                                        <div>{h.master_name}</div>
                                                        <div className="text-xs text-gray-400">{h.master_email}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="bg-violet-500/20 text-violet-300 px-2 py-1 rounded text-xs">
                                                            {h.member_count}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-400">
                                                        {new Date(h.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Meals Tab */}
                        {activeTab === 'meals' && (
                            <div>
                                <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
                                    <h3 className="font-semibold">Meals / Recipes ({filteredMeals.length})</h3>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <select
                                            value={mealsCategory}
                                            onChange={(e) => { setMealsCategory(e.target.value); setMealsPage(1); }}
                                            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500"
                                        >
                                            <option value="all">All Categories</option>
                                            {mealCategories.map(cat => (
                                                <option key={cat} value={cat} className="capitalize">{cat}</option>
                                            ))}
                                        </select>
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search meals..."
                                                className="pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-sm outline-none focus:border-cyan-500"
                                                value={searchQuery}
                                                onChange={(e) => { setSearchQuery(e.target.value); setMealsPage(1); }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {paginatedMeals.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">No meals found</div>
                                ) : (
                                    <>
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/10 text-gray-400 text-sm">
                                                    <th className="p-4">Title</th>
                                                    <th className="p-4">Category</th>
                                                    <th className="p-4">Calories</th>
                                                    <th className="p-4">Macros (P/C/F)</th>
                                                    <th className="p-4">Healthy</th>
                                                    <th className="p-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedMeals.map(m => (
                                                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="p-4 font-medium max-w-[200px] truncate">{m.title || 'Untitled'}</td>
                                                        <td className="p-4 text-gray-400 capitalize">{m.category || 'other'}</td>
                                                        <td className="p-4">
                                                            <span className="text-cyan-400">{m.calories || 0}</span>
                                                            <span className="text-gray-500 text-xs ml-1">kcal</span>
                                                        </td>
                                                        <td className="p-4 text-sm">
                                                            <span className="text-red-400">{m.protein || 0}g</span>
                                                            {' / '}
                                                            <span className="text-yellow-400">{m.carbs || 0}g</span>
                                                            {' / '}
                                                            <span className="text-orange-400">{m.fat || 0}g</span>
                                                        </td>
                                                        <td className="p-4">
                                                            {m.is_healthy ? (
                                                                <CheckCircle2 size={18} className="text-emerald-400" />
                                                            ) : (
                                                                <X size={18} className="text-gray-500" />
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => handleEditMeal(m)}
                                                                    className="p-2 hover:bg-violet-500/20 text-violet-400 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm('Delete this meal?')) {
                                                                            await fetch(`/api/admin/meals/${m.id}`, { method: 'DELETE' });
                                                                            loadData();
                                                                        }
                                                                    }}
                                                                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {/* Pagination */}
                                        {totalMealsPages > 1 && (
                                            <div className="p-4 border-t border-white/10 flex items-center justify-between">
                                                <div className="text-sm text-gray-400">
                                                    Page {mealsPage} of {totalMealsPages} ({filteredMeals.length} total)
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setMealsPage(p => Math.max(1, p - 1))}
                                                        disabled={mealsPage === 1}
                                                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronLeft size={18} />
                                                    </button>
                                                    {Array.from({ length: Math.min(5, totalMealsPages) }, (_, i) => {
                                                        const page = mealsPage <= 3 ? i + 1 : mealsPage - 2 + i;
                                                        if (page > totalMealsPages) return null;
                                                        return (
                                                            <button
                                                                key={page}
                                                                onClick={() => setMealsPage(page)}
                                                                className={`w-8 h-8 rounded-lg text-sm ${mealsPage === page ? 'bg-violet-600 text-white' : 'hover:bg-white/10'}`}
                                                            >
                                                                {page}
                                                            </button>
                                                        );
                                                    })}
                                                    <button
                                                        onClick={() => setMealsPage(p => Math.min(totalMealsPages, p + 1))}
                                                        disabled={mealsPage === totalMealsPages}
                                                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* View Contact Modal */}
            {viewingContact && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-lg animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Contact Details</h2>
                            <button onClick={() => setViewingContact(null)} className="text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-gray-400 mb-1">From</div>
                                <div className="font-medium">{viewingContact.name}</div>
                                <div className="text-sm text-gray-400">{viewingContact.email}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Subject</div>
                                <div className="font-medium capitalize">{viewingContact.subject}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Message</div>
                                <div className="bg-black/30 p-4 rounded-lg text-gray-300 whitespace-pre-wrap">
                                    {viewingContact.message}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Received</div>
                                <div className="text-sm">{new Date(viewingContact.created_at).toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setViewingContact(null)}
                                className="px-4 py-2 rounded-lg hover:bg-white/10"
                            >
                                Close
                            </button>
                            {viewingContact.status === 'new' && (
                                <button
                                    onClick={() => handleMarkContactResolved(viewingContact.id)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2"
                                >
                                    <CheckCircle2 size={16} /> Mark Resolved
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Household Modal */}
            {showCreateHousehold && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-lg animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Create Master Account</h2>
                            <button onClick={() => setShowCreateHousehold(false)} className="text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleCreateHousehold} className="space-y-4">
                            <div>
                                <label className="form-label">Household Name</label>
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
                                <button type="button" onClick={() => setShowCreateHousehold(false)} className="px-4 py-2 rounded-lg hover:bg-white/10">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Meal Modal */}
            {editingMeal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Edit Meal</h2>
                            <button onClick={() => setEditingMeal(null)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Title</label>
                                <input
                                    type="text"
                                    className="form-input w-full"
                                    value={mealForm.title}
                                    onChange={e => setMealForm({ ...mealForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input w-full h-20"
                                    value={mealForm.description}
                                    onChange={e => setMealForm({ ...mealForm, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Category</label>
                                    <select
                                        className="form-input w-full"
                                        value={mealForm.category}
                                        onChange={e => setMealForm({ ...mealForm, category: e.target.value })}
                                    >
                                        <option value="breakfast">Breakfast</option>
                                        <option value="lunch">Lunch</option>
                                        <option value="dinner">Dinner</option>
                                        <option value="snack">Snack</option>
                                        <option value="dessert">Dessert</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Calories</label>
                                    <input
                                        type="number"
                                        className="form-input w-full"
                                        value={mealForm.calories}
                                        onChange={e => setMealForm({ ...mealForm, calories: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="form-label">Protein (g)</label>
                                    <input
                                        type="number"
                                        className="form-input w-full"
                                        value={mealForm.protein}
                                        onChange={e => setMealForm({ ...mealForm, protein: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Carbs (g)</label>
                                    <input
                                        type="number"
                                        className="form-input w-full"
                                        value={mealForm.carbs}
                                        onChange={e => setMealForm({ ...mealForm, carbs: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Fat (g)</label>
                                    <input
                                        type="number"
                                        className="form-input w-full"
                                        value={mealForm.fat}
                                        onChange={e => setMealForm({ ...mealForm, fat: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="is_healthy"
                                    checked={mealForm.is_healthy}
                                    onChange={e => setMealForm({ ...mealForm, is_healthy: e.target.checked })}
                                    className="w-4 h-4 rounded"
                                />
                                <label htmlFor="is_healthy" className="text-sm">Mark as Healthy</label>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setEditingMeal(null)} className="px-4 py-2 rounded-lg hover:bg-white/10">
                                    Cancel
                                </button>
                                <button onClick={handleSaveMeal} className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
