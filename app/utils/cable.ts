import { createConsumer, Consumer } from '@rails/actioncable';

// Define custom interface to extend Consumer with connection properties
interface ExtendedConsumer extends Consumer {
  connection: {
    isOpen: () => boolean;
    send: (data: any) => void;
    onopen: () => void;
    onclose: (event: { code: number; reason: string }) => void;
    onerror: (error: Error) => void;
  };
}

let consumer: ExtendedConsumer | null = null;

export const getConsumer = (): ExtendedConsumer | null => {
  if (!consumer) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.error('No auth token found for WebSocket connection');
      return null;
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'localhost:3000';
    const wsUrl = baseUrl.includes('localhost')
      ? `ws://localhost:3000/cable?token=${token}`
      : `wss://ivyruby-production.up.railway.app/cable?token=${token}`;
    
    console.log('Connecting to WebSocket URL:', wsUrl);
    
    consumer = createConsumer(wsUrl) as ExtendedConsumer;
    
    // Add reconnection handling
    consumer.connection.onclose = () => {
      console.log('WebSocket connection closed, attempting to reconnect...');
      setTimeout(() => {
        consumer = null;
        getConsumer();
      }, 3000);
    };
  }
  return consumer;
};

// Export other functions and interfaces
export interface WebSocketMessage {
  id: string;
  content: string;
  user_id?: string;
  sender_id?: string;
  chat_id?: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    profile_photo_url?: string;
  };
  sender?: {
    id: string;
    username: string;
    profile_photo_url?: string;
  };
}

export interface MessageData {
  message: WebSocketMessage;
}

export interface ChatMessageData {
  message: WebSocketMessage;
}

export const disconnectConsumer = () => {
  if (consumer) {
    console.log('Manually disconnecting WebSocket consumer');
    consumer.disconnect();
    consumer = null;
  }
}; 