import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageSquare, Users, Send, Paperclip, Smile, MoreVertical, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useMessaging } from '@/contexts/MessagingContext';
import { NewConversation } from './components/NewConversation';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const getStoredAuthUser = (): { id?: string; _id?: string; email?: string; role?: string } | null => {
  const raw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function Messaging() {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const user = getStoredAuthUser();
  const userId = user?.id || user?._id;
  const navigate = useNavigate();
  
  const {
    conversations,
    selectedConversation,
    messages,
    isLoading,
    error,
    selectConversation,
    sendMessage,
    refreshConversations,
  } = useMessaging();

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await sendMessage(newMessage);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    selectConversation(conversationId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get other participants in a conversation (excluding current user)
  const getOtherParticipants = useCallback((conversation: any) => {
    if (!conversation?.participants) return [];
    if (conversation.isGroup) {
      return conversation.participants;
    }
    // For 1:1 chats, return the other participant (not the current user)
    return conversation.participants.filter((p: any) => p._id !== userId);
  }, [userId]);

  // Get conversation title
  const getConversationTitle = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      return conversation.groupName || conversation.participants.map((p: any) => p.name).join(', ');
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.name || 'Unknown User';
  }, [getOtherParticipants]);

  // Get conversation avatar URL
  const getAvatarUrl = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      return conversation.groupPhoto || '';
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.avatar || '';
  }, [getOtherParticipants]);

  // Get fallback text for avatar
  const getAvatarFallback = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      return conversation.groupName 
        ? conversation.groupName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        : 'G';
    }
    const otherParticipants = getOtherParticipants(conversation);
    return otherParticipants[0]?.name?.charAt(0).toUpperCase() || 'U';
  }, [getOtherParticipants]);

  if (isLoading && !selectedConversation) {
    return (
      <div className="flex h-[calc(100vh-64px)] bg-white dark:bg-gray-900">
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Select a conversation to start messaging</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white dark:bg-gray-900">
      {/* New Conversation Dialog */}
      <NewConversation 
        open={isNewConversationOpen} 
        onOpenChange={setIsNewConversationOpen} 
      />
      
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={() => setIsNewConversationOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search conversations..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {conversations.filter(conv => {
              if (!searchQuery) return true;
              const searchLower = searchQuery.toLowerCase();
              const title = getConversationTitle(conv).toLowerCase();
              const lastMessage = conv.lastMessage?.content?.toLowerCase() || '';
              return title.includes(searchLower) || lastMessage.includes(searchLower);
            }).map((conversation) => (
              <div
                key={conversation._id}
                className={`p-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${
                  selectedConversation?._id === conversation._id ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
                onClick={() => handleSelectConversation(conversation._id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getAvatarUrl(conversation)} />
                    <AvatarFallback>{getAvatarFallback(conversation)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium truncate">{getConversationTitle(conversation)}</h3>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conversation.updatedAt), 'p')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {conversation.lastMessage.sender._id === userId ? 'You: ' : ''}
                          {conversation.lastMessage.content || 'Sent an attachment'}
                        </p>
                      )}
                      {conversation.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {conversations.length === 0 && !isLoading && (
              <div className="p-4 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                <p>No conversations yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setIsNewConversationOpen(true)}
                >
                  Start a new conversation
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getAvatarUrl(selectedConversation)} />
                  <AvatarFallback>{getAvatarFallback(selectedConversation)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{getConversationTitle(selectedConversation)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.isGroup
                      ? `${selectedConversation.participants.length} participants`
                      : 'Online'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>No messages yet. Send a message to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${
                        message.sender._id === userId ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.sender._id !== userId && (
                        <div className="flex-shrink-0 mr-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender.avatar} />
                            <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <div className="max-w-[70%]">
                        {message.sender._id !== userId && !selectedConversation.isGroup && (
                          <span className="text-xs text-muted-foreground block mb-1">
                            {message.sender.name}
                          </span>
                        )}
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            message.sender._id === userId
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          <div className="flex items-center justify-end mt-1 space-x-1">
                            <span className="text-xs opacity-70">
                              {format(new Date(message.createdAt), 'p')}
                            </span>
                            {message.sender._id === userId && (
                              <span className="text-xs">
                                {message.readBy && message.readBy.length > 1 ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="text-muted-foreground"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  className="flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No conversation selected</h3>
            <p className="text-muted-foreground mb-6">
              Select a conversation or start a new one
            </p>
            <Button onClick={() => setIsNewConversationOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              New message
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
