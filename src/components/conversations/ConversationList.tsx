import { useState } from 'react';
import { MessageSquare, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversations, ConversationFilter, Conversation } from '@/hooks/use-conversations';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

const filters: { label: string; value: ConversationFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Assigned to me', value: 'assigned' },
  { label: 'Unassigned', value: 'unassigned' },
];

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: conversations, isLoading } = useConversations(activeFilter);

  const filteredConversations = conversations?.filter((conv) => {
    if (!searchQuery) return true;
    const contactName = conv.contact?.display_name?.toLowerCase() || '';
    const phoneNumber = conv.contact?.phone_number || '';
    const query = searchQuery.toLowerCase();
    return contactName.includes(query) || phoneNumber.includes(query);
  });

  const getInitials = (name: string | null | undefined, phone: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return phone.slice(-2);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-orange-500 text-white';
      default:
        return '';
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card h-full">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button size="sm" variant="ghost" className="text-primary">
            <Filter className="w-4 h-4 mr-1" />
            Filter
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-9 bg-secondary/50 border-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              variant={activeFilter === filter.value ? 'default' : 'outline'}
              className="flex-shrink-0 text-xs"
              onClick={() => setActiveFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      {isLoading ? (
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !filteredConversations?.length ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-muted-foreground">No conversations yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {activeFilter !== 'all'
              ? 'No conversations match this filter'
              : 'Connect a WhatsApp account to start receiving messages'}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                className={cn(
                  'w-full p-4 flex gap-3 text-left hover:bg-accent/50 transition-colors',
                  selectedId === conversation.id && 'bg-accent'
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.contact?.profile_picture_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(
                        conversation.contact?.display_name,
                        conversation.contact?.phone_number || ''
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {conversation.contact?.display_name ||
                        conversation.contact?.phone_number ||
                        'Unknown'}
                    </span>
                    {conversation.last_message_at && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(conversation.last_message_at), {
                          addSuffix: false,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {conversation.last_message_preview || 'No messages yet'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className={cn('text-xs', getPriorityColor(conversation.priority))}
                    >
                      {conversation.status}
                    </Badge>
                    {(conversation.priority === 'urgent' || conversation.priority === 'high') && (
                      <Badge className={cn('text-xs', getPriorityColor(conversation.priority))}>
                        {conversation.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
