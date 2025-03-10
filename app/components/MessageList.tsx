'use client';
import React, { useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { useState } from 'react';

type User = {
  id: string;
  username: string;
  profile_photo_url?: string;
};

type Message = {
  id: string;
  content: string;
  body?: string;
  user_id: string;
  chat_id: string;
  created_at: string;
  user: User;
};

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    // ... existing code ...
  }, [messages]);

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="flex-1 p-3 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-black font-medium">
          <span style={{ color: '#000000' }}>No messages yet. Start the conversation!</span>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(message => {
            const isCurrentUser = message.user_id === currentUserId;
            
            return (
              <div 
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isCurrentUser ? 'bg-green-500 text-white' : 'bg-gray-200 text-black'} rounded-lg px-3 py-1.5`}>
                  <div className={`text-sm ${isCurrentUser ? 'text-white font-medium' : 'text-black font-medium'}`} style={{ color: isCurrentUser ? '#ffffff' : '#000000' }}>
                    {message.content || message.body}
                  </div>
                  <div className={`text-xs mt-0.5 ${isCurrentUser ? 'text-green-100' : 'text-gray-700'}`}>
                    {formatMessageTime(message.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
} 