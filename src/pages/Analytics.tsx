import { useState } from 'react';
import { BarChart3, Calendar, MessageSquare, Clock, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Funnel,
  FunnelChart,
  LabelList,
} from 'recharts';
import { useAnalytics } from '@/hooks/use-analytics';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(142 76% 36%)',
  'hsl(0 84% 60%)',
];

type DateRange = 7 | 30 | 90;

export default function Analytics() {
  const [days, setDays] = useState<DateRange>(30);
  const { data, isLoading } = useAnalytics(days);

  const stats = [
    {
      label: 'Total Conversations',
      value: data?.totalConversations ?? 0,
      icon: MessageSquare,
      trend: `${data?.activeConversations ?? 0} active`,
    },
    {
      label: 'Messages Sent',
      value: data?.messagesSent ?? 0,
      icon: TrendingUp,
      trend: `${data?.messagesReceived ?? 0} received`,
    },
    {
      label: 'Avg Response Time',
      value: data?.avgResponseTimeMinutes != null ? `${data.avgResponseTimeMinutes}m` : '--',
      icon: Clock,
      trend: data?.avgResponseTimeMinutes != null ? 'minutes' : 'No data',
    },
    {
      label: 'Conversion Rate',
      value: `${data?.conversionRate ?? 0}%`,
      icon: BarChart3,
      trend: 'from pipeline',
    },
  ];

  // Filter pipeline stats for funnel (exclude zero counts and closed_lost for visual clarity)
  const funnelData = data?.pipelineStats
    .filter(s => s.stage !== 'Closed Lost' && s.count > 0)
    .map((s, i) => ({
      name: s.stage,
      value: s.count,
      fill: COLORS[i % COLORS.length],
    })) || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your team's performance and metrics</p>
        </div>
        <div className="flex gap-2">
          {([7, 30, 90] as DateRange[]).map((d) => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(d)}
              className="gap-2"
            >
              <Calendar className="w-4 h-4" />
              {d} Days
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <p className="text-2xl font-bold">{stat.value}</p>
              )}
              <div className="flex items-baseline gap-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Message Volume</CardTitle>
            <CardDescription>Sent vs received messages over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.dailyMessageStats && data.dailyMessageStats.some(d => d.sent > 0 || d.received > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.dailyMessageStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sent" name="Sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="received" name="Received" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  No messages yet. Start conversations to see volume trends.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Time Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Message Activity Trend</CardTitle>
            <CardDescription>Total messages per day</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.dailyMessageStats && data.dailyMessageStats.some(d => d.sent > 0 || d.received > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={data.dailyMessageStats.map(d => ({ ...d, total: d.sent + d.received }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Messages"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  No data available yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
            <CardDescription>Conversion through sales stages</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <FunnelChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  Add deals to your pipeline to see funnel analytics.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Conversations and messages by team member</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.teamStats && data.teamStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.teamStats.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="conversationsAssigned" 
                    name="Conversations" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]} 
                  />
                  <Bar 
                    dataKey="messagesHandled" 
                    name="Messages" 
                    fill="hsl(var(--chart-2))" 
                    radius={[0, 4, 4, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  Assign conversations to team members to see performance rankings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Breakdown Table */}
      {data?.pipelineStats && data.pipelineStats.some(s => s.count > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Breakdown</CardTitle>
            <CardDescription>Deals and value by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Stage</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Deals</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pipelineStats.map((stage, i) => (
                    <tr key={stage.stage} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          {stage.stage}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-medium">{stage.count}</td>
                      <td className="text-right py-3 px-4 font-medium">
                        ${stage.value.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
