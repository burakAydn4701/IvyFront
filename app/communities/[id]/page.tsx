'use client';
import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, ArrowUp } from 'lucide-react';
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
  user: { id: string; username: string };
  image_url?: string;
}

interface Community {
  id: string;
  name: string;
  description: string;
  created_at: string;
  members_count?: number;
}

export default function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

  useEffect(() => {
    const fetchCommunityData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const communityData = await api.getCommunity(id);
        setCommunity(communityData);
        
        const communityPosts = await api.getCommunityPosts(id);
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
  }, [id]);

  if (isLoading) {
    return <div className="p-4 ml-64 mt-16">Loading community...</div>;
  }

  if (error || !community) {
    return <div className="p-4 ml-64 mt-16 text-red-500">{error || 'Community not found'}</div>;
  }

  return (
    <main className="p-4 ml-64 mt-16">
      <div className="max-w-4xl mx-auto">
        {/* Community Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{community.name}</h1>
          <p className="text-gray-600 mb-4">{community.description}</p>
          <div className="flex items-center text-sm text-gray-600">
            <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Posts Section */}
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

        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-900">No posts in this community yet. Be the first to create a post!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500 mb-1">@{post.user.username}</p>
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
                      <ArrowUp className="w-4 h-4 mr-1" />
                      <span>{post.upvotes_count || 0} upvotes</span>
                    </div>
                    <div className="flex items-center mr-4">
                      <MessageSquare className="w-4 h-4 mr-1" />
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
      <CreatePostModal
        communityId={id}
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onPostCreated={() => {
          window.location.reload();
        }}
      />
    </main>
  );
}