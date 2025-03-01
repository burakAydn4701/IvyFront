'use client';
import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowUp } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  content: string;
  user_id: string;
  community_id: string;
  community?: { id: string; name: string };
  user?: { id: string; username: string };
  created_at: string;
  image_url?: string;
  upvotes_count: number;
  comments_count: number;
  upvoted_by_current_user?: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const allPosts = await api.getAllPosts();
        // Sort posts by created_at (newest first)
        const sortedPosts = allPosts.sort((a: Post, b: Post) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setPosts(sortedPosts);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const navigateToCommunity = (e: React.MouseEvent, communityId: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/communities/${communityId}`);
  };

  if (isLoading) {
    return <div className="p-4 ml-64 mt-16">Loading posts...</div>;
  }

  if (error) {
    return <div className="p-4 ml-64 mt-16 text-red-500">{error}</div>;
  }

  return (
    <main className="p-4 ml-64 mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-green-600">
            Recent Posts
          </Link>
          <Link 
            href="/posts/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Create Post
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-900">No posts yet. Be the first to create a post!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/posts/${post.id}`}>
                    <h2 className="text-xl font-bold text-gray-900 hover:text-green-600">{post.title}</h2>
                  </Link>
                  {post.community && (
                    <div 
                      onClick={(e) => navigateToCommunity(e, post.community!.id)}
                      className="text-sm text-green-600 hover:text-green-700 cursor-pointer"
                    >
                      {post.community.name}
                    </div>
                  )}
                </div>
                
                <Link href={`/posts/${post.id}`} className="block">
                  <p className="text-gray-900 mb-4 line-clamp-3">{post.content}</p>
                  
                  {post.image_url && (
                    <div className="mb-4">
                      <img 
                        src={post.image_url} 
                        alt={post.title}
                        className="rounded-lg max-h-48 object-cover"
                      />
                    </div>
                  )}
                  
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
    </main>
  );
}
