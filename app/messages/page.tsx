'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../lib/api';
import ChatList from '../components/ChatList';
import ChatDetail from '../components/ChatDetail';
import type { User, Chat } from '../types';

// Create a separate component that uses useSearchParams
function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatIdParam = searchParams.get('chatId');
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(null);
        
        // Fetch current user
        const userData = await api.getCurrentUser();
        setCurrentUser(userData);

        // Fetch all chats
        const chatsData = await api.getChats();
        console.log("Chats data received:", chatsData);
        setChats(chatsData);
        
        // If chatId is provided in URL, find and select that chat
        if (chatIdParam) {
          // First try to find the chat in the list
          const chatToSelect = chatsData.find((chat: Chat) => chat.id === chatIdParam);
          
          if (chatToSelect) {
            setSelectedChat(chatToSelect);
          } else {
            // If not in the list, fetch it directly
            try {
              const chatData = await api.getChat(chatIdParam);
              
              if (chatData && chatData.id) {
                setSelectedChat(chatData);
                
                // Add this chat to the list if it's not already there
                if (!chatsData.some((c: Chat) => c.id === chatData.id)) {
                  setChats(prevChats => [...prevChats, chatData]);
                }
              } else {
                throw new Error('Invalid chat data received');
              }
            } catch (error) {
              console.error(`Failed to fetch chat with ID ${chatIdParam}:`, error);
              setError(`Failed to load the requested chat. Please try again or select another conversation.`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load messages. Please refresh the page to try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router, chatIdParam]);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setError(null);
    
    // Update URL with the selected chat ID without reloading the page
    const url = new URL(window.location.href);
    url.searchParams.set('chatId', chat.id);
    window.history.pushState({}, '', url);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!currentUser) {
    return <div className="container mx-auto p-4">Please log in to continue.</div>;
  }

  return (
    <div className="pl-[25%] pr-[10%] pt-4 pb-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Messages</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="flex h-[calc(100vh-12rem)] bg-white shadow-md rounded-lg overflow-hidden">
        {/* Chat list sidebar */}
        <div className="w-1/4 border-r border-gray-200">
          <ChatList 
            chats={chats} 
            selectedChat={selectedChat} 
            onSelectChat={handleSelectChat}
            currentUser={currentUser}
          />
        </div>
        
        {/* Chat area */}
        <div className="w-3/4 flex flex-col">
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

// Main component that wraps MessagesContent in a Suspense boundary
export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-4">Loading messages...</div>}>
      <MessagesContent />
    </Suspense>
  );
} 