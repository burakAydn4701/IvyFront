'use client';
import { useEffect, useState, use } from 'react';
import { api } from '@/app/lib/api';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, ArrowUp, Reply, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  title: string;
  content: string;
  user_id: string;
  community_id: string;
  community_name?: string;
  created_at: string;
  image_url?: string;
  upvotes_count: number;
  comments_count: number;
  upvoted_by_current_user?: boolean;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
  parent_id?: string | null;
  created_at: string;
  user_name?: string;
  upvotes_count?: number;
  upvoted_by_current_user?: boolean;
  replies_count?: number;
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  
  const currentUserId = '1';
  const router = useRouter();

  const fetchComments = async () => {
    try {
      const allComments = await api.getPostComments(id);
      // Filter to only show top-level comments (those without a parent)
      const topLevelComments = allComments.filter((comment: Comment) => !comment.parent_id);
      setComments(topLevelComments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  useEffect(() => {
    const fetchPostData = async () => {
      try {
        const postData = await api.getPost(id);
        setPost(postData);
        await fetchComments();
      } catch (error) {
        console.error('Failed to fetch post data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostData();
  }, [id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !post) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await api.createComment({
        content: commentText,
        post_id: id,
        user_id: currentUserId,
      });
      
      setCommentText('');
      await fetchComments();
      
      if (post) {
        setPost({
          ...post,
          comments_count: post.comments_count + 1
        });
      }
    } catch (error) {
      console.error('Failed to create comment:', error);
      setError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async () => {
    if (!post || isUpvoting) return;
    
    setIsUpvoting(true);
    try {
      const isCurrentlyUpvoted = post.upvoted_by_current_user || false;
      
      await api.togglePostUpvote(id, currentUserId, isCurrentlyUpvoted);
      
      setPost({
        ...post,
        upvoted_by_current_user: !isCurrentlyUpvoted,
        upvotes_count: isCurrentlyUpvoted 
          ? Math.max(0, post.upvotes_count - 1) 
          : post.upvotes_count + 1
      });
    } catch (error) {
      console.error('Failed to update upvote:', error);
    } finally {
      setIsUpvoting(false);
    }
  };

  // Visual-only comment upvote
  const handleCommentUpvote = (commentId: string) => {
    console.log('Upvote comment:', commentId);
    setComments(comments.map(c => 
      c.id === commentId 
        ? {
            ...c, 
            upvoted_by_current_user: !(c.upvoted_by_current_user || false), 
            upvotes_count: (c.upvoted_by_current_user || false)
              ? Math.max(0, (c.upvotes_count || 0) - 1) 
              : (c.upvotes_count || 0) + 1
          } 
        : c
    ));
  };

  // Toggle reply form
  const handleReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyText('');
  };

  // Submit reply as a new comment
  const submitReply = async (commentId: string) => {
    if (!replyText.trim() || isSubmittingReply) return;
    
    setIsSubmittingReply(true);
    
    try {
      await api.createReply({
        content: replyText,
        user_id: currentUserId,
        parent_id: commentId
      });
      
      // After creating a reply, navigate to the comment page to see it
      router.push(`/comments/${commentId}`);
    } catch (error) {
      console.error('Failed to post reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const navigateToComment = (commentId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on upvote or reply buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    router.push(`/comments/${commentId}`);
  };

  // Add delete comment handler
  const handleDeleteComment = async (commentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }
    
    setIsDeletingComment(commentId);
    
    try {
      await api.deleteComment(commentId);
      // Remove the deleted comment from the state
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setIsDeletingComment(null);
    }
  };

  // Add delete post handler
  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    setIsDeletingPost(true);
    
    try {
      if (!post) return;
      await api.deletePost(post.id);
      // Navigate back to the community page or home page
      router.push('/');
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post. Please try again.');
      setIsDeletingPost(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 ml-64 mt-16">Loading post...</div>;
  }

  if (!post) {
    return <div className="p-4 ml-64 mt-16">Post not found</div>;
  }

  return (
    <main className="p-4 ml-64 mt-16">
      <div className="max-w-4xl mx-auto">
        {/* Post Header with Delete Button */}
        <div className="flex justify-between items-center mb-6">
          <Link 
            href="/"
            className="inline-flex items-center text-green-600 hover:text-green-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
          
          <button 
            onClick={handleDeletePost}
            disabled={isDeletingPost}
            className="flex items-center text-sm text-red-600 hover:text-red-700 px-3 py-1 border border-red-600 rounded-lg"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            <span>{isDeletingPost ? 'Deleting...' : 'Delete Post'}</span>
          </button>
        </div>

        <div className="mb-6">
          <Link 
            href={`/communities/${post.community_id}`}
            className="inline-flex items-center text-green-600 hover:text-green-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to {post.community_name || 'Community'}
          </Link>
        </div>

        {/* Post Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
          
          {post.image_url && (
            <div className="mb-4">
              <img 
                src={post.image_url} 
                alt={post.title}
                className="rounded-lg max-h-96 object-cover"
              />
            </div>
          )}
          
          <p className="text-gray-900 mb-4">{post.content}</p>
          
          <div className="flex items-center text-sm text-gray-900">
            <button 
              onClick={handleUpvote}
              disabled={isUpvoting}
              className={`flex items-center mr-4 px-2 py-1 rounded-md ${
                post.upvoted_by_current_user 
                  ? 'bg-green-100 text-green-700' 
                  : 'hover:bg-gray-100'
              }`}
            >
              <ArrowUp className={`w-4 h-4 mr-1 ${
                post.upvoted_by_current_user ? 'text-green-700' : ''
              }`} />
              <span>{post.upvotes_count || 0} upvotes</span>
            </button>
            <div className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-1" />
              <span>{post.comments_count || 0} comments</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Comments</h2>
          
          {/* Comment Form */}
          <form onSubmit={handleSubmitComment} className="mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px] text-gray-900"
              required
              disabled={isSubmitting}
            />
            {error && <p className="text-red-500 mt-1">{error}</p>}
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
          
          {/* Comments List with reply counts */}
          {comments.length === 0 ? (
            <p className="text-gray-900">No comments yet. Be the first to comment!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="border-b pb-4 last:border-0 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
                  onClick={(e) => navigateToComment(comment.id, e)}
                >
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-gray-900">{comment.user_name || 'User'}</span>
                    <span className="text-sm text-gray-600">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-900">{comment.content}</p>
                  
                  <div className="flex items-center mt-2 space-x-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCommentUpvote(comment.id);
                      }}
                      className={`flex items-center text-sm ${
                        comment.upvoted_by_current_user 
                          ? 'text-green-600' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ArrowUp className="w-3 h-3 mr-1" />
                      <span>{comment.upvotes_count || 0} upvotes</span>
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReply(comment.id);
                      }}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                    >
                      <Reply className="w-3 h-3 mr-1" />
                      <span>Reply</span>
                    </button>
                    
                    {/* Reply count indicator */}
                    {(comment.replies_count && comment.replies_count > 0) && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        <span>{comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}</span>
                      </div>
                    )}
                    
                    {/* Delete button */}
                    <button 
                      onClick={(e) => handleDeleteComment(comment.id, e)}
                      disabled={isDeletingComment === comment.id}
                      className="flex items-center text-sm text-red-600 hover:text-red-700 ml-auto"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      <span>{isDeletingComment === comment.id ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                  
                  {/* Reply form - shown when replying to this comment */}
                  {replyingTo === comment.id && (
                    <div 
                      className="mt-3 pl-4 border-l-2 border-gray-200"
                      onClick={(e) => e.stopPropagation()} // Prevent navigation when interacting with the form
                    >
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${comment.user_name || 'User'}...`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px] text-gray-900"
                      />
                      <div className="flex justify-end mt-2 space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo(null);
                          }}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            submitReply(comment.id);
                          }}
                          disabled={!replyText.trim() || isSubmittingReply}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {isSubmittingReply ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 