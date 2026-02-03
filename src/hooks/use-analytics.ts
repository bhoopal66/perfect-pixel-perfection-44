import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountStore } from '@/stores/accountStore';
import { startOfDay, subDays, format } from 'date-fns';

export interface DailyMessageStats {
  date: string;
  sent: number;
  received: number;
}

export interface PipelineStats {
  stage: string;
  count: number;
  value: number;
}

export interface TeamMemberStats {
  userId: string;
  name: string;
  conversationsAssigned: number;
  messagesHandled: number;
}

export interface AnalyticsData {
  totalConversations: number;
  activeConversations: number;
  messagesSent: number;
  messagesReceived: number;
  avgResponseTimeMinutes: number | null;
  conversionRate: number;
  dailyMessageStats: DailyMessageStats[];
  pipelineStats: PipelineStats[];
  teamStats: TeamMemberStats[];
}

const PIPELINE_STAGES = [
  { key: 'new_lead', label: 'New Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'closed_won', label: 'Closed Won' },
  { key: 'closed_lost', label: 'Closed Lost' },
];

export function useAnalytics(days: number = 30) {
  const { selectedAccountId } = useAccountStore();

  return useQuery({
    queryKey: ['analytics', selectedAccountId, days],
    queryFn: async (): Promise<AnalyticsData> => {
      const startDate = startOfDay(subDays(new Date(), days));

      // Fetch conversations
      let conversationsQuery = supabase
        .from('conversations')
        .select('id, status, pipeline_stage, deal_value, assigned_to, created_at');

      if (selectedAccountId) {
        conversationsQuery = conversationsQuery.eq('whatsapp_account_id', selectedAccountId);
      }

      const { data: conversations, error: convError } = await conversationsQuery;
      if (convError) throw convError;

      // Fetch messages for the date range
      let messagesQuery = supabase
        .from('messages')
        .select('id, direction, sent_at, delivered_at, read_at, conversation_id')
        .gte('sent_at', startDate.toISOString());

      const { data: messages, error: msgError } = await messagesQuery;
      if (msgError) throw msgError;

      // Fetch team members with their profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');
      if (profileError) throw profileError;

      // Calculate stats
      const totalConversations = conversations?.length || 0;
      const activeConversations = conversations?.filter(c => c.status === 'open').length || 0;

      const messagesSent = messages?.filter(m => m.direction === 'outbound').length || 0;
      const messagesReceived = messages?.filter(m => m.direction === 'inbound').length || 0;

      // Calculate average response time (simplified: time between inbound and next outbound)
      let totalResponseTime = 0;
      let responseCount = 0;

      if (messages && messages.length > 0) {
        // Group messages by conversation
        const messagesByConv: Record<string, typeof messages> = {};
        messages.forEach(m => {
          if (!messagesByConv[m.conversation_id]) {
            messagesByConv[m.conversation_id] = [];
          }
          messagesByConv[m.conversation_id].push(m);
        });

        // For each conversation, calculate response times
        Object.values(messagesByConv).forEach(convMessages => {
          const sorted = convMessages.sort((a, b) => 
            new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
          );

          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].direction === 'inbound' && sorted[i + 1].direction === 'outbound') {
              const responseTime = new Date(sorted[i + 1].sent_at).getTime() - new Date(sorted[i].sent_at).getTime();
              totalResponseTime += responseTime;
              responseCount++;
            }
          }
        });
      }

      const avgResponseTimeMinutes = responseCount > 0 
        ? Math.round(totalResponseTime / responseCount / 1000 / 60) 
        : null;

      // Calculate daily message stats
      const dailyStats: Record<string, { sent: number; received: number }> = {};
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'MMM dd');
        dailyStats[date] = { sent: 0, received: 0 };
      }

      messages?.forEach(m => {
        const date = format(new Date(m.sent_at), 'MMM dd');
        if (dailyStats[date]) {
          if (m.direction === 'outbound') {
            dailyStats[date].sent++;
          } else {
            dailyStats[date].received++;
          }
        }
      });

      const dailyMessageStats: DailyMessageStats[] = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        sent: stats.sent,
        received: stats.received,
      }));

      // Calculate pipeline stats
      const pipelineStats: PipelineStats[] = PIPELINE_STAGES.map(stage => {
        const stageConversations = conversations?.filter(c => c.pipeline_stage === stage.key) || [];
        return {
          stage: stage.label,
          count: stageConversations.length,
          value: stageConversations.reduce((sum, c) => sum + (Number(c.deal_value) || 0), 0),
        };
      });

      // Calculate team stats
      const teamStats: TeamMemberStats[] = [];
      const assignedByUser: Record<string, { conversations: number; messages: number }> = {};

      conversations?.forEach(c => {
        if (c.assigned_to) {
          if (!assignedByUser[c.assigned_to]) {
            assignedByUser[c.assigned_to] = { conversations: 0, messages: 0 };
          }
          assignedByUser[c.assigned_to].conversations++;
        }
      });

      // Count messages per assigned user (simplified - counts all messages in their conversations)
      const conversationAssignments: Record<string, string> = {};
      conversations?.forEach(c => {
        if (c.assigned_to) {
          conversationAssignments[c.id] = c.assigned_to;
        }
      });

      messages?.forEach(m => {
        const assignedTo = conversationAssignments[m.conversation_id];
        if (assignedTo && m.direction === 'outbound') {
          if (assignedByUser[assignedTo]) {
            assignedByUser[assignedTo].messages++;
          }
        }
      });

      Object.entries(assignedByUser).forEach(([userId, stats]) => {
        const profile = profiles?.find(p => p.user_id === userId);
        teamStats.push({
          userId,
          name: profile?.full_name || profile?.email || 'Unknown',
          conversationsAssigned: stats.conversations,
          messagesHandled: stats.messages,
        });
      });

      // Sort by conversations assigned
      teamStats.sort((a, b) => b.conversationsAssigned - a.conversationsAssigned);

      // Calculate conversion rate
      const closedWon = conversations?.filter(c => c.pipeline_stage === 'closed_won').length || 0;
      const totalPipelineConversations = conversations?.filter(c => c.pipeline_stage).length || 0;
      const conversionRate = totalPipelineConversations > 0 
        ? Math.round((closedWon / totalPipelineConversations) * 100) 
        : 0;

      return {
        totalConversations,
        activeConversations,
        messagesSent,
        messagesReceived,
        avgResponseTimeMinutes,
        conversionRate,
        dailyMessageStats,
        pipelineStats,
        teamStats,
      };
    },
  });
}
