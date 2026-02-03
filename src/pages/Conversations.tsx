import { MessageSquare, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Conversations() {
  return (
    <div className="h-full flex animate-fade-in">
      {/* Conversation List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <Button size="sm" variant="ghost" className="text-primary">
              All Accounts
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 bg-secondary/50 border-0"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['All', 'Unread', 'Assigned to me', 'Unassigned'].map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={filter === 'All' ? 'default' : 'outline'}
                className="flex-shrink-0 text-xs"
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-muted-foreground">No conversations yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Connect a WhatsApp account to start receiving messages
          </p>
          <Button size="sm" className="mt-4">
            Connect Account
          </Button>
        </div>
      </div>

      {/* Conversation View (placeholder) */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">Select a conversation</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a conversation from the list to start chatting
          </p>
        </div>
      </div>
    </div>
  );
}
