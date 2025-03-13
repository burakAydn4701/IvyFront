import { useEffect, useState, useRef } from 'react';
import { getConsumer } from '@/utils/cable';
import { api } from '@/lib/api';
import type { User, Message } from '@/types';

interface ChatDetailProps {
  chatId: string;
  currentUser: User;
  otherUser: User;
}

// Define a custom interface for the subscription
interface ChatSubscription {
  identifier: string;
  pingInterval?: NodeJS.Timeout;
  perform: (action: string, data: Record<string, unknown>) => void;
  sendMessage: (message: string) => void;
  markAsRead: () => void;
  unsubscribe: () => void;
}

type WebSocketMessage = {
  type?: string;
  message?: {
    body?: string;
    id?: string;
    user_id?: string;
    created_at?: string;
    user?: {
      id: string;
      username: string;
    };
  };
  body?: string;
  content?: string;
  id?: string;
  user_id?: string;
  sender_id?: string;
  chat_id?: string;
  created_at?: string;
  is_mine?: boolean;
  user?: {
    id: string;
    username: string;
  };
} | string;  // Allow string type for raw message format

export default function ChatDetail({ chatId, currentUser, otherUser }: ChatDetailProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [subscription, setSubscription] = useState<ChatSubscription | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  // Add useEffect to monitor connection status changes
  useEffect(() => {
    console.log('Connection status changed:', isConnected);
  }, [isConnected]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    console.log(`Setting up chat detail for chat ${chatId} with ${otherUser.username}`);
    
    // Fetch messages
    const fetchMessages = async () => {
      try {
        const chatData = await api.getChat(chatId);
        console.log("Fetched chat data:", chatData);
        if (chatData.messages) {
          setMessages(chatData.messages);
          scrollToBottom();
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();

    // Set up Action Cable subscription
    console.log('Setting up WebSocket connection for chat:', chatId);
    
    const setupChatSubscription = () => {
      const consumer = getConsumer();
      
      if (!consumer) {
        console.error('Failed to get WebSocket consumer');
        return null;
      }
      
      // Create a new subscription for this chat with type casting
      const sub = consumer.subscriptions.create(
        {
          channel: 'ChatChannel',
          chat_id: chatId
        },
        {
          connected() {
            console.log(`Connected to chat ${chatId} via WebSocket`);
            setIsConnected(true);
            
            // Set up client-side ping every 4 minutes (slightly less than server's 5 minutes)
            (this as ChatSubscription).pingInterval = setInterval(() => {
              console.log('Sending ping to keep connection alive');
              (this as ChatSubscription).perform('receive', { type: 'ping' });
            }, 4 * 60 * 1000);
          },
          
          disconnected() {
            console.log(`Disconnected from chat ${chatId}`);
            setIsConnected(false);
            if ((this as ChatSubscription).pingInterval) {
              clearInterval((this as ChatSubscription).pingInterval);
            }
            
            // Try to reconnect after a short delay
            setTimeout(() => {
              console.log('Attempting to reconnect WebSocket...');
              const newSub = setupChatSubscription();
              if (newSub) {
                setSubscription(newSub as ChatSubscription);
              }
            }, 3000);
          },
          
          received(data: WebSocketMessage) {
            console.log('Received WebSocket message:', data);
            
            // Skip empty messages
            if (!data) {
              console.log('Received empty message, ignoring');
              return;
            }
            
            // Handle different message types
            if (typeof data === 'object' && 'type' in data && 
                (data.type === 'ping' || data.type === 'pong' || data.type === 'connected')) {
              console.log(`Connection status: ${data.type}`);
              return;
            }
            
            // Extract message content and metadata
            let messageContent = '';
            let userId = '';
            let messageId = '';
            let createdAt = new Date().toISOString();
            
            if (typeof data === 'string') {
              try {
                // Try to parse as JSON
                const parsedData = JSON.parse(data);
                messageContent = parsedData.body || '';
                userId = parsedData.user?.id || '';
                messageId = parsedData.id || `ws-${Date.now()}`;
                createdAt = parsedData.created_at || createdAt;
              } catch (e) {
                // If not valid JSON, use as is
                messageContent = data;
                userId = currentUser.id; // Default to current user
                messageId = `ws-${Date.now()}`;
              }
            } else if (typeof data === 'object') {
              // Direct object format from Rails backend
              messageContent = data.body || '';
              userId = data.user?.id || '';
              messageId = data.id || `ws-${Date.now()}`;
              createdAt = data.created_at || createdAt;
            }
            
            if (!messageContent) {
              console.log('No message content found, ignoring:', data);
              return;
            }
            
            console.log('Extracted message data:', { 
              content: messageContent, 
              userId, 
              messageId, 
              createdAt 
            });
            
            // Format the message to match our Message type
            const messageObj: Message = {
              id: messageId,
              content: messageContent,
              body: messageContent,
              user_id: userId,
              chat_id: chatId,
              created_at: createdAt,
              user: {
                id: userId,
                username: userId === currentUser.id ? currentUser.username : otherUser.username
              }
            };
            
            console.log('Formatted message object:', messageObj);
            
            // IMPORTANT: Use a callback function to get the latest messages state
            setMessages(prevMessages => {
              // Check if we already have this message (by ID)
              const messageExists = prevMessages.some(m => m.id === messageObj.id);
              
              if (!messageExists) {
                console.log('Adding new message to state');
                // Create a new array with the new message
                const newMessages = [...prevMessages, messageObj];
                // Schedule scrolling after state update
                setTimeout(scrollToBottom, 50);
                return newMessages;
              } else {
                console.log('Message already exists, not adding');
                return prevMessages;
              }
            });
          },
          
          // Send a message
          sendMessage(message: string) {
            console.log(`Sending message to chat ${chatId}: ${message}`);
            
            try {
              // First try with the simplified format
              (this as ChatSubscription).perform('receive', { 
                message: message  // Simplified to match backend expectation
              });
              console.log('Message sent via WebSocket');
            } catch (error) {
              console.error('Error sending message via WebSocket:', error);
              // Fall back to API if WebSocket fails
              api.sendChatMessage(chatId, message)
                .then(response => console.log('Message sent via API fallback:', response))
                .catch(err => console.error('API fallback also failed:', err));
            }
          },
          
          // Mark messages as read
          markAsRead() {
            console.log(`Marking chat ${chatId} as read`);
            (this as ChatSubscription).perform('mark_as_read', {});
          }
        }
      ) as unknown as ChatSubscription;
      
      return sub;
    };
    
    const sub = setupChatSubscription();
    if (sub) {
      setSubscription(sub);
    }
    
    // Cleanup function
    return () => {
      console.log(`Cleaning up chat ${chatId} subscription`);
      if (subscription) {
        console.log('Unsubscribing from chat channel');
        if (subscription.pingInterval) {
          clearInterval(subscription.pingInterval);
        }
        subscription.unsubscribe();
        setSubscription(null);
      }
    };
  }, [chatId, currentUser.id, otherUser.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Only scroll if there are messages
    if (messages.length > 0) {
      // Use requestAnimationFrame to ensure we scroll after the render is complete
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    console.log('Attempting to send message:', newMessage);
    console.log('Current connection status:', isConnected);

    try {
      // Create optimistic message with a temporary ID
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        content: newMessage,
        body: newMessage,
        user_id: currentUser.id,
        chat_id: chatId,
        created_at: new Date().toISOString(),
        user: {
          id: currentUser.id,
          username: currentUser.username
        }
      };

      console.log('Created optimistic message:', tempMessage);

      // Add optimistic message to UI immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Clear input immediately for better UX
      const messageCopy = newMessage.trim();
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(scrollToBottom, 50);

      // Send message to the server
      console.log('Sending message to server...');
      
      if (subscription) {
        // Use the WebSocket subscription if available
        console.log('Using WebSocket to send message');
        subscription.sendMessage(messageCopy);
      } else {
        // Fall back to the API method
        console.log('WebSocket not available, using API fallback');
        const response = await api.sendChatMessage(chatId, messageCopy);
        console.log('API response:', response);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // The optimistic message remains in the UI even if there's an error
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="p-3 border-b border-gray-200 flex items-center">
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-green-500 mr-3">
          {otherUser.profile_photo_url ? (
            <img
              src={otherUser.profile_photo_url}
              alt={otherUser.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-xs font-bold">
                {otherUser.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <h2 className="text-lg font-semibold text-black">{otherUser.username}</h2>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth" style={{ height: 'calc(100vh - 180px)' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 ${
              message.user_id === currentUser.id ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-2 rounded-lg relative ${
                message.user_id === currentUser.id
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p>{message.content && message.content.includes('"body"=>') 
                ? message.content.match(/"body"=>"([^"]*)"/)![1] 
                : (message.content || message.body)}</p>
              <small className={`text-xs ${
                message.user_id === currentUser.id
                  ? 'opacity-70'
                  : 'text-gray-600'
              }`}>
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </small>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSubmit} className="p-4 border-t text-black">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-black font-bold rounded border-2 border-black hover:bg-green-600"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 