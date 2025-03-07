import { createConsumer } from '@rails/actioncable';

let consumer: any = null;

export const getConsumer = (token: string) => {
  if (!consumer) {
    // Get the base URL from environment or use a default
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'localhost:3000';
    
    // Use the exact WebSocket URL format that matches the server configuration
    // For production: wss://ivyruby-production.up.railway.app/cable
    const wsUrl = baseUrl.includes('localhost') 
      ? `ws://localhost:3000/cable?token=${token}` 
      : `wss://ivyruby-production.up.railway.app/cable?token=${token}`;
    
    console.log("Connecting to WebSocket URL:", wsUrl);
    consumer = createConsumer(wsUrl);
    
    // Add event listeners for connection status
    const wsConnection = (consumer as any).connection.webSocket;
    if (wsConnection) {
      wsConnection.addEventListener('open', () => {
        console.log('WebSocket connection established');
      });
      
      wsConnection.addEventListener('close', (event: any) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      });
      
      wsConnection.addEventListener('error', (error: any) => {
        console.error('WebSocket error:', error);
      });
    }
  }
  return consumer;
};

// Define a more flexible message type for WebSocket data
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

export const subscribeToMessages = (
  currentUserId: string, 
  receiverId: string, 
  token: string, 
  onReceived: (data: MessageData) => void
) => {
  const consumer = getConsumer(token);
  
  return consumer.subscriptions.create(
    {
      channel: 'MessagesChannel',
      user_id: currentUserId,
      receiver_id: receiverId
    },
    {
      connected() {
        console.log(`Connected to messages with user ${receiverId}`);
      },
      disconnected() {
        console.log(`Disconnected from messages with user ${receiverId}`);
      },
      received(data: MessageData) {
        console.log('Received message:', data);
        onReceived(data);
      }
    }
  );
};

export const subscribeToChatChannel = (
  chatId: string,
  token: string,
  onReceived: (data: any) => void
) => {
  const consumer = getConsumer(token);
  
  console.log(`Subscribing to chat channel: chat_${chatId}`);
  
  return consumer.subscriptions.create(
    {
      channel: 'ChatChannel',
      id: chatId,
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
        console.log(`Received data on chat_${chatId}:`, data);
        onReceived(data);
      }
    }
  );
};

export const disconnectConsumer = () => {
  if (consumer) {
    consumer.disconnect();
    consumer = null;
  }
}; 