'use client';
import { useEffect, useState, use, useRef } from 'react';
import { api, normalizeId } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowUp, MoreVertical } from 'lucide-react';
import CreatePostModal from '@/components/create-post-modal';

interface Post {
  id: string;
  title: string;
  content: string;
  user_id: string;
  community_id: string;
  created_at: string;
  upvotes_count: number;
  comments_count: number;
  user: { id: string; username: string; profile_photo_url?: string };
  image_url?: string;
  upvoted_by_current_user?: boolean;
}

interface Community {
  id: string;
  name: string;
  description: string;
  created_at: string;
  members_count?: number;
}

export default function CommunityPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Use the params safely whether it's a Promise or direct object
  const communityId = 'then' in params ? use(params).id : params.id;
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const isMenuActionRef = useRef(false);

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

    const fetchCommunityData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const communityData = await api.getCommunity(communityId);
        setCommunity(communityData);
        
        const communityPosts = await api.getCommunityPosts(communityId);
        console.log('Posts data:', communityPosts);
        const sortedPosts = communityPosts.sort((a: Post, b: Post) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setPosts(sortedPosts);
      } catch (error) {
        console.error('Failed to fetch community data:', error);
        setError(`Failed to load community: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunityData();
  }, [communityId]);

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
      
      setIsMenuOpen({});
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.deletePost(postId);
      // Remove the post from the UI
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  // Function to toggle the menu for a specific post
  const toggleMenu = (postId: string, event?: React.MouseEvent) => {
    // If event is provided, prevent default and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('Toggling menu for post:', postId, 'Current open menu:', isMenuOpen);
    
    setIsMenuOpen({ ...isMenuOpen, [postId]: !isMenuOpen[postId] });
  };

  // Fix the normalizeId call where it's used with currentUserId
  const isCurrentUserPost = (post: Post) => {
    if (!currentUserId) return false;
    return normalizeId(post.user_id) === normalizeId(currentUserId);
  };

  // Update where normalizeId is used with currentUserId
  const renderPostMenu = (post: Post) => {
    // Only show menu for the current user's posts
    if (!isCurrentUserPost(post)) return null;
    
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu(post.id, e);
            
            // Debug info with more details
            console.log(`Post ${post.id} - User: ${post.user.username}, Current user match: ${isCurrentUserPost(post)}`);
          }}
          className="text-gray-500 hover:text-gray-700 focus:outline-none bg-gray-100 hover:bg-gray-200 rounded-full p-2"
          aria-label="Post options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        
        {isMenuOpen[post.id] && (
          <div 
            className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg z-20 border border-gray-200"
            ref={menuRef}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                isMenuActionRef.current = true;
                handleDeletePost(post.id);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-md"
            >
              Delete post
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleUpvote = async (postId: string, isUpvoted: boolean) => {
    try {
      if (isUpvoted) {
        await api.deleteUpvote(postId, 'Post');
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, upvotes_count: post.upvotes_count - 1, upvoted_by_current_user: false }
              : post
          )
        );
      } else {
        await api.createUpvote(postId, 'Post');
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, upvotes_count: post.upvotes_count + 1, upvoted_by_current_user: true }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Failed to update upvote:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4 ml-64 mt-16">Loading community...</div>;
  }

  if (error || !community) {
    return <div className="p-4 ml-64 mt-16 text-red-500">{error || 'Community not found'}</div>;
  }

  return (
    <div>
      {/* Community Header */}
      <div className="bg-white p-4 border-b">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{community.name}</h1>
        <p className="text-gray-600 mb-4">{community.description}</p>
        <div className="flex items-center text-sm text-gray-600">
          <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Posts Section */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Posts in {community.name}</h2>
          
          {typeof window !== 'undefined' && localStorage.getItem('authToken') && (
            <button
              onClick={() => setIsCreatePostModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create Post
            </button>
          )}
        </div>
      </div>

      {/* Posts List */}
      <div>
        {posts.length === 0 ? (
          <div className="p-4">
            <p className="text-gray-900">No posts in this community yet. Be the first to create a post!</p>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="border-b p-4">
              <div className="flex">
                {/* User profile picture */}
                <div className="mr-3 flex-shrink-0">
                  <Link href={`/users/${post.user.id}`}>
                    {post.user.profile_photo_url ? (
                      <img 
                        src={post.user.profile_photo_url} 
                        alt={post.user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white">
                        {post.user.username[0].toUpperCase()}
                      </div>
                    )}
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
                  
                  <Link href={`/posts/${post.id}`}>
                    <h3 className="text-xl font-bold mb-2 hover:text-green-600">{post.title}</h3>
                  </Link>
                  
                  <p className="mb-3">{post.content}</p>
                  
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt={post.title}
                      className="rounded-lg max-h-96 w-full object-cover mb-3"
                    />
                  )}
                  
                  <div className="flex items-center text-gray-500">
                    <button 
                      className={`flex items-center mr-4 ${
                        post.upvoted_by_current_user 
                          ? "text-green-600 font-bold" 
                          : "hover:text-green-600"
                      }`}
                      onClick={() => handleUpvote(post.id, post.upvoted_by_current_user)}
                    >
                      <ArrowUp className={`w-4 h-4 mr-1 ${post.upvoted_by_current_user ? "fill-green-600" : ""}`} />
                      <span>{post.upvotes_count || 0}</span>
                    </button>
                    <button className="flex items-center hover:text-green-600">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      <span>{post.comments_count || 0}</span>
                    </button>
                    <span className="ml-auto text-sm">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <CreatePostModal
        communityId={communityId}
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onPostCreated={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}