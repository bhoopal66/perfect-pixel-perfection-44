import { Plus, Kanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PipelineCard } from './PipelineCard';
import { PipelineConversation, PipelineStage, useUpdatePipelineStage } from '@/hooks/use-pipeline';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PipelineColumnProps {
  stage: {
    id: string;
    name: string;
    color: string;
  };
  conversations: PipelineConversation[];
  onAddDeal?: () => void;
  onViewConversation?: (conversationId: string) => void;
}

export function PipelineColumn({ stage, conversations, onAddDeal, onViewConversation }: PipelineColumnProps) {
  const updateStage = useUpdatePipelineStage();
  const { toast } = useToast();
  const totalValue = conversations.reduce((sum, c) => sum + (c.deal_value || 0), 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-primary/50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
    
    const conversationId = e.dataTransfer.getData('conversationId');
    const fromStage = e.dataTransfer.getData('fromStage');
    
    if (conversationId && fromStage !== stage.id) {
      try {
        await updateStage.mutateAsync({
          conversationId,
          stage: stage.id as PipelineStage,
        });
        toast({
          title: 'Deal moved',
          description: `Moved to ${stage.name}`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to move deal',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div
      className="w-72 flex-shrink-0 flex flex-col bg-secondary/30 rounded-xl transition-all"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border/50">
        <div className={cn('w-3 h-3 rounded-full', stage.color)} />
        <div className="flex-1">
          <h3 className="font-medium text-sm">{stage.name}</h3>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(totalValue)}
          </p>
        </div>
        <span className="text-sm font-medium bg-background px-2 py-0.5 rounded-full">
          {conversations.length}
        </span>
      </div>

      {/* Cards Container */}
      <ScrollArea className="flex-1 px-2">
        <div className="py-2 space-y-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Kanban className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                No deals in this stage
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('conversationId', conversation.id);
                  e.dataTransfer.setData('fromStage', conversation.pipeline_stage);
                }}
              >
                <PipelineCard
                  conversation={conversation}
                  onViewConversation={() => onViewConversation?.(conversation.id)}
                />
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Card Button */}
      <div className="p-2 border-t border-border/50">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          size="sm"
          onClick={onAddDeal}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add deal
        </Button>
      </div>
    </div>
  );
}
