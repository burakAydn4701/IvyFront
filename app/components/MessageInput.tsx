'use client';
import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

export default function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 bg-white">
      <div className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-black font-medium"
          style={{ color: '#000000' }}
        />
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-4 rounded-r-lg border-2 border-black text-sm"
          style={{ color: '#000000' }}
          disabled={!message.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
} 