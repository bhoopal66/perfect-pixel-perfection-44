import { useState } from 'react';
import {
  Phone,
  MessageSquare,
  Ban,
  MoreVertical,
  Edit2,
  Trash2,
  Tag,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Contact, useUpdateContact, useDeleteContact } from '@/hooks/use-contacts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ContactDetailProps {
  contact: Contact;
  onClose: () => void;
  onStartConversation?: () => void;
}

export function ContactDetail({ contact, onClose, onStartConversation }: ContactDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(contact.display_name || '');
  const [editedNotes, setEditedNotes] = useState(contact.notes || '');
  const [editedTags, setEditedTags] = useState(contact.tags?.join(', ') || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { toast } = useToast();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

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

  const handleSave = async () => {
    try {
      const tags = editedTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t);

      await updateContact.mutateAsync({
        id: contact.id,
        display_name: editedName || null,
        notes: editedNotes || null,
        tags: tags.length > 0 ? tags : null,
      });

      toast({
        title: 'Contact updated',
        description: 'Changes have been saved successfully.',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update contact.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleBlock = async () => {
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        is_blocked: !contact.is_blocked,
      });

      toast({
        title: contact.is_blocked ? 'Contact unblocked' : 'Contact blocked',
        description: contact.is_blocked
          ? 'This contact can now message you.'
          : 'This contact has been blocked.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update contact.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync(contact.id);
      toast({
        title: 'Contact deleted',
        description: 'The contact has been removed.',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete contact.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={contact.profile_picture_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {getInitials(contact.display_name, contact.phone_number)}
              </AvatarFallback>
            </Avatar>
            <div>
              {isEditing ? (
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Display name"
                  className="text-xl font-semibold h-auto py-1"
                />
              ) : (
                <h2 className={cn('text-xl font-semibold', contact.is_blocked && 'line-through text-muted-foreground')}>
                  {contact.display_name || contact.phone_number}
                </h2>
              )}
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4" />
                {contact.phone_number}
              </p>
              {contact.is_blocked && (
                <Badge variant="destructive" className="mt-2">
                  <Ban className="w-3 h-3 mr-1" />
                  Blocked
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                <Edit2 className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancel Edit' : 'Edit Contact'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleBlock}>
                {contact.is_blocked ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Unblock Contact
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Block Contact
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mt-4">
          <Button onClick={onStartConversation} disabled={contact.is_blocked}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateContact.isPending}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Tags Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Tags</Label>
          </div>
          {isEditing ? (
            <Input
              value={editedTags}
              onChange={(e) => setEditedTags(e.target.value)}
              placeholder="Enter tags separated by commas"
              className="bg-secondary/30"
            />
          ) : contact.tags && contact.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className={cn('text-sm', getTagColor(tag))}>
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tags added</p>
          )}
        </div>

        <Separator />

        {/* Notes Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Notes</Label>
          </div>
          {isEditing ? (
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              placeholder="Add notes about this contact..."
              className="min-h-[120px] bg-secondary/30"
            />
          ) : contact.notes ? (
            <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes added</p>
          )}
        </div>

        <Separator />

        {/* Metadata */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Details</Label>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{format(new Date(contact.created_at), 'MMM d, yyyy')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd>{format(new Date(contact.updated_at), 'MMM d, yyyy')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Contact ID</dt>
              <dd className="font-mono text-xs text-muted-foreground">{contact.id.slice(0, 8)}...</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{contact.display_name || contact.phone_number}</strong>? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
