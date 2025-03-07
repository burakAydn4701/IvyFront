'use client';
import React, { useState } from 'react';
import { format } from 'date-fns';
import { api } from '../lib/api';

type User = {
  id: string;
  username: string;
  profile_photo_url?: string;
};

type Chat = {
  id: string;
  created_at: string;
  updated_at: string;
  last_message?: {
    content: string;
    created_at: string;
  };
  other_user?: User;
};

interface ChatListProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  currentUser: User | null;
}

export default function ChatList({ chats, selectedChat, onSelectChat, currentUser }: ChatListProps) {
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const users = await api.getUsers();
      // Filter users that are not the current user and match the search term
      const filteredUsers = users.filter((user: User) => 
        user.id !== currentUser?.id && 
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const startNewChat = async (userId: string) => {
    try {
      const newChat = await api.createChat(userId);
      onSelectChat(newChat);
      setShowNewChatModal(false);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const formatLastMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-base font-bold text-gray-800">Messages</h2>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="mt-2 w-full bg-green-500 hover:bg-green-600 text-black font-bold py-1.5 px-3 rounded border-2 border-black text-sm"
        >
          New Message
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-3 text-gray-500 text-center text-sm">
            No conversations yet. Start a new message!
          </div>
        ) : (
          <ul>
            {chats.map(chat => (
              <li 
                key={chat.id}
                className={`p-2 flex items-center cursor-pointer hover:bg-gray-100 ${
                  selectedChat?.id === chat.id ? 'bg-gray-100' : ''
                }`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-green-500 mr-2">
                  {chat.other_user?.profile_photo_url ? (
                    <img
                      src={chat.other_user.profile_photo_url}
                      alt={chat.other_user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-xs font-bold">
                        {chat.other_user?.username?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium text-gray-800 truncate text-sm">{chat.other_user?.username || 'Unknown User'}</h3>
                    {chat.last_message && (
                      <span className="text-xs text-gray-500">
                        {formatLastMessageTime(chat.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  {chat.last_message && (
                    <p className="text-xs text-gray-500 truncate">{chat.last_message.content}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-80 max-w-full">
            <h3 className="text-lg font-bold mb-3">New Message</h3>
            <div className="mb-3">
              <div className="flex">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for a user..."
                  className="flex-1 border border-gray-300 rounded-l-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleSearch}
                  className="bg-green-500 hover:bg-green-600 text-black font-bold py-1.5 px-3 rounded-r-lg border-2 border-black text-sm"
                  disabled={isSearching || !searchTerm.trim()}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto mb-3">
              {searchResults.length === 0 ? (
                <p className="text-gray-500 text-center text-sm">
                  {searchTerm.trim() ? 'No users found' : 'Type to search for users'}
                </p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {searchResults.map(user => (
                    <li 
                      key={user.id}
                      className="py-2 flex items-center cursor-pointer hover:bg-gray-100"
                      onClick={() => startNewChat(user.id)}
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-green-500 mr-2">
                        {user.profile_photo_url ? (
                          <img
                            src={user.profile_photo_url}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-xs font-bold">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-sm">{user.username}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-1.5 px-3 rounded border-2 border-black text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 