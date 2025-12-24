import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageSquare, Users, Send, Paperclip, Smile, MoreVertical, Plus, Phone, Video, Info, Mic, Settings, Moon, Sun, Palette, Edit3, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useMessaging } from '@/contexts/MessagingContext';
import { NewConversation } from './components/NewConversation';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import EmojiPicker from 'emoji-picker-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { API_BASE, uploadAttachment, editMessage as apiEditMessage, deleteMessage as apiDeleteMessage } from '@/lib/api/messaging';

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const user = getStoredAuthUser();
  const userId = user?.id || user?._id;
  const role = user?.role || 'admin';
  const navigate = useNavigate();
  const location = useLocation();
  
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

  const conversationIdFromUrl = useMemo(() => {
    const sp = new URLSearchParams(location.search || '');
    const v = sp.get('conversationId');
    return v ? String(v) : '';
  }, [location.search]);

  useEffect(() => {
    if (!conversationIdFromUrl) return;
    const target = conversations.find((c) => c._id === conversationIdFromUrl);
    if (target && (!selectedConversation || selectedConversation._id !== target._id)) {
      selectConversation(target._id);
    }
  }, [conversationIdFromUrl, conversations, selectedConversation, selectConversation]);

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    try {
      const attachments: any[] = [];
      if (selectedFile) {
        const uploaded = await uploadAttachment(selectedFile);
        attachments.push({
          url: uploaded.url,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        });
      }

      await sendMessage(newMessage, attachments);
      setNewMessage('');
      setSelectedFile(null);
      setShowEmojiPicker(false);
      scrollToBottom();
    } catch (error) {
      // Fallback: some servers expect attachments as string[] and content required
      const msg = String((error as any)?.message || '');
      if (selectedFile && (msg.includes('Cast to [string]') || msg.toLowerCase().includes('content is required'))) {
        try {
          const attachmentsAsStrings: any[] = [];
          // Use the already uploaded file URL from previous attempt if possible
          // If upload failed earlier, try fresh upload now
          if (!attachmentsAsStrings.length) {
            const uploaded = await uploadAttachment(selectedFile);
            attachmentsAsStrings.push(uploaded.url);
          }
          await sendMessage(newMessage || ' ', attachmentsAsStrings);
          setNewMessage('');
          setSelectedFile(null);
          setShowEmojiPicker(false);
          scrollToBottom();
          return;
        } catch (e2: any) {
          toast({ title: 'Error', description: e2.message || 'Failed to send message', variant: 'destructive' });
          return;
        }
      }
      toast({ title: 'Error', description: msg || 'Failed to send message', variant: 'destructive' });
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast({
        title: 'File selected',
        description: `${file.name} attached`,
      });
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const handleStartEdit = (message: any) => {
    setEditingMessageId(message._id);
    setEditText(message.content || '');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId) return;
    try {
      const updated = await apiEditMessage(editingMessageId, editText);
      queryClient.setQueryData(['messages', selectedConversation?._id], (old: any) =>
        Array.isArray(old)
          ? old.map((m) => (m._id === updated._id ? updated : m))
          : old
      );
      setEditingMessageId(null);
      setEditText('');
      toast({ title: 'Message updated' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update message', variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await apiDeleteMessage(messageId);
      queryClient.setQueryData(['messages', selectedConversation?._id], (old: any) =>
        Array.isArray(old)
          ? old.map((m) => (m._id === messageId ? { ...m, isDeleted: true, content: '' } : m))
          : old
      );
      toast({ title: 'Message deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete message', variant: 'destructive' });
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
      <div className="flex h-screen bg-background">
        <div className="w-80 border-r bg-background flex flex-col">
          <div className="p-4 border-b">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-muted/50">
          <div className="text-center space-y-3">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Select a conversation to start messaging</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-destructive text-center space-y-2">
          <MessageSquare className="h-12 w-12 mx-auto" />
          <p>Failed to load messages</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* New Conversation Dialog */}
      {role !== 'client' ? (
        <NewConversation 
          open={isNewConversationOpen} 
          onOpenChange={setIsNewConversationOpen} 
        />
      ) : null}
      
      {/* Sidebar */}
      <div className="w-80 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            <div className="flex items-center gap-1">
              {/* Theme Toggle */}
              <DropdownMenu open={showThemeMenu} onOpenChange={setShowThemeMenu}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Settings className="mr-2 h-4 w-4" /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {role !== 'client' && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8"
                  onClick={() => setIsNewConversationOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search conversations..."
              className="w-full pl-10 h-10 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {conversations.filter(conv => {
              if (!searchQuery) return true;
              const searchLower = searchQuery.toLowerCase();
              const title = getConversationTitle(conv).toLowerCase();
              const lastMessage = conv.lastMessage?.content?.toLowerCase() || '';
              return title.includes(searchLower) || lastMessage.includes(searchLower);
            }).map((conversation) => (
              <div
                key={conversation._id}
                className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                  selectedConversation?._id === conversation._id ? 'bg-muted' : ''
                }`}
                onClick={() => handleSelectConversation(conversation._id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getAvatarUrl(conversation)} />
                      <AvatarFallback className="text-sm font-medium">{getAvatarFallback(conversation)}</AvatarFallback>
                    </Avatar>
                    {selectedConversation?._id === conversation._id && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-medium truncate text-sm">{getConversationTitle(conversation)}</h3>
                      <span className="text-xs text-muted-foreground ml-2">
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
                        <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {conversations.length === 0 && !isLoading && (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="mb-4">No conversations yet</p>
                {role !== 'client' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsNewConversationOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Start a new conversation
                  </Button>
                )}
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
            <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getAvatarUrl(selectedConversation)} />
                    <AvatarFallback className="text-sm font-medium">{getAvatarFallback(selectedConversation)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{getConversationTitle(selectedConversation)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.isGroup
                      ? `${selectedConversation.participants.length} participants`
                      : 'Active now'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsNewConversationOpen(true)}>
                      <Users className="mr-2 h-4 w-4" /> New group
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast({ title: 'Conversation settings', description: 'Coming soon' })}>
                      <Settings className="mr-2 h-4 w-4" /> Conversation settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>No messages yet. Send a message to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender._id === userId;
                    const canModify = isOwn || (Array.isArray(selectedConversation?.admins) && selectedConversation.admins?.includes?.(userId));
                    return (
                      <div
                        key={message._id}
                        className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isOwn && (
                          <div className="flex-shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender.avatar} />
                              <AvatarFallback>{message.sender.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                        <div className="max-w-[70%]">
                          {(!isOwn && selectedConversation.isGroup) && (
                            <span className="text-xs text-muted-foreground block mb-1">
                              {message.sender.name}
                            </span>
                          )}
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}
                          >
                            {message.isDeleted ? (
                              <p className={`italic text-xs ${isOwn ? 'text-primary-foreground/80' : 'text-foreground/70'}`}>Message deleted</p>
                            ) : editingMessageId === message._id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  placeholder="Edit message..."
                                  className={`${isOwn ? 'bg-primary/20 text-primary-foreground' : ''}`}
                                />
                                <Button size="sm" type="button" onClick={handleSaveEdit}>Save</Button>
                                <Button size="sm" type="button" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                            {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((att, idx) => {
                                  const rawUrl = typeof att === 'string' ? att : att.url;
                                  const url = rawUrl?.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl || ''}`;
                                  const label = typeof att === 'string'
                                    ? (rawUrl?.split('/').pop() || 'attachment')
                                    : (att.name || 'attachment');
                                  return (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`inline-flex items-center gap-2 text-xs underline ${isOwn ? 'text-primary-foreground/90' : 'text-foreground/80'}`}
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      <span className="truncate max-w-[220px]">{label}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              {canModify && !message.isDeleted && (
                                <div className="-ml-1">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
                                      <DropdownMenuItem onClick={() => handleStartEdit(message)}>
                                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDeleteMessage(message._id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs opacity-70">
                                  {format(new Date(message.createdAt), 'p')}
                                </span>
                                {isOwn && (
                                  <span className="text-xs">
                                    {message.readBy && message.readBy.length > 1 ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {isOwn && (
                          <div className="flex-shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender.avatar} />
                              <AvatarFallback>{message.sender.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t bg-background p-4">
              {selectedFile && (
                <div className="mb-3 p-2 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    ×
                  </Button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <EmojiPicker onEmojiClick={(emoji) => handleEmojiSelect(emoji)} />
                  </PopoverContent>
                </Popover>
                <Input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() && !selectedFile}>
                  <Send className="h-4 w-4" />
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
