import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  User,
  UserPlus,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useConversation,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useUpdateConversation,
  Message,
  Conversation,
} from '@/hooks/use-conversations';
import { useTeamMembers, type TeamMember } from '@/hooks/use-team-management';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageThreadProps {
  conversationId: string | null;
}

function MessageStatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-3 h-3 text-muted-foreground" />;
    case 'sent':
      return <Check className="w-3 h-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-primary" />;
    case 'failed':
      return <AlertCircle className="w-3 h-3 text-destructive" />;
    default:
      return null;
  }
}

function formatMessageTime(date: Date) {
  return format(date, 'HH:mm');
}

function formatDateHeader(date: Date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isOutbound
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOutbound ? 'justify-end' : 'justify-start'
          )}
        >
          <span
            className={cn(
              'text-xs',
              isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {formatMessageTime(new Date(message.sent_at))}
          </span>
          {isOutbound && <MessageStatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const [messageInput, setMessageInput] = useState('');
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: conversation, isLoading: isLoadingConversation } = useConversation(conversationId);
  const { data: messages, isLoading: isLoadingMessages } = useMessages(conversationId);
  const { data: teamMembers } = useTeamMembers();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const updateConversation = useUpdateConversation();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when viewing
  useEffect(() => {
    if (conversationId && conversation?.unread_count && conversation.unread_count > 0) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId, conversation?.unread_count]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversationId) return;

    try {
      await sendMessage.mutateAsync({
        conversationId,
        content: messageInput.trim(),
      });
      setMessageInput('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStatusChange = (status: Conversation['status']) => {
    if (!conversationId) return;
    updateConversation.mutate(
      { id: conversationId, status },
      {
        onSuccess: () => toast.success(`Conversation marked as ${status}`),
      }
    );
  };

  if (!conversationId) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">Select a conversation</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a conversation from the list to start chatting
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingConversation) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Conversation not found</p>
      </div>
    );
  }

  const contact = conversation.contact;

  // Group messages by date
  const messagesByDate: { date: Date; messages: Message[] }[] = [];
  messages?.forEach((message) => {
    const messageDate = new Date(message.sent_at);
    const lastGroup = messagesByDate[messagesByDate.length - 1];
    if (lastGroup && isSameDay(lastGroup.date, messageDate)) {
      lastGroup.messages.push(message);
    } else {
      messagesByDate.push({ date: messageDate, messages: [message] });
    }
  });

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact?.profile_picture_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {contact?.display_name?.[0] || contact?.phone_number?.slice(-2) || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">
              {contact?.display_name || contact?.phone_number || 'Unknown'}
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {conversation.status}
              </Badge>
              {contact?.phone_number && (
                <span className="text-xs text-muted-foreground">{contact.phone_number}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Video className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange('open')}>
                Mark as Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
                Mark as Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('resolved')}>
                Mark as Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('archived')}>
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoadingMessages ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                <Skeleton className="h-12 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : !messages?.length ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messagesByDate.map(({ date, messages: dateMessages }) => (
              <div key={date.toISOString()}>
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {formatDateHeader(date)}
                  </span>
                </div>
                <div className="space-y-2">
                  {dateMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </div>
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sendMessage.isPending}
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
