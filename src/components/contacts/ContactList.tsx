import { useState } from 'react';
import { Users, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useContacts, ContactFilter, Contact, useAllTags } from '@/hooks/use-contacts';
import { ContactCard } from './ContactCard';
import { cn } from '@/lib/utils';

interface ContactListProps {
  selectedId: string | null;
  onSelect: (contact: Contact) => void;
}

const filters: { label: string; value: ContactFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Recent', value: 'recent' },
  { label: 'Blocked', value: 'blocked' },
];

export function ContactList({ selectedId, onSelect }: ContactListProps) {
  const [activeFilter, setActiveFilter] = useState<ContactFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: contacts, isLoading } = useContacts(activeFilter, searchQuery, selectedTags);
  const { data: allTags = [] } = useAllTags();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setActiveFilter('all');
  };

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || activeFilter !== 'all';

  return (
    <div className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card h-full">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contacts</h2>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
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
        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer text-xs transition-colors',
                  selectedTags.includes(tag) && 'bg-primary text-primary-foreground'
                )}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Contact List */}
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
      ) : !contacts?.length ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-muted-foreground">No contacts found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {hasActiveFilters
              ? 'No contacts match your filters'
              : 'Contacts will appear when you connect a WhatsApp account'}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div>
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                isSelected={selectedId === contact.id}
                onClick={() => onSelect(contact)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Contact count */}
      {contacts && contacts.length > 0 && (
        <div className="p-3 border-t border-border bg-muted/30 text-center">
          <span className="text-xs text-muted-foreground">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
