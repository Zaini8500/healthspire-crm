const API_BASE = 'http://localhost:5000';

export interface Message {
  _id: string;
  conversationId: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  readBy: string[];
  attachments: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
  lastMessage?: Message;
  isGroup: boolean;
  updatedAt: string;
}

export const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const fetchConversations = async (): Promise<Conversation[]> => {
  const response = await fetch(`${API_BASE}/api/messages/conversations`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }
  
  return response.json();
};

export const createConversation = async (participantIds: string[]): Promise<Conversation> => {
  const response = await fetch(`${API_BASE}/api/messages/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ participantIds }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create conversation');
  }
  
  return response.json();
};

export const fetchMessages = async (
  conversationId: string, 
  before?: string, 
  limit: number = 50
): Promise<Message[]> => {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  params.set('limit', limit.toString());
  
  const response = await fetch(
    `${API_BASE}/api/messages/conversations/${conversationId}/messages?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  
  return response.json();
};

export const sendMessage = async (
  conversationId: string, 
  content: string,
  attachments: any[] = []
): Promise<Message> => {
  const response = await fetch(`${API_BASE}/api/messages/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      conversationId,
      content,
      attachments,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to send message');
  }
  
  return response.json();
};

export const markMessagesAsRead = async (messageIds: string[]): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/messages/messages/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageIds }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark messages as read');
  }
  
  return response.json();
};

export const uploadAttachment = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeaders().Authorization,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to upload attachment');
  }
  
  return response.json();
};
