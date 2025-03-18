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

  if (loading) {
    return <div className="p-4">Loading post...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  
  if (!post) {
    return <div className="p-4">Post not found</div>;
  }

  return (
    <div>
      <article className="p-4 border-b">
        <div className="flex">
          {/* User profile picture */}
          <div className="mr-3 flex-shrink-0">
            <Link href={`/users/${post.user.id}`}>
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white">
                {post.user.username[0].toUpperCase()}
              </div>
            </Link>
          </div>

          {/* Post content */}
          <div className="flex-1">
            <div className="mb-2">
              <Link 
                href={`/users/${post.user.id}`}
                className="text-gray-500 hover:text-green-600"
              >
                @{post.user.username}
              </Link>
            </div>
            <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
            <p className="mb-4">{post.content}</p>
            
            {post.image_url && (
              <img 
                src={post.image_url} 
                alt={post.title}
                className="rounded-lg max-h-[400px] w-full object-cover mb-4"
              />
            )}
            
            <div className="flex items-center text-gray-500">
              <button 
                className={`flex items-center mr-4 ${
                  post.upvoted_by_current_user 
                    ? "text-green-600 font-bold" 
                    : "hover:text-green-600"
                }`}
                onClick={() => handleUpvote(post.id, !!post.upvoted_by_current_user, 'Post')}
              >
                <ArrowUp className={`w-4 h-4 mr-1 ${post.upvoted_by_current_user ? "fill-green-600" : ""}`} />
                <span>{post.upvotes_count || 0}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Comments section */}
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Comments ({comments.length})</h2>
        
        {/* Add comment form */}
        <div className="mb-6">
          <textarea
            placeholder="Add a comment..."
            className="w-full p-3 border rounded-lg"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button 
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg"
            onClick={handleCommentSubmit}
          >
            Post Comment
          </button>
        </div>
        
        {/* Comments list */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b pb-4">
              <div className="flex items-center mb-2">
                <span className="font-medium">@{comment.user.username}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p>{comment.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 