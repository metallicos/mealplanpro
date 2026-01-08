'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import Link from 'next/link';

interface Post {
    id: number;
    title: string;
    content: string;
    author_name: string;
    author_avatar?: string;
    created_at: string;
    likes: number;
    comment_count: number;
    image_url: string | null;
    user_id: number;
}

export default function CommunityPage() {
    const { user } = useUser();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'latest' | 'top'>('latest');

    // New Post State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPosts();
        }, 300); // Debounce search
        return () => clearTimeout(timer);
    }, [searchQuery, sortBy]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('q', searchQuery);
            if (sortBy) params.append('sort', sortBy);

            const res = await fetch(`/api/forum?${params.toString()}`);
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let imageUrl = null;
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                if (uploadData.url) imageUrl = uploadData.url;
            }

            const res = await fetch('/api/forum', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, image_url: imageUrl })
            });

            if (res.ok) {
                setShowModal(false);
                setTitle('');
                setContent('');
                setImageFile(null);
                fetchPosts();
            } else {
                alert('Failed to create post');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating post');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleLike = async (e: React.MouseEvent, postId: number) => {
        e.preventDefault(); // Prevent navigation
        if (!user) return alert('Please login to like');

        // Optimistic update
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return { ...p, likes: p.likes + 1 }; // Simplified, ideally we check if liked
            }
            return p;
        }));

        try {
            const res = await fetch('/api/forum/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId })
            });
            const data = await res.json();
            if (data.likes !== undefined) {
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: data.likes } : p));
            }
        } catch (err) {
            console.error(err);
            fetchPosts(); // Revert on error
        }
    };

    const sharePost = async (e: React.MouseEvent, post: Post) => {
        e.preventDefault();
        const url = `${window.location.origin}/forum/${post.id}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: post.title, text: post.content, url });
            } catch (err) { console.error(err); }
        } else {
            navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
        }
    };

    // Render hashtags as links
    const renderContent = (text: string) => {
        const parts = text.split(/(#\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('#')) {
                const tag = part.slice(1);
                return (
                    <span
                        key={i}
                        className="text-[var(--accent-primary)] font-medium hover:underline cursor-pointer"
                        onClick={(e) => {
                            e.preventDefault();
                            setSearchQuery(tag);
                        }}
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Section */}
            <div className="relative py-8 md:py-12 px-4 lg:px-8 mb-6 md:mb-8 overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-gray-900 to-black pointer-events-none"></div>
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-3 md:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500 animate-fade-in-up">
                        Community Hub 💬
                    </h1>
                    <p className="text-base md:text-lg text-gray-400 mb-6 md:mb-8 max-w-2xl mx-auto animate-fade-in-up delay-100">
                        Connect with others, share your meal prep wins, and find inspiration for your next healthy dish.
                    </p>

                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary transform hover:scale-105 transition-all shadow-lg shadow-indigo-500/20 px-6 py-2.5 md:px-8 md:py-3 text-base md:text-lg animate-fade-in-up delay-200"
                    >
                        ✨ Share Your Story
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 md:px-4 lg:px-8">
                {/* Search & Filter Bar - Floating Glass */}
                <div className="sticky top-16 md:top-20 z-30 mb-6 md:mb-8 mx-auto max-w-3xl">
                    <div className="backdrop-blur-xl bg-gray-900/60 border border-white/10 rounded-2xl p-1.5 md:p-2 flex flex-col md:flex-row gap-2 shadow-xl md:shadow-2xl transition-all hover:border-white/20 hover:bg-gray-900/70">
                        <div className="relative flex-1">
                            <span className="absolute left-3 md:left-4 top-3 md:top-3 text-gray-400">🔍</span>
                            <input
                                className="w-full bg-transparent border-none text-white placeholder-gray-500 pl-10 md:pl-12 pr-4 py-2.5 focus:ring-0 text-sm md:text-base"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="h-px md:h-auto md:w-px bg-white/10 mx-2"></div>
                        <select
                            className="bg-transparent border-none text-sm text-gray-300 focus:ring-0 cursor-pointer hover:text-white px-2 md:px-4 py-2"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'latest' | 'top')}
                        >
                            <option value="latest" className="bg-gray-900">⏱️ Latest</option>
                            <option value="top" className="bg-gray-900">🔥 Top Liked</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="card h-64 animate-pulse bg-gray-800/50 border-transparent"></div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <div className="text-6xl mb-4 opacity-50">📭</div>
                        <p className="text-xl">No posts found yet.</p>
                        <p className="text-sm">Be the first to start a conversation!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                        {posts.map(post => (
                            <Link href={`/forum/${post.id}`} key={post.id} className="group card hover:border-[var(--accent-primary)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full bg-gradient-to-br from-[var(--bg-card)] to-[rgba(30,30,40,0.4)]">
                                {/* Author Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    {post.author_avatar ? (
                                        <img src={post.author_avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--bg-primary)] group-hover:ring-[var(--accent-primary)] transition-all" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                                            {post.author_name[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-200 truncate group-hover:text-white transition-colors">{post.author_name}</div>
                                        <div className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className="font-bold text-xl mb-2 text-white group-hover:text-[var(--accent-primary)] transition-colors line-clamp-2">{post.title}</h3>
                                    <p className="text-gray-400 text-sm line-clamp-3 mb-4 leading-relaxed group-hover:text-gray-300 transition-colors">
                                        {renderContent(post.content)}
                                    </p>
                                </div>

                                {/* Link Preview / Image */}
                                {post.image_url && (
                                    <div className="h-48 rounded-xl mb-4 bg-cover bg-center relative overflow-hidden shadow-lg group-hover:shadow-indigo-500/10 transition-all">
                                        <img src={post.image_url} alt="Post image" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
                                    <button
                                        onClick={(e) => toggleLike(e, post.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 transition-all group/like"
                                    >
                                        <span className="transform group-hover/like:scale-125 transition-transform duration-300">❤️</span>
                                        <span className="font-medium text-gray-400 group-hover/like:text-red-400 transition-colors">{post.likes}</span>
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white/5 rounded-full">
                                            💬 {post.comment_count}
                                        </span>
                                        <button
                                            onClick={(e) => sharePost(e, post)}
                                            className="p-1.5 text-gray-500 hover:text-white transition-colors"
                                        >
                                            📤
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Post Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <div className="card w-full max-w-lg relative animate-fade-in shadow-2xl shadow-indigo-500/10 border-indigo-500/20 transform transition-all scale-100 flex flex-col max-h-[90vh]">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full p-1">✕</button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Create Post</h2>
                            <p className="text-sm text-gray-500">Share your thoughts with the community</p>
                        </div>

                        <form onSubmit={handleCreatePost} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="group">
                                <label className="form-label group-focus-within:text-[var(--accent-primary)] transition-colors">Title</label>
                                <input
                                    className="form-input bg-black/20 border-white/10 focus:bg-black/40"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Give your post a catchy title..."
                                    required
                                />
                            </div>
                            <div className="group">
                                <label className="form-label group-focus-within:text-[var(--accent-primary)] transition-colors">Content</label>
                                <textarea
                                    className="form-input bg-black/20 border-white/10 h-32 resize-none focus:bg-black/40"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="What's on your mind?"
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Add Image</label>
                                <div className="relative group cursor-pointer">
                                    <input
                                        type="file"
                                        onChange={e => setImageFile(e.target.files?.[0] || null)}
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center group-hover:border-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)]/5 transition-all">
                                        {imageFile ? (
                                            <span className="text-[var(--accent-primary)] font-medium flex items-center justify-center gap-2">
                                                ✅ {imageFile.name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500 group-hover:text-gray-300">
                                                📷 Click to upload an image
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button disabled={submitting} type="submit" className="btn-primary w-full py-3 text-lg font-bold shadow-lg shadow-indigo-500/25">
                                    {submitting ? 'Posting...' : '🚀 Post to Community'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
