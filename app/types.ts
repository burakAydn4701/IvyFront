export interface User {
  id: string;
  username: string;
  profile_photo_url?: string;
}

export interface Message {
  id: string;
  content: string;
  body?: string;
  user_id: string;
  chat_id: string;
  created_at: string;
  user: User;
}

export interface Chat {
  id: string;
  created_at: string;
  updated_at: string;
  last_message?: {
    content: string;
    created_at: string;
  };
  other_user?: User;
  messages?: Message[];
}

export interface WebSocketMessage {
  id: string;
  content: string;
  user_id?: string;
  sender_id?: string;
  chat_id?: string;
  created_at: string;
  user?: User;
  sender?: User;
}

export interface ChatMessageData {
  message: WebSocketMessage;
} 