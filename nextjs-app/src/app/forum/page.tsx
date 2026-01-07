'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import Link from 'next/link';

interface Post {
    id: number;
    title: string;
    content: string;
    author_name: string;
    created_at: string;
    likes: number;
    comment_count: number;
    image_url: string | null;
}

export default function CommunityPage() {
    const { user } = useUser();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New Post State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/forum');
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

            // Upload image if selected
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (uploadData.url) {
                    imageUrl = uploadData.url;
                }
            }

            // Create Post
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
                fetchPosts(); // Refresh
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

    return (
        <div className="animate-fade-in p-4 lg:p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="page-title">Community Forum 💬</h1>
                    <p className="page-subtitle">Discuss tips, recipes, and progress with others.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    + New Post
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading discussions...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {posts.map(post => (
                        <Link href={`/forum/${post.id}`} key={post.id} className="card hover:border-[var(--accent-primary)] transition-colors">
                            {post.image_url && (
                                <div className="h-40 rounded-lg mb-4 bg-cover bg-center" style={{ backgroundImage: `url(${post.image_url})` }} />
                            )}
                            <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">
                                {post.content}
                            </p>
                            <div className="flex justify-between items-center text-xs text-[var(--text-muted)] border-t border-gray-800 pt-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[var(--accent-secondary)]">{post.author_name}</span>
                                    <span>•</span>
                                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span>❤️ {post.likes}</span>
                                    <span>💬 {post.comment_count}</span>
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
                                    placeholder="e.g., My transformation result!"
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Content</label>
                                <textarea
                                    className="form-input w-full h-32"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Share your thoughts..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Add Image (Optional)</label>
                                <input
                                    type="file"
                                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                                    accept="image/*"
                                    className="block w-full text-sm text-gray-400
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-violet-500/10 file:text-violet-400
                                      hover:file:bg-violet-500/20"
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
