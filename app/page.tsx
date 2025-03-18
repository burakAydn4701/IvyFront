'use client';
import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import Link from 'next/link';
import { ArrowUp, MessageSquare, PlusCircle } from 'lucide-react';

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
  upvoted_by_current_user: boolean;
  image_url?: string;
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
    return <div className="p-4">Loading posts...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div>
      {posts.map((post) => (
        <article 
          key={post.id} 
          className="border-b p-4"
        >
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
                <h2 className="text-xl font-bold mb-2">{post.title}</h2>
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
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}