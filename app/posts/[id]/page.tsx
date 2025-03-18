'use client';
import { useEffect, useState, use, useRef } from 'react';
import { api, normalizeId } from '@/app/lib/api';
import { ArrowUp, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PostPage({ params }: { params: any }) {
  const router = useRouter();
  const resolvedParams = use(params) as { id: string };
  const postId = resolvedParams.id;
  
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMenuActionRef = useRef(false);
  
  // Simple check for authentication
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('authToken');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if the click is on a menu button (let the toggle handle it)
      if ((event.target as Element).closest('[data-menu-button]') || 
          (event.target as Element).closest('[data-menu-dropdown]')) {
        return;
      }
      
      // If we're in the middle of a menu action, don't close
      if (isMenuActionRef.current) {
        isMenuActionRef.current = false;
        return;
      }
      
      setIsMenuOpen(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Get current user ID from token
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.user_id.toString();
        console.log('Current user ID:', userId);
        setCurrentUserId(userId);
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    } else {
      console.log('No auth token found');
    }

    async function loadData() {
      setLoading(true);
      try {
        // Fetch post data
        const postData = await api.getPost(postId);
        console.log('Post data received:', postData);
        setPost(postData);
        
        // Debug post ownership
        if (currentUserId) {
          console.log(`Post owner check: Post user_id=${postData.user_id}, Current user_id=${currentUserId}, Match=${postData.user_id.toString() === currentUserId.toString()}`);
        }
        
        // Fetch comments
        const commentsData = await api.getPostComments(postId);
        console.log('Comments data received:', commentsData);
        
        // Process comments to separate top-level comments and replies
        const topLevelComments: any[] = [];
        const repliesMap: Record<string, any[]> = {};
        
        // First pass: identify top-level comments and create containers for replies
        commentsData.forEach((item: any) => {
          if (!item.parent_id) {
            // This is a top-level comment
            item.replies = [];
            topLevelComments.push(item);
            repliesMap[item.id] = item.replies;
          }
        });
        
        // Second pass: add replies to their parent comments
        commentsData.forEach((item: any) => {
          if (item.parent_id && repliesMap[item.parent_id]) {
            repliesMap[item.parent_id].push(item);
          }
        });
        
        setComments(topLevelComments);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load post data');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [postId]);

  const handleUpvote = async (id: string, isUpvoted: boolean, type: 'Post' | 'Comment' | 'Reply') => {
    if (!isLoggedIn) return;
    
    try {
      // Get current user ID from token
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.user_id;

      // Optimistically update the UI
      if (type === 'Post') {
        setPost({
          ...post,
          upvoted_by_current_user: !isUpvoted
        });
      } else {
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === id 
              ? {...comment, upvoted_by_current_user: !isUpvoted}
              : {...comment, replies: (comment.replies || []).map((reply: any) => 
                  reply.id === id 
                    ? {...reply, upvoted_by_current_user: !isUpvoted}
                    : reply
                )}
          )
        );
      }

      let response;
      if (type === 'Post') {
        response = await api.togglePostUpvote(id, userId, isUpvoted);
      } else {
        response = await api.toggleCommentUpvote(id, userId, isUpvoted);
      }

      // Update with the server response
      if (type === 'Post') {
        setPost({
          ...post,
          upvoted_by_current_user: response.upvoted_by_current_user,
          upvotes_count: response.upvotes_count,
        });
      } else {
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === id 
              ? {
                  ...comment, 
                  upvoted_by_current_user: response.upvoted_by_current_user, 
                  upvotes_count: response.upvotes_count
                }
              : {...comment, replies: (comment.replies || []).map((reply: any) => 
                  reply.id === id 
                    ? {
                        ...reply, 
                        upvoted_by_current_user: response.upvoted_by_current_user, 
                        upvotes_count: response.upvotes_count
                      }
                    : reply
                )}
          )
        );
      }
    } catch (error: any) {
      console.error('Failed to update upvote:', error);
      // If the error is because the user already upvoted, maintain the upvoted state
      if (error.message?.includes('can only upvote once')) {
        if (type === 'Post') {
          setPost({
            ...post,
            upvoted_by_current_user: true,
          });
        } else {
          setComments(prevComments => 
            prevComments.map(comment => 
              comment.id === id 
                ? {...comment, upvoted_by_current_user: true}
                : {...comment, replies: (comment.replies || []).map((reply: any) => 
                    reply.id === id 
                      ? {...reply, upvoted_by_current_user: true}
                      : reply
                  )}
            )
          );
        }
      } else {
        // Revert the optimistic update on other errors
        if (type === 'Post') {
          setPost({
            ...post,
            upvoted_by_current_user: isUpvoted,
          });
        } else {
          setComments(prevComments => 
            prevComments.map(comment => 
              comment.id === id 
                ? {...comment, upvoted_by_current_user: isUpvoted}
                : {...comment, replies: (comment.replies || []).map((reply: any) => 
                    reply.id === id 
                      ? {...reply, upvoted_by_current_user: isUpvoted}
                      : reply
                  )}
            )
          );
        }
      }
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !isLoggedIn) return;
    
    try {
      // Add comment logic here
      // Refresh comments after adding
      const commentsData = await api.getPostComments(postId);
      setComments(commentsData || []);
      setCommentText('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleReplySubmit = async (commentId: string) => {
    if (!replyText.trim() || !isLoggedIn) return;
    
    try {
      // Add reply logic here
      // Refresh comments after adding
      const commentsData = await api.getPostComments(postId);
      setComments(commentsData || []);
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.deletePost(postId);
      // Navigate back to the community page or home page
      router.push(`/communities/${post.community_id}`);
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  // Simple loading state
  if (loading) {
    return <div className="p-4 text-center">Loading post...</div>;
  }
  
  // Error state
  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }
  
  // No post found
  if (!post) {
    return <div className="p-4 text-center">Post not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      {/* Post Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>
          
          {/* Three-dot menu - only shown for user's own posts */}
          {normalizeId(post.user_id) === normalizeId(currentUserId) && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                  
                  // Debug info
                  const postUserId = normalizeId(post.user_id);
                  const currentId = normalizeId(currentUserId);
                  console.log(`Post ${post.id} - User ID: ${postUserId}, Current User ID: ${currentId}, Match: ${postUserId === currentId}`);
                }}
                data-menu-button="true"
                className="text-gray-500 hover:text-gray-700 focus:outline-none bg-gray-100 hover:bg-gray-200 rounded-full p-2"
                aria-label="Post options"
              >
                <MoreVertical className="w-6 h-6" />
              </button>
              
              {/* Dropdown menu */}
              {isMenuOpen && (
                <div 
                  className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg z-20 border border-gray-200"
                  onClick={(e) => e.stopPropagation()}
                  data-menu-dropdown="true"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      isMenuActionRef.current = true;
                      handleDeletePost();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-md"
                  >
                    Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <span>Posted by {post.user ? (
            <Link 
              href={`/users/${post.user.id}`}
              className="hover:text-green-600 hover:underline"
            >
              {post.user.username}
            </Link>
          ) : 'Anonymous'}</span>
          <span className="mx-2">•</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      
      {/* Post Content */}
      <div className="prose max-w-none mb-6">
        <p className="text-gray-800 text-lg">{post.content}</p>
      </div>
      
      {/* Upvote Button */}
      <div className="mb-8 flex items-center">
        <button 
          onClick={() => isLoggedIn ? handleUpvote(post.id, post.upvoted_by_current_user, 'Post') : null}
          disabled={!isLoggedIn}
          className={`flex items-center px-3 py-2 rounded-md transition ${
            !isLoggedIn 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : post.upvoted_by_current_user
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ArrowUp className={`w-5 h-5 mr-2 ${post.upvoted_by_current_user ? 'fill-blue-600' : ''}`} />
          <span className="font-medium">{post.upvotes_count || 0} upvotes</span>
        </button>
      </div>
      
      {/* Comments Section */}
      <div className="border-t pt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Comments ({comments.length})
        </h2>
        
        {/* Add Comment Form */}
        {isLoggedIn && (
          <div className="mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <button
              onClick={handleCommentSubmit}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Post Comment
            </button>
          </div>
        )}
        
        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-gray-500 italic">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b pb-4">
                <div className="flex items-center mb-2">
                  {comment.user ? (
                    <Link 
                      href={`/users/${comment.user.id}`}
                      className="font-medium text-gray-900 hover:text-green-600 hover:underline"
                    >
                      {comment.user.username}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-900">Anonymous</span>
                  )}
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="text-sm text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                
                <p className="text-gray-800 mb-3">{comment.content}</p>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => isLoggedIn ? handleUpvote(comment.id, comment.upvoted_by_current_user, 'Comment') : null}
                    disabled={!isLoggedIn}
                    className={`flex items-center text-sm ${
                      !isLoggedIn 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : comment.upvoted_by_current_user
                          ? 'text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ArrowUp className={`w-4 h-4 mr-1 ${comment.upvoted_by_current_user ? 'fill-blue-600' : ''}`} />
                    <span>{comment.upvotes_count || 0}</span>
                  </button>
                  
                  {isLoggedIn && (
                    <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Reply
                    </button>
                  )}
                </div>
                
                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 ml-6">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => handleReplySubmit(comment.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 ml-8 pl-4 border-l-2 border-gray-100">
                    {comment.replies.map((reply: any) => (
                      <div key={reply.id} className="mb-3 last:mb-0">
                        <div className="flex items-center mb-1">
                          <span className="font-medium text-gray-900">{reply.user?.username || 'Anonymous'}</span>
                          <span className="mx-2 text-gray-400">•</span>
                          <span className="text-sm text-gray-500">{new Date(reply.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <p className="text-gray-800 mb-2">{reply.content}</p>
                        
                        <button
                          onClick={() => isLoggedIn ? handleUpvote(reply.id, reply.upvoted_by_current_user, 'Reply') : null}
                          disabled={!isLoggedIn}
                          className={`flex items-center text-sm ${
                            !isLoggedIn 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : reply.upvoted_by_current_user
                                ? 'text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <ArrowUp className={`w-4 h-4 mr-1 ${reply.upvoted_by_current_user ? 'fill-blue-600' : ''}`} />
                          <span>{reply.upvotes_count || 0}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 