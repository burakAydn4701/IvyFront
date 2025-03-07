'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import ChatList from '../components/ChatList';
import ChatDetail from '../components/ChatDetail';
import type { User, Chat } from '../types';

export default function MessagesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user and chats
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const userData = await api.getCurrentUser();
        setCurrentUser(userData);

        const chatsData = await api.getChats();
        console.log("Chats data received:", chatsData);
        setChats(chatsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!currentUser) {
    return <div className="container mx-auto p-4">Please log in to continue.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Messages</h1>
      
      <div className="flex h-[500px] bg-white shadow-md rounded-lg overflow-hidden">
        {/* Chat list sidebar - fixed width */}
        <div className="w-56 border-r border-gray-200 flex-shrink-0">
          <ChatList 
            chats={chats} 
            selectedChat={selectedChat} 
            onSelectChat={handleSelectChat}
            currentUser={currentUser}
          />
        </div>
        
        {/* Chat area - flexible width but with max-width */}
        <div className="flex-1 flex flex-col overflow-hidden max-w-[calc(100%-14rem)]">
          {selectedChat && selectedChat.other_user && currentUser ? (
            <ChatDetail
              chatId={selectedChat.id}
              currentUser={currentUser}
              otherUser={selectedChat.other_user}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-black font-medium p-4">
              <span style={{ color: '#000000' }}>Select a conversation or start a new one</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 