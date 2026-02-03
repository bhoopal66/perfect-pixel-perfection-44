import { Users, Search, Plus, Grid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Contacts() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your WhatsApp contacts</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Grid className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">No contacts yet</h3>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
            Contacts will appear here when you connect a WhatsApp account and receive messages
          </p>
          <Button size="sm" className="mt-4">
            Connect WhatsApp Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
