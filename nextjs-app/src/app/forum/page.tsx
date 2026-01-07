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
                        className="text-blue-400 hover:underline cursor-pointer"
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
        <div className="animate-fade-in p-4 lg:p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="page-title">Community Feed 💬</h1>
                    <p className="page-subtitle">Connect, share, and inspire.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary w-full md:w-auto">
                    + New Post
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="card mb-6 p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <span className="absolute left-3 top-2.5 text-gray-500">🔍</span>
                    <input
                        className="form-input pl-10 w-full"
                        placeholder="Search posts or #hashtags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="form-input md:w-48"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'latest' | 'top')}
                >
                    <option value="latest">⏱️ Latest</option>
                    <option value="top">🔥 Top Liked</option>
                </select>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading feed...</div>
            ) : posts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No posts found. Be the first to share!</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {posts.map(post => (
                        <Link href={`/forum/${post.id}`} key={post.id} className="card hover:border-[var(--accent-primary)] transition-all group">
                            {post.image_url && (
                                <div className="h-48 rounded-lg mb-4 bg-cover bg-center relative" style={{ backgroundImage: `url(${post.image_url})` }}>

                                </div>
                            )}
                            <div className="flex items-center gap-2 mb-3">
                                {post.author_avatar ? (
                                    <img src={post.author_avatar} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white text-xs font-bold">
                                        {post.author_name[0]}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="font-semibold text-sm">{post.author_name}</div>
                                    <div className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg mb-2 group-hover:text-[var(--accent-primary)] transition-colors">{post.title}</h3>
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-3 mb-4">
                                {renderContent(post.content)}
                            </p>

                            <div className="flex justify-between items-center text-xs text-[var(--text-muted)] border-t border-gray-800 pt-3">
                                <button
                                    onClick={(e) => toggleLike(e, post.id)}
                                    className="flex items-center gap-1 hover:text-red-400 transition-colors p-1"
                                >
                                    <span>❤️</span> {post.likes}
                                </button>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        💬 {post.comment_count}
                                    </span>
                                    <button
                                        onClick={(e) => sharePost(e, post)}
                                        className="hover:text-blue-400 transition-colors p-1"
                                    >
                                        📤 Share
                                    </button>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Post Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-lg relative animate-fade-in">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
                        <h2 className="text-xl font-bold mb-4">Create New Post</h2>
                        <form onSubmit={handleCreatePost} className="space-y-4">
                            <div>
                                <label className="form-label">Title</label>
                                <input
                                    className="form-input w-full"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g., My transformation result! #fitness"
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Content</label>
                                <textarea
                                    className="form-input w-full h-32"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Share your thoughts... Use #hashtags!"
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Add Image (Optional)</label>
                                <input
                                    type="file"
                                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                                    accept="image/*"
                                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-500/10 file:text-violet-400 hover:file:bg-violet-500/20"
                                />
                            </div>
                            <button disabled={submitting} type="submit" className="btn-primary w-full">
                                {submitting ? 'Posting...' : 'Post to Community'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
