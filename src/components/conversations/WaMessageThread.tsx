import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, Smile, MoreVertical, User, UserPlus,
  Check, CheckCheck, Clock, AlertCircle, X, Image, FileText,
  Mic, Loader2, Download, Play, FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  useWaConversation, useWaMessageList, useSendWaConversationMessage,
  useMarkWaConversationRead, useUpdateWaConversation, WaMessage, WaConversation,
} from '@/hooks/use-wa-conversations';
import { useTeamMembers } from '@/hooks/use-team-management';
import { supabase } from '@/integrations/supabase/client';
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

function getMediaCategory(type: string | null, url: string | null): 'image' | 'audio' | 'document' | 'text' {
  if (!type && !url) return 'text';
  const t = (type || '').toLowerCase();
  const u = (url || '').toLowerCase();
  if (t === 'image' || /\.(jpg|jpeg|png|gif|webp)/.test(u)) return 'image';
  if (t === 'audio' || t === 'ptt' || /\.(mp3|ogg|wav|m4a|opus)/.test(u)) return 'audio';
  if (t === 'document' || t === 'video' || /\.(pdf|doc|docx|xls|xlsx|mp4)/.test(u)) return 'document';
  if (t !== 'text' && t !== '' && url) return 'document';
  return 'text';
}

function MediaContent({ message }: { message: WaMessage }) {
  const category = getMediaCategory(message.message_type, message.media_url);
  const isOutbound = !!message.from_me;

  if (category === 'image' && message.media_url) {
    return (
      <div className="mb-1.5 rounded-lg overflow-hidden">
        <img
          src={message.media_url}
          alt="Shared image"
          className="max-w-full max-h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(message.media_url!, '_blank')}
          loading="lazy"
        />
      </div>
    );
  }

  if (category === 'audio' && message.media_url) {
    return (
      <div className="mb-1.5">
        <audio controls className="max-w-full h-10" preload="metadata">
          <source src={message.media_url} />
        </audio>
      </div>
    );
  }

  if (category === 'document' && message.media_url) {
    const fileName = message.media_url.split('/').pop()?.split('?')[0] || 'Document';
    return (
      <a
        href={message.media_url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center gap-2 mb-1.5 px-3 py-2 rounded-lg transition-colors',
          isOutbound
            ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
            : 'bg-background/60 hover:bg-background/80'
        )}
      >
        <FileIcon className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm truncate flex-1">{decodeURIComponent(fileName)}</span>
        <Download className="h-4 w-4 flex-shrink-0 opacity-60" />
      </a>
    );
  }

  return null;
}

function MessageBubble({ message }: { message: WaMessage }) {
  const isOutbound = !!message.from_me;
  const hasMedia = message.media_url && message.message_type !== 'text';

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[70%] rounded-2xl px-4 py-2',
        isOutbound ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'
      )}>
        {hasMedia && <MediaContent message={message} />}
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

interface FilePreview {
  file: File;
  previewUrl: string | null;
  category: 'image' | 'audio' | 'document';
}

function classifyFile(file: File): FilePreview['category'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
}

export function WaMessageThread({ conversationId }: WaMessageThreadProps) {
  const [messageInput, setMessageInput] = useState('');
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [pendingFiles, setPendingFiles] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [pendingFiles]);

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles: FilePreview[] = Array.from(files).slice(0, 5).map((file) => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      category: classifyFile(file),
    }));
    setPendingFiles((prev) => [...prev, ...newFiles].slice(0, 5));
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${conversation!.session_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('wa-media')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from('wa-media').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSend = async () => {
    const hasText = messageInput.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if ((!hasText && !hasFiles) || !conversation) return;

    setIsUploading(hasFiles);

    try {
      if (hasFiles) {
        for (const pf of pendingFiles) {
          const mediaUrl = await uploadFile(pf.file);
          await sendMessage.mutateAsync({
            conversation,
            text: pendingFiles.length === 1 && hasText ? messageInput.trim() : undefined,
            mediaUrl,
            mediaType: pf.category,
            caption: pendingFiles.length === 1 && hasText ? messageInput.trim() : undefined,
          });
        }
        // If multiple files and text, send text separately
        if (pendingFiles.length > 1 && hasText) {
          await sendMessage.mutateAsync({ conversation, text: messageInput.trim() });
        }
        pendingFiles.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
        setPendingFiles([]);
      } else {
        await sendMessage.mutateAsync({ conversation, text: messageInput.trim() });
      }
      setMessageInput('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  }, [handleFilesSelected]);

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
    <div
      className="flex-1 flex flex-col bg-background"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
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

      {/* File previews */}
      {pendingFiles.length > 0 && (
        <div className="px-4 pt-3 border-t border-border">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pendingFiles.map((pf, i) => (
              <div key={i} className="relative flex-shrink-0 group">
                {pf.category === 'image' && pf.previewUrl ? (
                  <img
                    src={pf.previewUrl}
                    alt={pf.file.name}
                    className="h-16 w-16 rounded-lg object-cover border border-border"
                  />
                ) : pf.category === 'audio' ? (
                  <div className="h-16 w-16 rounded-lg border border-border bg-muted flex flex-col items-center justify-center gap-1">
                    <Mic className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground truncate max-w-[56px]">
                      {pf.file.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-border bg-muted flex flex-col items-center justify-center gap-1">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground truncate max-w-[56px]">
                      {pf.file.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removePendingFile(i)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.mp4"
            onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ''; }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground flex-shrink-0">
                <Paperclip className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-48">
              <DropdownMenuItem onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*';
                  fileInputRef.current.click();
                }
              }}>
                <Image className="h-4 w-4 mr-2" />
                Photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';
                  fileInputRef.current.click();
                }
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'audio/*';
                  fileInputRef.current.click();
                }
              }}>
                <Mic className="h-4 w-4 mr-2" />
                Audio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 relative">
            <Input
              placeholder={pendingFiles.length > 0 ? 'Add a caption...' : 'Type a message...'}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isUploading}
              className="pr-10"
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Smile className="w-5 h-5" />
            </Button>
          </div>

          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!messageInput.trim() && pendingFiles.length === 0) || sendMessage.isPending || isUploading}
            className="flex-shrink-0"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
