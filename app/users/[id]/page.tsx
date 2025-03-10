'use client';
import { useEffect, useState, use } from 'react';
import { api, normalizeId } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  email?: string;
  profile_photo_url?: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: { 
    id: string; 
    username: string;
    profile_photo_url?: string;
  };
  community: {
    id: string;
    name: string;
  } | null;
  comments_count: number;
  upvotes_count: number;
  image_url?: string;
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: userId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID from token
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentId = payload.user_id.toString();
        setCurrentUserId(currentId);
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }

    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch user data
        const userData = await api.getUser(userId);
        setUser(userData);
        
        // Fetch user's posts - this should now return an empty array instead of throwing
        const userPosts = await api.getUserPosts(userId);
        console.log('Fetched user posts:', userPosts);
        
        if (Array.isArray(userPosts) && userPosts.length > 0) {
          const sortedPosts = userPosts.sort((a: Post, b: Post) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setPosts(sortedPosts);
        } else {
          console.log('No posts found for user');
          setPosts([]);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        setError(`Failed to load user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const startChat = async () => {
    if (!user) return;
    
    try {
      // Create a new chat or get existing chat with this user
      console.log(`Attempting to create chat with user: ${userId}`);
      const chatData = await api.createChat(userId);
      console.log('Chat creation response:', chatData);
      
      // Navigate to the chat page with the chat ID
      // Even if the response structure is unexpected, try to navigate if we have an ID
      if (chatData && chatData.id) {
        console.log(`Navigating to messages with chatId: ${chatData.id}`);
        router.push(`/messages?chatId=${chatData.id}`);
      } else if (chatData && typeof chatData === 'object') {
        // Try to find the ID in the response object
        const possibleId = chatData.chat_id || chatData.chatId || chatData.id;
        if (possibleId) {
          console.log(`Found alternative ID in response: ${possibleId}`);
          router.push(`/messages?chatId=${possibleId}`);
        } else {
          // If we can't find an ID but the chat was created, just go to messages
          console.log('Chat may have been created but no ID found in response. Redirecting to messages page.');
          router.push('/messages');
        }
      } else {
        // If all else fails, just go to messages
        console.log('No chat data returned. Redirecting to messages page.');
        router.push('/messages');
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      // Even if there's an error, the chat might have been created
      // Just navigate to the messages page
      router.push('/messages');
    }
  };

  if (isLoading) {
    return <div className="p-4 ml-64 mt-16">Loading user profile...</div>;
  }

  if (error || !user) {
    return <div className="p-4 ml-64 mt-16 text-red-500">{error || 'User not found'}</div>;
  }

  return (
    <main className="p-4 ml-64 mt-16">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </button>

        {/* User Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 mr-6">
              {user.profile_photo_url ? (
                <img 
                  src={user.profile_photo_url} 
                  alt={user.username} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-800 text-2xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.username}</h1>
              <p className="text-gray-600 mb-4">Member since {new Date(user.created_at).toLocaleDateString()}</p>
              
              {/* Message button - only show if not viewing own profile */}
              {currentUserId && normalizeId(currentUserId) !== normalizeId(userId) && (
                <button
                  onClick={startChat}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span>Message</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User's Posts Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Posts by {user.username}</h2>
          
          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-gray-900">No posts yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <Link href={`/communities/${post.community?.id}`} className="text-sm text-green-600 hover:underline mb-1 block">
                    Posted in {post.community?.name}
                  </Link>
                  
                  <Link href={`/posts/${post.id}`}>
                    <h3 className="text-xl font-bold text-gray-900 hover:text-green-600 mb-2">{post.title}</h3>
                  </Link>
                  
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt={post.title}
                      className="rounded-lg max-h-96 object-cover mb-4"
                    />
                  )}
                  
                  <Link href={`/posts/${post.id}`} className="block">
                    <p className="text-gray-900 mb-4 line-clamp-3">{post.content}</p>
                    <div className="flex items-center text-sm text-gray-900">
                      <div className="flex items-center mr-4">
                        <span>{post.upvotes_count || 0} upvotes</span>
                      </div>
                      <div className="flex items-center mr-4">
                        <span>{post.comments_count || 0} comments</span>
                      </div>
                      <span className="text-gray-600">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 