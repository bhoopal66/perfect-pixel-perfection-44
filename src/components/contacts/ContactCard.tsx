import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Contact } from '@/hooks/use-contacts';
import { formatDistanceToNow } from 'date-fns';
import { Ban } from 'lucide-react';

interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
}

export function ContactCard({ contact, isSelected, onClick }: ContactCardProps) {
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

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      VIP: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
      'Sales Lead': 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      Support: 'bg-green-500/20 text-green-600 dark:text-green-400',
      Partner: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
      'New Customer': 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    };
    return colors[tag] || 'bg-secondary text-secondary-foreground';
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 flex gap-3 text-left hover:bg-accent/50 transition-colors border-b border-border',
        isSelected && 'bg-accent'
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={contact.profile_picture_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(contact.display_name, contact.phone_number)}
          </AvatarFallback>
        </Avatar>
        {contact.is_blocked && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
            <Ban className="w-3 h-3" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('font-medium truncate', contact.is_blocked && 'text-muted-foreground line-through')}>
            {contact.display_name || contact.phone_number}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(contact.updated_at), { addSuffix: false })}
          </span>
        </div>
        {contact.display_name && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {contact.phone_number}
          </p>
        )}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {contact.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className={cn('text-xs', getTagColor(tag))}>
                {tag}
              </Badge>
            ))}
            {contact.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{contact.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
