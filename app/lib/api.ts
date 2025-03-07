import { getConsumer } from '../utils/cable';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Retrieve the token from localStorage
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(!options.body || typeof options.body === 'string' ? defaultHeaders : {}),
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}), // Add the token to the headers
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
  getUsers: async () => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    
    return response.json();
  },
  getUser: (id: string) => fetchApi(`/api/users/${id}`),
  createUser: (data: any) => fetchApi('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  signup: (userData: { username: string; email: string; password: string }) => 
    fetchApi('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: userData }),
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
  createUpvote: (id: string, type: 'Post' | 'Comment' | 'Reply') => {
    let endpoint;
    
    if (type === 'Post') {
      endpoint = `/api/posts/${id}/upvotes`;
    } else if (type === 'Comment' || type === 'Reply') {
      endpoint = `/api/comments/${id}/upvotes`;
    } else {
      throw new Error(`Invalid type: ${type}`);
    }
    
    return fetchApi(endpoint, {
      method: 'POST',
    });
  },
  
  deleteUpvote: (id: string, type: 'Post' | 'Comment' | 'Reply') => {
    let endpoint;
    
    if (type === 'Post') {
      endpoint = `/api/posts/${id}/upvotes`;
    } else if (type === 'Comment' || type === 'Reply') {
      endpoint = `/api/comments/${id}/upvotes`;
    } else {
      throw new Error(`Invalid type: ${type}`);
    }
    
    return fetchApi(endpoint, {
      method: 'DELETE',
    });
  },

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

  // Add this to your existing api object
  login: (credentials: { email_or_username: string; password: string }) => 
    fetchApi('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    }),

  // Get current user profile
  getCurrentUser: async () => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    // Extract user ID from token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.user_id;
    
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    
    return response.json();
  },

  // Update user profile (username and email only)
  updateProfile: async (data: { username?: string; email?: string }) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    // Extract user ID from token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.user_id;
    
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: data }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    
    return response.json();
  },

  // Update profile photo to match the parameter structure expected by the controller
  updateProfilePhoto: async (file: File) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    // Extract user ID from token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.user_id;
    
    const endpoint = `${API_BASE_URL}/api/users/${userId}/update_profile_photo`;
    console.log("Sending profile photo update to endpoint:", endpoint);
    
    // Convert file to base64 as expected by the controller
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          // Extract only the base64 data part (remove the data:image/xxx;base64, prefix)
          const base64Data = base64String.split(',')[1];
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            // Match the parameter structure expected by the controller
            body: JSON.stringify({ profile_photo_base64: base64Data }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Profile photo update error (${response.status}): ${errorText}`);
            throw new Error(`Failed to update profile photo: ${response.statusText}`);
          }
          
          return resolve(response.json());
        } catch (error) {
          console.error('Profile photo update failed:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  },

  // Get all messages with a specific user
  getMessages: async (userId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/api/messages?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    
    return response.json();
  },

  // Send a message to another user
  sendMessage: async (data: { content: string; receiver_id: string }) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: data }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return response.json();
  },

  // Get all chats for the current user
  getChats: async () => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch chats (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch chats: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Raw chats data from API:", data);
      
      // Check if data is an array or has a chats property
      const chatsArray = Array.isArray(data) ? data : (data.chats || []);
      console.log("Chats array before transformation:", chatsArray);
      
      // Transform the data to match our expected structure
      const transformedChats = chatsArray.map((chat: any) => {
        console.log("Processing chat:", chat);
        return {
          id: chat.id,
          created_at: chat.created_at || new Date().toISOString(),
          updated_at: chat.updated_at || new Date().toISOString(),
          other_user: chat.opposed_user || { 
            id: chat.opposed_user_id,
            username: chat.opposed_username || 'Unknown User',
            profile_photo_url: null
          },
          last_message: chat.last_message ? {
            content: chat.last_message.body || chat.last_message.content || '',
            created_at: chat.last_message.created_at || new Date().toISOString()
          } : null
        };
      });
      
      console.log("Transformed chats:", transformedChats);
      return transformedChats;
    } catch (error) {
      console.error("Error in getChats:", error);
      throw error;
    }
  },

  // Get a specific chat with messages
  getChat: async (chatId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch chat (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch chat: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Raw chat data from API:", data);
      
      // Extract chat and messages from the response
      const chatData = data.chat || {};
      const messages = data.messages || [];
      
      console.log("Extracted chat data:", chatData);
      console.log("Extracted messages:", messages);
      
      // Transform the data to match our expected structure
      const transformedChat = {
        id: chatData.id || chatId,
        created_at: chatData.created_at || new Date().toISOString(),
        updated_at: chatData.updated_at || new Date().toISOString(),
        other_user: chatData.opposed_user || data.other_user || { username: 'Unknown User' },
        messages: messages.map((msg: any) => {
          console.log("Processing message:", msg);
          return {
            id: msg.id,
            content: msg.body || msg.content || '',
            body: msg.body || msg.content || '',
            user_id: msg.user_id || '',
            chat_id: chatData.id || chatId,
            created_at: msg.created_at || new Date().toISOString(),
            user: {
              id: msg.user_id || '',
              username: msg.is_mine ? 'You' : (chatData.opposed_user?.username || 'Unknown User')
            }
          };
        })
      };
      
      console.log("Transformed chat:", transformedChat);
      return transformedChat;
    } catch (error) {
      console.error("Error in getChat:", error);
      throw error;
    }
  },

  // Create a new chat with a user
  createChat: async (userId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create chat');
    }
    
    return response.json();
  },

  // Send a message in a chat
  sendChatMessage: async (chatId: string, content: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');
    
    try {
      // Get the current user's ID from the token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.user_id;

      // Create a message object
      const messageData = {
        command: 'message',
        chat_id: chatId,
        message: {
          body: content,
          user_id: userId
        }
      };

      console.log('Sending message data:', messageData);

      // Try sending through Action Cable first
      const consumer = getConsumer(token);
      const channel = consumer.subscriptions.create(
        {
          channel: 'ChatChannel',
          chat_id: chatId
        },
        {
          connected() {
            console.log('Connected to chat channel for sending message');
            this.send(messageData);
          },
          received(data: any) {
            console.log('Received response after sending:', data);
          }
        }
      );

      // Create an optimistic response
      const optimisticResponse = {
        id: `temp-${Date.now()}`,
        body: content,
        content: content,
        user_id: userId,
        chat_id: chatId,
        created_at: new Date().toISOString(),
        is_mine: true
      };

      // Return the optimistic response immediately
      return optimisticResponse;

    } catch (error) {
      console.error("Error in sendChatMessage:", error);
      // Still return an optimistic response even if there's an error
      return {
        id: `temp-${Date.now()}`,
        body: content,
        content: content,
        user_id: JSON.parse(atob(token.split('.')[1])).user_id,
        chat_id: chatId,
        created_at: new Date().toISOString(),
        is_mine: true
      };
    }
  },
}; 