'use client';
import { useEffect, useState, use } from 'react';
import { api } from '@/app/lib/api';
import { ArrowUp } from 'lucide-react';

export default function PostPage({ params }: { params: any }) {
  const resolvedParams = use(params) as { id: string };
  const postId = resolvedParams.id;
  
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  
  // Simple check for authentication
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('authToken');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch post data
        const postData = await api.getPost(postId);
        console.log('Post data received:', postData);
        setPost(postData);
        
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
      const response = isUpvoted
        ? await api.deleteUpvote(id, type)
        : await api.createUpvote(id, type);

      if (response.success) {
        if (type === 'Post') {
          setPost({
            ...post,
            upvoted_by_current_user: !isUpvoted,
            upvotes_count: response.upvotes_count,
          });
        } else {
          // Update comments or replies
          setComments(prevComments => 
            prevComments.map(comment => 
              comment.id === id 
                ? {...comment, upvoted_by_current_user: !isUpvoted, upvotes_count: response.upvotes_count}
                : {...comment, replies: (comment.replies || []).map((reply: any) => 
                    reply.id === id 
                      ? {...reply, upvoted_by_current_user: !isUpvoted, upvotes_count: response.upvotes_count}
                      : reply
                  )}
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to update upvote:', error);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>
        <div className="flex items-center text-sm text-gray-500">
          <span>Posted by {post.user?.username || 'Anonymous'}</span>
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
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ArrowUp className="w-5 h-5 mr-2" />
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
                  <span className="font-medium text-gray-900">{comment.user?.username || 'Anonymous'}</span>
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
                    <ArrowUp className="w-4 h-4 mr-1" />
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
                          <ArrowUp className="w-4 h-4 mr-1" />
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