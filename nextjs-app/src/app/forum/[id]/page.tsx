'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Heart, MessageCircle, Paperclip, Camera, X, Send, Loader2, ArrowRight } from 'lucide-react';

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
    const t = useTranslations('forum');
    const tCommon = useTranslations('common');
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
        <div className="min-h-screen pb-24 relative bg-[var(--bg-primary)]">
            <div className="sticky top-0 z-20 backdrop-blur-md bg-[var(--bg-primary)]/80 border-b border-white/5 px-4 py-3 mb-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link href="/forum" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> {t('backToFeed')}
                    </Link>
                    <h2 className="text-sm font-semibold truncate max-w-[200px] opacity-70">{post.title}</h2>
                </div>
            </div>

            <div className="animate-fade-in px-4 lg:px-8 max-w-4xl mx-auto">
                {/* Main Post */}
                <div className="card mb-8 md:mb-10 overflow-hidden relative border-t border-white/10 shadow-2xl">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                        {/* Author Info */}
                        <div className="flex items-center gap-2 md:gap-3 flex-1">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 flex items-center justify-center text-white text-base md:text-lg font-bold shadow-lg">
                                {post.author_name[0]}
                            </div>
                            <div>
                                <div className="font-bold text-base md:text-lg text-white">{post.author_name}</div>
                                <div className="text-[10px] md:text-xs text-[var(--accent-primary)] font-medium bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded-full inline-block mt-0.5">Author</div>
                            </div>
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 text-right">
                            {new Date(post.created_at).toLocaleDateString()}
                            <br />
                            {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    <h1 className="text-2xl md:text-4xl font-extrabold mb-4 md:mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{post.title}</h1>

                    <div className="prose prose-invert max-w-none prose-base md:prose-lg text-gray-300 leading-relaxed mb-6 md:mb-8">
                        <p className="whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {post.image_url && (
                        <div className="rounded-xl md:rounded-2xl overflow-hidden mb-6 md:mb-8 shadow-xl bg-black/30">
                            <img
                                src={post.image_url}
                                alt="Post attachment"
                                className="w-full max-h-[300px] md:max-h-[500px] object-contain mx-auto"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-white/10">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-red-400 font-medium bg-red-400/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base">
                                <Heart size={16} className="fill-current" /> {post.likes} {t('likes')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <h3 className="text-lg md:text-xl font-bold">{t('discussion')}</h3>
                    <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-gray-400">{comments.length} {t('comments').toLowerCase()}</span>
                </div>

                <div className="space-y-4 md:space-y-6 mb-8">
                    {comments.map((comment, idx) => (
                        <div key={comment.id} className="group relative pl-2 md:pl-0">
                            {/* Thread connector line */}
                            {idx !== comments.length - 1 && (
                                <div className="absolute left-[34px] top-12 bottom-[-24px] w-px bg-gradient-to-b from-white/10 to-transparent md:block hidden"></div>
                            )}

                            <div className="flex gap-3 md:gap-4">
                                <div className="flex-shrink-0 hidden md:block">
                                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:border-[var(--accent-primary)] transition-colors">
                                        {comment.author_name[0]}
                                    </div>
                                </div>
                                <div className="flex-1 bg-[var(--bg-secondary)]/50 backdrop-blur-sm p-4 md:p-5 rounded-xl md:rounded-2xl border border-white/5 hover:bg-[var(--bg-secondary)] hover:border-white/10 transition-all shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-semibold text-sm text-[var(--accent-secondary)] flex items-center gap-2">
                                            {comment.author_name}
                                            {comment.author_name === post.author_name && (
                                                <span className="text-[10px] bg-[var(--accent-primary)] text-white px-1.5 py-0.5 rounded ml-1">OP</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] md:text-xs text-[var(--text-muted)]">{new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm leading-relaxed text-gray-300">{comment.content}</p>
                                    {comment.image_url && (
                                        <img
                                            src={comment.image_url}
                                            alt="Comment attachment"
                                            className="mt-4 rounded-lg max-h-48 object-contain border border-white/10"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {comments.length === 0 && (
                        <div className="text-center py-8 md:py-12 border-2 border-dashed border-white/5 rounded-2xl">
                            <div className="w-12 h-12 mx-auto mb-2 opacity-30 flex items-center justify-center">
                                <MessageCircle size={48} className="text-gray-600" />
                            </div>
                            <p className="text-gray-500">{t('noComments')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Comment Form */}
            <div className="fixed bottom-0 left-0 right-0 z-30 p-2 md:p-4 pointer-events-none pb-[env(safe-area-inset-bottom)]">
                <div className="max-w-4xl mx-auto pointer-events-auto">
                    <form
                        onSubmit={handlePostComment}
                        className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex items-end gap-2 transform transition-all focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/50 focus-within:bg-gray-900"
                    >
                        <div className="flex-1">
                            <input
                                className="w-full bg-transparent border-none text-white placeholder-gray-500 px-4 py-3 focus:ring-0 resize-none max-h-32"
                                placeholder={t('addComment')}
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                required
                            />
                            {replyImage && (
                                <div className="px-4 pb-2 flex items-center gap-2 text-xs text-[var(--accent-primary)]">
                                    <Paperclip size={12} /> <span>{t('imageAttached')}</span>
                                    <button type="button" onClick={() => setReplyImage(null)} className="hover:text-white"><X size={12} /></button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1 pr-2 pb-1.5">
                            <label className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition-colors" title="Add Image">
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={e => setReplyImage(e.target.files?.[0] || null)}
                                />
                                <Camera size={18} />
                            </label>
                            <button
                                type="submit"
                                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                                disabled={submitting || !replyContent}
                            >
                                {submitting ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Send size={18} />
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
