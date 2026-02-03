import { useState } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhatsAppAccounts } from '@/hooks/use-whatsapp-accounts';
import { WhatsAppAccountCard } from './WhatsAppAccountCard';
import { AddAccountDialog } from './AddAccountDialog';

export function WhatsAppAccountsTab() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { data: accounts, isLoading, error } = useWhatsAppAccounts();

  const connectedCount = accounts?.filter(a => a.is_connected).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected WhatsApp Accounts</CardTitle>
          <CardDescription className="text-destructive">
            Failed to load accounts. Please try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connected WhatsApp Accounts</CardTitle>
              <CardDescription>
                Manage your WhatsApp Business accounts connected to this CRM
                {accounts && accounts.length > 0 && (
                  <span className="ml-1">
                    ({connectedCount} of {accounts.length} connected)
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts && accounts.length > 0 ? (
            <div className="space-y-4">
              {accounts.map((account) => (
                <WhatsAppAccountCard key={account.id} account={account} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-medium">No accounts connected</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Add your first WhatsApp account to start managing conversations
              </p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add WhatsApp Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddAccountDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </>
  );
}
