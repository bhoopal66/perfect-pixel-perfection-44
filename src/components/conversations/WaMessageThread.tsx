import { useState, useRef, useEffect } from 'react';
import {
  Send, Paperclip, Smile, MoreVertical, User, UserPlus,
  Check, CheckCheck, Clock, AlertCircle, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  useWaConversation, useWaMessageList, useSendWaConversationMessage,
  useMarkWaConversationRead, useUpdateWaConversation, WaMessage, WaConversation,
} from '@/hooks/use-wa-conversations';
import { useTeamMembers } from '@/hooks/use-team-management';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WaMessageThreadProps {
  conversationId: string | null;
}

function StatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case 'pending': return <Clock className="w-3 h-3 text-muted-foreground" />;
    case 'sent': return <Check className="w-3 h-3 text-muted-foreground" />;
    case 'delivered': return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    case 'read': return <CheckCheck className="w-3 h-3 text-primary" />;
    case 'failed': return <AlertCircle className="w-3 h-3 text-destructive" />;
    default: return null;
  }
}

function formatTime(date: Date) { return format(date, 'HH:mm'); }
function formatDateHeader(date: Date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

function MessageBubble({ message }: { message: WaMessage }) {
  const isOutbound = !!message.from_me;
  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[70%] rounded-2xl px-4 py-2',
        isOutbound ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'
      )}>
        {message.body && <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>}
        <div className={cn('flex items-center gap-1 mt-1', isOutbound ? 'justify-end' : 'justify-start')}>
          <span className={cn('text-xs', isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {formatTime(new Date(message.timestamp))}
          </span>
          {isOutbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

export function WaMessageThread({ conversationId }: WaMessageThreadProps) {
  const [messageInput, setMessageInput] = useState('');
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: conversation, isLoading: loadingConv } = useWaConversation(conversationId);
  const { data: messages, isLoading: loadingMsgs } = useWaMessageList(conversationId);
  const { data: teamMembers } = useTeamMembers();
  const sendMessage = useSendWaConversationMessage();
  const markRead = useMarkWaConversationRead();
  const updateConv = useUpdateWaConversation();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (conversationId && conversation?.unread_count && conversation.unread_count > 0)
      markRead.mutate(conversationId);
  }, [conversationId, conversation?.unread_count]);

  const handleSend = async () => {
    if (!messageInput.trim() || !conversation) return;
    try {
      await sendMessage.mutateAsync({ conversation, text: messageInput.trim() });
      setMessageInput('');
    } catch { toast.error('Failed to send message'); }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleStatusChange = (status: string) => {
    if (!conversationId) return;
    updateConv.mutate({ id: conversationId, status } as any, {
      onSuccess: () => toast.success(`Conversation marked as ${status}`),
    });
  };

  const handleAssign = (userId: string | null, name?: string) => {
    if (!conversationId) return;
    updateConv.mutate({ id: conversationId, assigned_to: userId } as any, {
      onSuccess: () => { setAssignPopoverOpen(false); toast.success(userId ? `Assigned to ${name}` : 'Unassigned'); },
    });
  };

  const assignedMember = teamMembers?.find((m) => m.user_id === conversation?.assigned_to);
  const filteredMembers = teamMembers?.filter((m) => {
    if (!assignSearch) return true;
    const q = assignSearch.toLowerCase();
    return m.full_name?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  if (!conversationId) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">Select a conversation</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose a conversation from the list to start chatting</p>
        </div>
      </div>
    );
  }

  if (loadingConv) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
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
    return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Conversation not found</p></div>;
  }

  const displayName = conversation.contact_name || conversation.contact?.display_name || conversation.phone;

  const messagesByDate: { date: Date; messages: WaMessage[] }[] = [];
  messages?.forEach((msg) => {
    const d = new Date(msg.timestamp);
    const last = messagesByDate[messagesByDate.length - 1];
    if (last && isSameDay(last.date, d)) last.messages.push(msg);
    else messagesByDate.push({ date: d, messages: [msg] });
  });

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.contact?.profile_picture_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {displayName[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{displayName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{conversation.status || 'open'}</Badge>
              <span className="text-xs text-muted-foreground">{conversation.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={assignPopoverOpen} onOpenChange={(o) => { setAssignPopoverOpen(o); if (!o) setAssignSearch(''); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                {assignedMember ? (
                  <>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {assignedMember.full_name?.[0]?.toUpperCase() || assignedMember.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[80px] truncate">{assignedMember.full_name || assignedMember.email}</span>
                  </>
                ) : (
                  <><UserPlus className="w-3.5 h-3.5" />Assign</>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-2 border-b border-border">
                <Input placeholder="Search team members..." value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} className="h-8 text-sm" />
              </div>
              <ScrollArea className="max-h-48">
                <div className="p-1">
                  {conversation.assigned_to && (
                    <button onClick={() => handleAssign(null)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-destructive">
                      <X className="w-4 h-4" />Unassign
                    </button>
                  )}
                  {filteredMembers?.map((m) => (
                    <button key={m.user_id} onClick={() => handleAssign(m.user_id, m.full_name || m.email)}
                      className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors', conversation.assigned_to === m.user_id && 'bg-accent')}>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{m.full_name?.[0]?.toUpperCase() || m.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{m.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                      {conversation.assigned_to === m.user_id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange('open')}>Mark as Open</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('pending')}>Mark as Pending</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('resolved')}>Mark as Resolved</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('archived')}>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loadingMsgs ? (
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
            {messagesByDate.map(({ date, messages: dateMsgs }) => (
              <div key={date.toISOString()}>
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {formatDateHeader(date)}
                  </span>
                </div>
                <div className="space-y-2">
                  {dateMsgs.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
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
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Smile className="w-5 h-5" />
            </Button>
          </div>
          <Button size="icon" onClick={handleSend} disabled={!messageInput.trim() || sendMessage.isPending} className="flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
