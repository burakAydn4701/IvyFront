const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(!options.body || typeof options.body === 'string' ? defaultHeaders : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}): ${errorText}`);
      throw new Error(`API call failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export const api = {
  // Communities
  getCommunities: () => fetchApi('/api/communities'),
  getCommunity: (id: string) => fetchApi(`/api/communities/${id}`),
  getCommunityPosts: (id: string) => fetchApi(`/api/communities/${id}/posts`),

  // Users
  getUsers: () => fetchApi('/api/users'),
  getUser: (id: string) => fetchApi(`/api/users/${id}`),
  createUser: (data: any) => fetchApi('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Posts
  getPosts: () => fetchApi('/api/posts'),
  getPost: (id: string) => fetchApi(`/api/posts/${id}`),
  createPost: (data: {
    title: string;
    content: string;
    community_id: string;
    user_id: string;
    image?: File;
  }) => {
    const formData = new FormData();
    formData.append('post[title]', data.title);
    formData.append('post[content]', data.content);
    formData.append('post[community_id]', data.community_id);
    formData.append('post[user_id]', data.user_id);
    
    if (data.image) {
      formData.append('post[image]', data.image, data.image.name);
    }

    return fetchApi('/api/posts', {
      method: 'POST',
      headers: {},
      body: formData
    });
  },

  // Comments
  getComments: () => fetchApi('/api/comments'),
  getComment: (id: string) => fetchApi(`/api/comments/${id}`),
  getCommentReplies: (commentId: string) => fetchApi(`/api/comments/${commentId}/comments`),
  createComment: (data: {
    content: string;
    post_id: string;
    user_id: string;
  }) => fetchApi(`/api/posts/${data.post_id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ 
      comment: {
        content: data.content,
        user_id: data.user_id
      }
    }),
  }),
  getPostComments: (postId: string) => fetchApi(`/api/posts/${postId}/comments`),

  // Upvotes
  createPostUpvote: (postId: string) => fetchApi(`/api/posts/${postId}/upvote`, {
    method: 'POST',
  }),
  deletePostUpvote: (postId: string) => fetchApi(`/api/posts/${postId}/upvote`, {
    method: 'DELETE',
  }),
  createCommentUpvote: (commentId: string) => fetchApi(`/api/comments/${commentId}/upvote`, {
    method: 'POST',
  }),
  deleteCommentUpvote: (commentId: string) => fetchApi(`/api/comments/${commentId}/upvote`, {
    method: 'DELETE',
  }),

  createCommunity: (data: {
    name: string;
    description: string;
    profile_photo?: File;
    banner?: File;
  }) => {
    const formData = new FormData();
    formData.append('community[name]', data.name);
    formData.append('community[description]', data.description);
    
    if (data.profile_photo) {
      formData.append('community[profile_photo]', data.profile_photo, data.profile_photo.name);
    }
    if (data.banner) {
      formData.append('community[banner]', data.banner, data.banner.name);
    }

    return fetchApi('/api/communities', {
      method: 'POST',
      headers: {},
      body: formData
    });
  },

  // Updated upvote methods to match Rails routes
  upvotePost: (postId: string, userId: string) => fetchApi(`/api/posts/${postId}/upvotes`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }),
  
  removePostUpvote: (postId: string, userId: string) => fetchApi(`/api/posts/${postId}/upvotes/${userId}`, {
    method: 'DELETE',
  }),

  // Toggle upvote method
  togglePostUpvote: (postId: string, userId: string, isUpvoted: boolean) => {
    if (isUpvoted) {
      // Remove upvote - singular resource
      return fetchApi(`/api/posts/${postId}/upvotes`, {
        method: 'DELETE',
        body: JSON.stringify({ user_id: userId }),
      });
    } else {
      // Add upvote - singular resource
      return fetchApi(`/api/posts/${postId}/upvotes`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    }
  },

  // Comment upvote toggle
  toggleCommentUpvote: (commentId: string, userId: string, isUpvoted: boolean) => {
    if (isUpvoted) {
      // Remove upvote - singular resource
      return fetchApi(`/api/comments/${commentId}/upvotes`, {
        method: 'DELETE',
        body: JSON.stringify({ user_id: userId }),
      });
    } else {
      // Add upvote - singular resource
      return fetchApi(`/api/comments/${commentId}/upvotes`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    }
  },

  // Create a reply to a comment - updated to match new controller structure
  createReply: (data: {
    content: string;
    user_id: string;
    parent_id: string;
  }) => fetchApi(`/api/comments/${data.parent_id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ 
      comment: {
        content: data.content,
        user_id: data.user_id
      }
    }),
  }),

  // Delete a post
  deletePost: (id: string) => fetchApi(`/api/posts/${id}`, {
    method: 'DELETE',
  }),
  
  // Delete a comment
  deleteComment: (id: string) => fetchApi(`/api/comments/${id}`, {
    method: 'DELETE',
  }),

  // Get all posts
  getAllPosts: () => fetchApi('/api/posts'),
}; 