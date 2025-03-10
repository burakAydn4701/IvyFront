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
  perform: (action: string, data: any) => void;
  sendMessage: (message: string) => void;
  markAsRead: () => void;
  unsubscribe: () => void;
}

export default function ChatDetail({ chatId, currentUser, otherUser }: ChatDetailProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [subscription, setSubscription] = useState<ChatSubscription | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto',  // Changed from 'smooth' to 'auto' to prevent flickering
          block: 'end'       // Ensures we scroll to the end
        });
      }
    }, 50); // Reduced delay to make it more responsive
  };

  useEffect(() => {
    // Initial messages load
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
            
            // Set up client-side ping every 4 minutes (slightly less than server's 5 minutes)
            (this as any).pingInterval = setInterval(() => {
              console.log('Sending ping to keep connection alive');
              (this as any).perform('receive', { type: 'ping' });
            }, 4 * 60 * 1000);
          },
          
          disconnected() {
            console.log(`Disconnected from chat ${chatId}`);
            if ((this as any).pingInterval) {
              clearInterval((this as any).pingInterval);
            }
          },
          
          received(data: any) {
            console.log('Received WebSocket message:', data);
            
            // Handle different message types
            if (data.type === 'ping' || data.type === 'pong' || data.type === 'connected') {
              console.log(`Connection status: ${data.message || data.type}`);
              return;
            }
            
            // Check if this is a message or some other type of data
            if (!data || (!data.message && !data.body && !data.content)) {
              console.log('Received non-message data, ignoring:', data);
              return;
            }
            
            // Extract the actual message content
            let messageContent = '';
            
            // Handle Ruby-style hash format: {"body"=>"message text"}
            if (typeof data === 'string' && data.includes('"body"=>')) {
              const match = data.match(/"body"=>"([^"]*)"/);
              if (match && match[1]) {
                messageContent = match[1];
              }
            } else if (typeof data.message === 'string' && data.message.includes('"body"=>')) {
              const match = data.message.match(/"body"=>"([^"]*)"/);
              if (match && match[1]) {
                messageContent = match[1];
              }
            } else {
              // Regular format
              messageContent = data.message?.body || data.body || data.content || '';
            }
            
            // Format the message to match our Message type
            const messageObj: Message = {
              id: data.id || data.message?.id || `ws-${Date.now()}`,
              content: messageContent,
              body: messageContent,
              user_id: data.message?.user_id || data.user_id || data.sender_id || '',
              chat_id: chatId,
              created_at: data.message?.created_at || data.created_at || new Date().toISOString(),
              user: {
                id: data.message?.user_id || data.user_id || data.sender_id || '',
                username: (data.message?.user_id || data.user_id || data.sender_id) === currentUser.id 
                  ? currentUser.username 
                  : otherUser.username
              }
            };

            console.log('Formatted WebSocket message:', messageObj);
            
            // Check if this is our own message that we already added optimistically
            setMessages(prevMessages => {
              // First check if we already have this exact message ID
              const exactMatch = prevMessages.some(msg => msg.id === messageObj.id);
              if (exactMatch) {
                console.log('Message with exact ID already exists, not adding:', messageObj.id);
                return prevMessages;
              }
              
              // Then check for a temporary message with the same content and user
              const tempMatch = prevMessages.find(msg => 
                msg.id.startsWith('temp-') && 
                msg.user_id === messageObj.user_id && 
                (msg.content === messageObj.content || msg.body === messageObj.body)
              );
              
              if (tempMatch) {
                console.log('Found matching temp message, replacing:', tempMatch.id, 'with', messageObj.id);
                return prevMessages.map(msg => 
                  msg.id === tempMatch.id ? messageObj : msg
                );
              }
              
              // If no match found, add as a new message
              console.log('Adding new message from WebSocket:', messageObj);
              return [...prevMessages, messageObj];
            });
            
            scrollToBottom();
          },
          
          // Send a message
          sendMessage(message: string) {
            console.log('Sending message via WebSocket:', message);
            (this as any).perform('receive', { 
              command: 'message',
              chat_id: chatId,
              message: {
                body: message
              }
            });
          },
          
          // Mark messages as read
          markAsRead() {
            (this as any).perform('mark_as_read');
          }
        }
      ) as unknown as ChatSubscription;
      
      return sub;
    };
    
    const subscription = setupChatSubscription();
    setSubscription(subscription);
    
    console.log('WebSocket subscription created for chat:', chatId);

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        console.log('Cleaning up WebSocket subscription for chat:', chatId);
        if (subscription.pingInterval) {
          clearInterval(subscription.pingInterval);
        }
        subscription.unsubscribe();
      }
    };
  }, [chatId, currentUser.id, otherUser.username, currentUser.username]);

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
      // Create optimistic message
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
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

      // Add optimistic message to UI
      setMessages(prev => [...prev, tempMessage]);
      scrollToBottom();

      // Send message to the server
      console.log('Sending message to server via WebSocket...');
      
      if (subscription) {
        // Use the subscription directly if available
        subscription.sendMessage(newMessage);
      } else {
        // Fall back to the API method if subscription is not available
        await api.sendChatMessage(chatId, newMessage);
      }

      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Keep the optimistic message in the UI even if there's an error
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