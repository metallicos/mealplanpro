'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import Link from 'next/link';

interface Comment {
    id: number;
    content: string;
    author_name: string;
    created_at: string;
    image_url: string | null;
}

interface PostDetails {
    id: number;
    title: string;
    content: string;
    author_name: string;
    created_at: string;
    likes: number;
    image_url: string | null;
}

export default function ThreadPage() {
    const { id } = useParams();
    const router = useRouter();
    const [post, setPost] = useState<PostDetails | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    // Comment Form
    const [replyContent, setReplyContent] = useState('');
    const [replyImage, setReplyImage] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (id) fetchThread();
    }, [id]);

    const fetchThread = async () => {
        try {
            const res = await fetch(`/api/forum/${id}`);
            if (!res.ok) {
                if (res.status === 404) router.push('/forum');
                return;
            }
            const data = await res.json();
            setPost(data.post);
            setComments(data.comments || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePostComment = async (e: React.FormEvent) => {
        // ... (unchanged)
        e.preventDefault();
        setSubmitting(true);

        try {
            let imageUrl = null;
            if (replyImage) {
                const formData = new FormData();
                formData.append('file', replyImage);
                const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
                const upData = await upRes.json();
                if (upData.url) imageUrl = upData.url;
            }

            const res = await fetch(`/api/forum/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: replyContent, image_url: imageUrl })
            });

            if (res.ok) {
                setReplyContent('');
                setReplyImage(null);
                fetchThread(); // Refresh
            }
        } catch (err) {
            console.error(err);
            alert('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-12">Loading thread...</div>;
    if (!post) return null;

    return (
        <div className="animate-fade-in p-4 lg:p-8 max-w-4xl mx-auto">
            <Link href="/forum" className="text-sm text-[var(--text-secondary)] hover:text-white mb-4 inline-block">
                ← Back to Forum
            </Link>

            {/* Main Post */}
            <div className="card mb-8">
                <div className="flex justify-between items-start mb-4">
                    <h1 className="text-2xl font-bold">{post.title}</h1>
                    <div className="text-sm bg-gray-800 px-3 py-1 rounded-full">
                        {post.likes} Likes
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-[var(--accent-secondary)] mb-6 border-b border-gray-800 pb-4">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold">
                        {post.author_name[0]}
                    </div>
                    <span className="font-semibold">{post.author_name}</span>
                    <span className="text-[var(--text-muted)]">• {new Date(post.created_at).toLocaleString()}</span>
                </div>

                <div className="prose prose-invert max-w-none text-[var(--text-primary)]">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                </div>

                {post.image_url && (
                    <div className="mt-6">
                        <img
                            src={post.image_url}
                            alt="Post attachment"
                            className="rounded-lg max-h-96 w-full object-contain bg-gray-900/50 p-2"
                        />
                    </div>
                )}
            </div>

            {/* Comments Section */}
            <h3 className="text-xl font-bold mb-4">Comments ({comments.length})</h3>

            <div className="space-y-4 mb-8">
                {comments.map(comment => (
                    <div key={comment.id} className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm text-[var(--accent-secondary)]">{comment.author_name}</span>
                            <span className="text-xs text-[var(--text-muted)]">{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                        {comment.image_url && (
                            <img
                                src={comment.image_url}
                                alt="Comment attachment"
                                className="mt-3 rounded-lg max-h-48 object-contain"
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Add Comment Form */}
            <div className="card sticky bottom-4 shadow-2xl border-t border-[var(--accent-primary)] bg-[var(--bg-card)]">
                <form onSubmit={handlePostComment}>
                    <div className="mb-2">
                        <textarea
                            className="form-input w-full min-h-[80px]"
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <label className="cursor-pointer text-gray-400 hover:text-white transition-colors">
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={e => setReplyImage(e.target.files?.[0] || null)}
                                />
                                📷 {replyImage ? 'Image selected' : 'Add Image'}
                            </label>
                            {replyImage && (
                                <button
                                    type="button"
                                    onClick={() => setReplyImage(null)}
                                    className="text-xs text-red-400"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={submitting}
                        >
                            {submitting ? 'Posting...' : 'Reply'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
