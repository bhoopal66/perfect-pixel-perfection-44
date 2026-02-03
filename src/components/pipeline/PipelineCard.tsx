import { useState } from 'react';
import { GripVertical, DollarSign, MessageSquare, Phone, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PipelineConversation, PIPELINE_STAGES, PipelineStage, useUpdatePipelineStage } from '@/hooks/use-pipeline';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PipelineCardProps {
  conversation: PipelineConversation;
  onViewConversation?: () => void;
}

export function PipelineCard({ conversation, onViewConversation }: PipelineCardProps) {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editedValue, setEditedValue] = useState(conversation.deal_value?.toString() || '0');
  const { toast } = useToast();
  const updateStage = useUpdatePipelineStage();

  const contact = conversation.contact;
  const displayName = contact?.display_name || contact?.phone_number || 'Unknown';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleMoveToStage = async (stage: PipelineStage) => {
    try {
      await updateStage.mutateAsync({
        conversationId: conversation.id,
        stage,
      });
      toast({
        title: 'Deal moved',
        description: `Moved to ${PIPELINE_STAGES.find((s) => s.id === stage)?.name}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to move deal',
        variant: 'destructive',
      });
    }
  };

  const handleSaveValue = async () => {
    try {
      const value = parseFloat(editedValue) || 0;
      await updateStage.mutateAsync({
        conversationId: conversation.id,
        stage: conversation.pipeline_stage as PipelineStage,
        dealValue: value,
      });
      setIsEditingValue(false);
      toast({
        title: 'Value updated',
        description: `Deal value set to $${value.toLocaleString()}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update value',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div
      className={cn(
        'group bg-card border border-border rounded-lg p-3 shadow-sm',
        'hover:shadow-md hover:border-primary/20 transition-all cursor-grab active:cursor-grabbing'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={contact?.profile_picture_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{displayName}</h4>
          {contact?.phone_number && contact.display_name && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {contact.phone_number}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onViewConversation}>
              <MessageSquare className="w-4 h-4 mr-2" />
              View Conversation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {PIPELINE_STAGES.filter((s) => s.id !== conversation.pipeline_stage).map((stage) => (
              <DropdownMenuItem key={stage.id} onClick={() => handleMoveToStage(stage.id)}>
                <div className={cn('w-2 h-2 rounded-full mr-2', stage.color)} />
                Move to {stage.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Preview */}
      {conversation.last_message_preview && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-6">
          {conversation.last_message_preview}
        </p>
      )}

      {/* Tags */}
      {contact?.tags && contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 pl-6">
          {contact.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {contact.tags.length > 2 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              +{contact.tags.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pl-6 pt-2 border-t border-border/50">
        <Popover open={isEditingValue} onOpenChange={setIsEditingValue}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              <DollarSign className="w-3 h-3" />
              {formatCurrency(conversation.deal_value || 0)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="flex gap-2">
              <Input
                type="number"
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                className="h-8 text-sm"
                placeholder="0"
              />
              <Button size="sm" className="h-8" onClick={handleSaveValue}>
                Save
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-[10px] text-muted-foreground">
          {conversation.last_message_at
            ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
            : formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
