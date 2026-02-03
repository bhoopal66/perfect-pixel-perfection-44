import { Kanban, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const stages = [
  { id: 'new_lead', name: 'New Lead', color: 'bg-blue-500' },
  { id: 'qualified', name: 'Qualified', color: 'bg-yellow-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-purple-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500' },
  { id: 'closed_won', name: 'Closed Won', color: 'bg-success' },
  { id: 'closed_lost', name: 'Closed Lost', color: 'bg-destructive' },
];

export default function Pipeline() {
  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pipeline</h1>
            <p className="text-muted-foreground">Track your deals through the sales funnel</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Deal
          </Button>
        </div>
        
        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Total Pipeline', value: '$0' },
            { label: 'Avg Deal Value', value: '$0' },
            { label: 'Win Rate', value: '0%' },
            { label: 'Active Deals', value: '0' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-max">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="w-72 flex-shrink-0 flex flex-col bg-secondary/30 rounded-xl"
            >
              {/* Column Header */}
              <div className="p-4 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <h3 className="font-medium">{stage.name}</h3>
                <span className="text-sm text-muted-foreground ml-auto">0</span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {/* Empty state */}
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Kanban className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No deals in this stage
                  </p>
                </div>
              </div>

              {/* Add Card Button */}
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add deal
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
