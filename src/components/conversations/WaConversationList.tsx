import { useState } from 'react';
import { MessageSquare, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWaConversationList, WaConversation, WaConversationFilter } from '@/hooks/use-wa-conversations';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface WaConversationListProps {
  selectedId: string | null;
  onSelect: (conversation: WaConversation) => void;
}

const filters: { label: string; value: WaConversationFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Assigned to me', value: 'assigned' },
  { label: 'Unassigned', value: 'unassigned' },
];

export function WaConversationList({ selectedId, onSelect }: WaConversationListProps) {
  const [activeFilter, setActiveFilter] = useState<WaConversationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: conversations, isLoading } = useWaConversationList(activeFilter);

  const filteredConversations = conversations?.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = conv.contact_name?.toLowerCase() || conv.contact?.display_name?.toLowerCase() || '';
    return name.includes(q) || conv.phone.includes(q);
  });

  const getInitials = (conv: WaConversation) => {
    const name = conv.contact_name || conv.contact?.display_name;
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return conv.phone.slice(-2);
  };

  const getDisplayName = (conv: WaConversation) =>
    conv.contact_name || conv.contact?.display_name || conv.phone;

  return (
    <div className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card h-full">
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
              : 'Connect a WhatsApp session to start receiving messages'}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full p-4 flex gap-3 text-left hover:bg-accent/50 transition-colors',
                  selectedId === conv.id && 'bg-accent'
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conv.contact?.profile_picture_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(conv)}
                    </AvatarFallback>
                  </Avatar>
                  {(conv.unread_count ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                      {(conv.unread_count ?? 0) > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{getDisplayName(conv)}</span>
                    {conv.last_message_at && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {conv.last_message || 'No messages yet'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {conv.status || 'open'}
                    </Badge>
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
