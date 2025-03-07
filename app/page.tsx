'use client';
import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import Link from 'next/link';
import { ArrowUp, MessageSquare } from 'lucide-react';

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
  upvoted_by_current_user: boolean;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const allPosts = await api.getAllPosts();
        const sortedPosts = allPosts.sort((a: Post, b: Post) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setPosts(sortedPosts);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        setError(`Failed to load posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleUpvote = async (postId: string, isUpvoted: boolean) => {
    try {
      const response = isUpvoted
        ? await api.deleteUpvote(postId, 'Post')
        : await api.createUpvote(postId, 'Post');

      if (response.success) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, upvotes_count: response.upvotes_count, upvoted_by_current_user: !isUpvoted }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Failed to update upvote:', error);
    }
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Recent Posts</h1>
        
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-900">No posts available.</p>
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
                    <button
                      onClick={() => handleUpvote(post.id, post.upvoted_by_current_user)}
                      className={`flex items-center mr-4 ${
                        post.upvoted_by_current_user ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4 mr-1" />
                      <span>{post.upvotes_count || 0} upvotes</span>
                    </button>
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