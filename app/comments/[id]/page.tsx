'use client';
import { useEffect, useState, use } from 'react';
import { api } from  "../../lib/api"
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, ArrowUp, Reply, Trash2 } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
  created_at: string;
  user_name?: string;
  upvotes_count?: number;
  upvoted_by_current_user?: boolean;
  replies?: Comment[];
  replies_count?: number;
  parent_id?: string;
}

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
}

export default function CommentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [comment, setComment] = useState<Comment | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [parentComment, setParentComment] = useState<Comment | null>(null);
  const [rootComment, setRootComment] = useState<Comment | null>(null);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);
  
  const currentUserId = '1';

  useEffect(() => {
    const fetchCommentData = async () => {
      try {
        // Fetch the comment with its replies
        const commentData = await api.getComment(id);
        setComment(commentData);
        
        // Set replies from the comment data
        if (commentData.replies) {
          setReplies(commentData.replies);
        }
        
        // Fetch the post
        if (commentData.post_id) {
          const postData = await api.getPost(commentData.post_id);
          setPost(postData);
        }
        
        // If this is a reply, fetch the parent comment
        if (commentData.parent_id) {
          try {
            const parentData = await api.getComment(commentData.parent_id);
            setParentComment(parentData);
            
            // If the parent also has a parent, fetch the root comment
            if (parentData.parent_id) {
              try {
                const rootData = await api.getComment(parentData.parent_id);
                setRootComment(rootData);
              } catch (error) {
                console.warn('Could not fetch root comment:', error);
              }
            }
          } catch (error) {
            console.warn('Could not fetch parent comment:', error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch comment data:', error);
        setApiError('Failed to load comment.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommentData();
  }, [id]);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !comment) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await api.createReply({
        content: replyText,
        user_id: currentUserId,
        parent_id: comment.id
      });
      
      // Refresh the comment to get the new replies
      const updatedComment = await api.getComment(comment.id);
      setComment(updatedComment);
      if (updatedComment.replies) {
        setReplies(updatedComment.replies);
      }
      
      // Clear input
      setReplyText('');
    } catch (error) {
      console.error('Failed to post reply:', error);
      setError('Failed to post reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentUpvote = (commentId: string) => {
    // Visual-only upvote for now
    if (commentId === comment?.id) {
      setComment(prev => {
        if (!prev) return prev;
        const isCurrentlyUpvoted = prev.upvoted_by_current_user || false;
        return {
          ...prev,
          upvoted_by_current_user: !isCurrentlyUpvoted,
          upvotes_count: isCurrentlyUpvoted 
            ? Math.max(0, (prev.upvotes_count || 0) - 1) 
            : (prev.upvotes_count || 0) + 1
        };
      });
    } else {
      setReplies(replies.map(r => 
        r.id === commentId 
          ? {
              ...r, 
              upvoted_by_current_user: !(r.upvoted_by_current_user || false), 
              upvotes_count: (r.upvoted_by_current_user || false)
                ? Math.max(0, (r.upvotes_count || 0) - 1) 
                : (r.upvotes_count || 0) + 1
            } 
          : r
      ));
    }
  };

  // Navigate to a reply's detail page
  const navigateToReply = (replyId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on upvote or reply buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    router.push(`/comments/${replyId}`);
  };

  const handleReplyToReply = (replyId: string) => {
    // Toggle reply form for this reply
    setReplyingTo(replyingTo === replyId ? null : replyId);
    setReplyText('');
  };

  const submitReplyToReply = async (replyId: string) => {
    if (!replyText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await api.createReply({
        content: replyText,
        user_id: currentUserId,
        parent_id: replyId
      });
      
      // Refresh the comment to get the updated replies
      const updatedComment = await api.getComment(id);
      setComment(updatedComment);
      if (updatedComment.replies) {
        setReplies(updatedComment.replies);
      }
      
      // Clear input and close reply form
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to post reply:', error);
      setError('Failed to post reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add delete comment handler
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }
    
    setIsDeletingComment(commentId);
    
    try {
      await api.deleteComment(commentId);
      
      // If deleting the current comment, go back to the post
      if (commentId === id && post) {
        router.push(`/posts/${post.id}`);
        return;
      }
      
      // If deleting a reply, remove it from the state
      setReplies(replies.filter(r => r.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setIsDeletingComment(null);
    }
  };

  if (isLoading) {
    return <div className="p-4 ml-64 mt-16">Loading comment...</div>;
  }

  if (!comment || !post) {
    return <div className="p-4 ml-64 mt-16">Comment not found</div>;
  }

  return (
    <main className="p-4 ml-64 mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link 
            href={`/posts/${post.id}`}
            className="inline-flex items-center text-green-600 hover:text-green-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Post
          </Link>
        </div>

        {/* Post Context */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h1>
          <p className="text-gray-600 mb-4 line-clamp-2">{post.content}</p>
          <Link 
            href={`/posts/${post.id}`}
            className="text-green-600 hover:text-green-700"
          >
            View full post
          </Link>
        </div>

        {/* Comment Thread */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Comment Thread</h2>
          
          {/* Root Comment (if exists) */}
          {rootComment && (
            <div className="mb-4 border-l-4 border-gray-200 pl-4 py-2">
              <div className="flex justify-between mb-2">
                <span className="font-bold text-gray-900">{rootComment.user_name || 'User'}</span>
                <span className="text-sm text-gray-600">
                  {new Date(rootComment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-900">{rootComment.content}</p>
            </div>
          )}
          
          {/* Parent Comment (if exists) */}
          {parentComment && (
            <div className={`mb-4 ${rootComment ? 'ml-6' : ''} border-l-4 border-gray-300 pl-4 py-2`}>
              <div className="flex justify-between mb-2">
                <span className="font-bold text-gray-900">{parentComment.user_name || 'User'}</span>
                <span className="text-sm text-gray-600">
                  {new Date(parentComment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-900">{parentComment.content}</p>
            </div>
          )}
          
          {/* Current Comment with delete button */}
          <div className={`mb-4 ${parentComment ? 'ml-6' : ''} ${rootComment && parentComment ? 'ml-12' : ''} border-l-4 border-green-500 pl-4 py-2`}>
            <div className="flex justify-between mb-2">
              <span className="font-bold text-gray-900">{comment.user_name || 'User'}</span>
              <span className="text-sm text-gray-600">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-900 mb-4">{comment.content}</p>
            
            <div className="flex items-center">
              <button 
                onClick={() => handleCommentUpvote(comment.id)}
                className={`flex items-center text-sm mr-4 ${
                  comment.upvoted_by_current_user 
                    ? 'text-green-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowUp className="w-3 h-3 mr-1" />
                <span>{comment.upvotes_count || 0} upvotes</span>
              </button>
              
              {/* Delete button for current comment */}
              <button 
                onClick={() => handleDeleteComment(comment.id)}
                disabled={isDeletingComment === comment.id}
                className="flex items-center text-sm text-red-600 hover:text-red-700 ml-auto"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                <span>{isDeletingComment === comment.id ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
          
          {/* Replies to Current Comment */}
          {replies.length > 0 && (
            <div className={`ml-6 ${parentComment ? 'ml-12' : ''} ${rootComment && parentComment ? 'ml-18' : ''}`}>
              <h3 className="font-bold text-gray-700 mb-2">Replies</h3>
              <div className="space-y-4">
                {replies.map((reply) => (
                  <div 
                    key={reply.id} 
                    className="border-l-4 border-gray-200 pl-4 py-2 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
                    onClick={(e) => navigateToReply(reply.id, e)}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-bold text-gray-900">{reply.user_name || 'User'}</span>
                      <span className="text-sm text-gray-600">
                        {new Date(reply.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-900">{reply.content}</p>
                    
                    <div className="flex items-center mt-2 space-x-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCommentUpvote(reply.id);
                        }}
                        className={`flex items-center text-sm ${
                          reply.upvoted_by_current_user 
                            ? 'text-green-600' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <ArrowUp className="w-3 h-3 mr-1" />
                        <span>{reply.upvotes_count || 0} upvotes</span>
                      </button>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplyToReply(reply.id);
                        }}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        <span>Reply</span>
                      </button>
                      
                      {/* Reply count indicator */}
                      {(reply.replies_count && reply.replies_count > 0) && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          <span>{reply.replies_count} {reply.replies_count === 1 ? 'reply' : 'replies'}</span>
                        </div>
                      )}
                      
                      {/* Delete button for reply */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteComment(reply.id);
                        }}
                        disabled={isDeletingComment === reply.id}
                        className="flex items-center text-sm text-red-600 hover:text-red-700 ml-auto"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        <span>{isDeletingComment === reply.id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </div>
                    
                    {/* Reply form for replying to this reply */}
                    {replyingTo === reply.id && (
                      <div 
                        className="mt-3 pl-4 border-l-2 border-gray-200"
                        onClick={(e) => e.stopPropagation()} // Prevent navigation when interacting with the form
                      >
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to ${reply.user_name || 'User'}...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px] text-gray-900"
                        />
                        <div className="flex justify-end mt-2 space-x-2">
                          <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => submitReplyToReply(reply.id)}
                            disabled={!replyText.trim() || isSubmitting}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {isSubmitting ? 'Posting...' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reply to this comment</h2>
          <form onSubmit={handleSubmitReply}>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.user_name || 'User'}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px] text-gray-900"
              required
              disabled={isSubmitting}
            />
            {error && <p className="text-red-500 mt-1">{error}</p>}
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isSubmitting || !replyText.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
} 