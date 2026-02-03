import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

const stats = [
  {
    title: 'Active Conversations',
    value: '0',
    change: '+0%',
    trend: 'neutral',
    icon: MessageSquare,
  },
  {
    title: 'Total Contacts',
    value: '0',
    change: '+0%',
    trend: 'neutral',
    icon: Users,
  },
  {
    title: 'Messages Sent',
    value: '0',
    change: '+0%',
    trend: 'neutral',
    icon: TrendingUp,
  },
  {
    title: 'Avg Response Time',
    value: '--',
    change: '0%',
    trend: 'neutral',
    icon: Clock,
  },
];

export default function Dashboard() {
  const { profile, organization } = useAuthStore();

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your WhatsApp CRM today.
          </p>
        </div>
        <Button className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Add WhatsApp Account
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-success' : 
                  stat.trend === 'down' ? 'text-destructive' : 
                  'text-muted-foreground'
                }`}>
                  {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                  {stat.trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Connect your first WhatsApp account to start managing conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium">Connect WhatsApp Account</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Link your WhatsApp Business account using our Chrome extension
                </p>
                <Button size="sm" className="mt-3">
                  Connect Account
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: 'Invite Team Members', desc: 'Add your team to collaborate' },
                { title: 'Setup Templates', desc: 'Create quick reply templates' },
              ].map((action) => (
                <div
                  key={action.title}
                  className="p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <h4 className="font-medium text-sm">{action.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your team's latest actions and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-muted-foreground">No activity yet</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Activity will appear here once you start using the CRM
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Workload (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Team Workload</CardTitle>
          <CardDescription>
            Monitor your team's capacity and distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-muted-foreground">No team members yet</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Invite team members to see their workload here
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              Invite Team
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
