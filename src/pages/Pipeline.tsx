import { useMemo } from 'react';
import { Plus, TrendingUp, DollarSign, Target, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineColumn } from '@/components/pipeline/PipelineColumn';
import {
  usePipelineConversations,
  usePipelineStats,
  PIPELINE_STAGES,
} from '@/hooks/use-pipeline';

export default function Pipeline() {
  const navigate = useNavigate();
  const { data: conversations, isLoading } = usePipelineConversations();
  const stats = usePipelineStats();

  const conversationsByStage = useMemo(() => {
    const grouped: Record<string, typeof conversations> = {};
    PIPELINE_STAGES.forEach((stage) => {
      grouped[stage.id] = [];
    });

    conversations?.forEach((conversation) => {
      const stage = conversation.pipeline_stage || 'new_lead';
      if (grouped[stage]) {
        grouped[stage]!.push(conversation);
      } else {
        grouped['new_lead']!.push(conversation);
      }
    });

    return grouped;
  }, [conversations]);

  const handleViewConversation = (conversationId: string) => {
    navigate(`/dashboard/conversations?id=${conversationId}`);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pipeline</h1>
            <p className="text-muted-foreground">Track your deals through the sales funnel</p>
          </div>
          <Button className="gap-2" onClick={() => navigate('/dashboard/conversations')}>
            <Plus className="w-4 h-4" />
            New Conversation
          </Button>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPipeline)}</p>
              <p className="text-sm text-muted-foreground">Total Pipeline</p>
            </div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(stats.avgDealValue)}</p>
              <p className="text-sm text-muted-foreground">Avg Deal Value</p>
            </div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.winRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeDeals}</p>
              <p className="text-sm text-muted-foreground">Active Deals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex gap-4 h-full min-w-max">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.id}
                className="w-72 flex-shrink-0 flex flex-col bg-secondary/30 rounded-xl"
              >
                <div className="p-4">
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="p-2 space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 h-full min-w-max">
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                conversations={conversationsByStage[stage.id] || []}
                onViewConversation={handleViewConversation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
