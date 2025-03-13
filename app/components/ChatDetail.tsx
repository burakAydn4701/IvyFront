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
            console.log('WebSocket connection status:', isConnected);
            
            // Set up client-side ping every 4 minutes (slightly less than server's 5 minutes)
            (this as ChatSubscription).pingInterval = setInterval(() => {
              console.log('Sending ping to keep connection alive');
              (this as ChatSubscription).perform('receive', { type: 'ping' });
            }, 4 * 60 * 1000);
          },
          
          disconnected() {
            console.log(`Disconnected from chat ${chatId}`);
            console.log('Previous connection status:', isConnected);
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
            console.log('Current connection status:', isConnected);
            console.log('Current messages count:', messages.length);
            
            // Handle different message types
            if (typeof data === 'object' && 'type' in data && 
                (data.type === 'ping' || data.type === 'pong' || data.type === 'connected')) {
              console.log(`Connection status: ${typeof data === 'object' && 'message' in data ? data.message : data.type}`);
              return;
            }
            
            // Check if this is a message or some other type of data
            if (!data || (typeof data === 'object' && 
                !('message' in data && data.message?.body) && 
                !('body' in data) && 
                !('content' in data))) {
              console.log('Received non-message data, ignoring:', data);
              return;
            }
            
            // Extract the actual message content
            let messageContent = '';
            
            // Handle different message formats
            if (typeof data === 'string') {
              // Handle Ruby-style hash format: {"body"=>"message text"}
              if (data.includes('"body"=>')) {
                const match = data.match(/"body"=>"([^"]*)"/);
                if (match && match[1]) {
                  messageContent = match[1];
                }
              } else {
                // Try to parse as JSON
                try {
                  const parsedData = JSON.parse(data);
                  messageContent = parsedData.message?.body || parsedData.body || parsedData.content || '';
                } catch (e) {
                  // If not valid JSON, use as is
                  messageContent = data;
                }
              }
            } else {
              // Regular object format
              messageContent = data.message?.body || data.body || data.content || '';
            }
            
            // Format the message to match our Message type
            const messageObj: Message = {
              id: typeof data === 'object' && 'id' in data ? (data.id || `ws-${Date.now()}`) : 
                  typeof data === 'object' && 'message' in data && data.message?.id ? (data.message.id || `ws-${Date.now()}`) : 
                  `ws-${Date.now()}`,
              content: messageContent,
              body: messageContent,
              user_id: typeof data === 'object' && 'user_id' in data ? (data.user_id || '') : 
                      typeof data === 'object' && 'message' in data && data.message?.user_id ? (data.message.user_id || '') : 
                      typeof data === 'object' && 'sender_id' in data ? (data.sender_id || '') : '',
              chat_id: chatId,
              created_at: typeof data === 'object' && 'created_at' in data ? (data.created_at || new Date().toISOString()) : 
                          typeof data === 'object' && 'message' in data && data.message?.created_at ? (data.message.created_at || new Date().toISOString()) : 
                          new Date().toISOString(),
              user: {
                id: typeof data === 'object' && 'user_id' in data ? (data.user_id || '') : 
                    typeof data === 'object' && 'message' in data && data.message?.user_id ? (data.message.user_id || '') : 
                    typeof data === 'object' && 'sender_id' in data ? (data.sender_id || '') : '',
                username: typeof data === 'object' && 
                          ((('user_id' in data && data.user_id === currentUser.id) || 
                            ('message' in data && data.message?.user_id === currentUser.id) || 
                            ('sender_id' in data && data.sender_id === currentUser.id))) 
                          ? currentUser.username 
                          : otherUser.username
              }
            };
            
            console.log('Formatted message object:', messageObj);
            
            // Check if we already have this message (by ID)
            const messageExists = messages.some(m => m.id === messageObj.id);
            
            if (!messageExists) {
              console.log('Adding new message to state:', messageObj);
              // Update state by appending the new message to the existing messages
              setMessages(prevMessages => [...prevMessages, messageObj]);
              scrollToBottom();
            } else {
              console.log('Message already exists, not adding:', messageObj.id);
            }
          },
          
          // Send a message
          sendMessage(message: string) {
            console.log(`Sending message to chat ${chatId}: ${message}`);
            
            try {
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
      
      if (subscription && isConnected) {
        // Use the WebSocket subscription if available and connected
        console.log('Using WebSocket to send message');
        subscription.sendMessage(messageCopy);
      } else {
        // Fall back to the API method
        console.log('WebSocket not connected, using API fallback');
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