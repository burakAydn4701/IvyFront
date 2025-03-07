import { useEffect, useState, useRef } from 'react';
import { getConsumer } from '@/utils/cable';
import { api } from '@/lib/api';
import type { User, Message } from '@/types';

interface ChatDetailProps {
  chatId: string;
  currentUser: User;
  otherUser: User;
}

export default function ChatDetail({ chatId, currentUser, otherUser }: ChatDetailProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const consumer = getConsumer(token);
    const sub = consumer.subscriptions.create(
      {
        channel: 'ChatChannel',
        chat_id: chatId
      },
      {
        connected() {
          console.log(`Connected to chat ${chatId}`);
        },
        disconnected() {
          console.log(`Disconnected from chat ${chatId}`);
        },
        received(data: any) {
          console.log('Received message:', data);
          
          // Format the message to match our Message type
          const messageObj: Message = {
            id: data.id || data.message?.id,
            content: data.message?.body || data.body || data.content || '',
            body: data.message?.body || data.body || data.content || '',
            user_id: data.message?.user_id || data.user_id || data.sender_id || '',
            chat_id: chatId,
            created_at: data.message?.created_at || data.created_at || new Date().toISOString(),
            user: {
              id: data.message?.user_id || data.user_id || data.sender_id || '',
              username: (data.message?.user_id || data.user_id) === currentUser.id ? 'You' : otherUser.username
            }
          };

          console.log('Formatted message object:', messageObj);
          
          setMessages(prevMessages => {
            // Check if message already exists
            const exists = prevMessages.some(msg => msg.id === messageObj.id);
            if (exists) {
              console.log('Message already exists, not adding:', messageObj.id);
              return prevMessages;
            }
            console.log('Adding new message:', messageObj);
            return [...prevMessages, messageObj];
          });
          scrollToBottom();
        }
      }
    );

    setSubscription(sub);

    // Cleanup subscription on unmount
    return () => {
      if (sub) {
        sub.unsubscribe();
      }
    };
  }, [chatId, currentUser.id, otherUser.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

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
          username: 'You'
        }
      };

      // Add optimistic message to UI
      setMessages(prev => [...prev, tempMessage]);
      scrollToBottom();

      // Send message to the server
      const response = await api.sendChatMessage(chatId, newMessage);
      console.log("Message sent response:", response);

      // Update the temporary message with the real one if we got a response
      if (response && response.id) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? {
                  ...msg,
                  id: response.id,
                  content: response.body || newMessage,
                  body: response.body || newMessage,
                  created_at: response.created_at || msg.created_at
                }
              : msg
          )
        );
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
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 ${
              message.user_id === currentUser.id ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-2 rounded-lg ${
                message.user_id === currentUser.id
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p>{message.content || message.body}</p>
              <small className={`text-xs ${
                message.user_id === currentUser.id
                  ? 'opacity-75'
                  : 'text-gray-600'
              }`}>
                {new Date(message.created_at).toLocaleTimeString()}
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