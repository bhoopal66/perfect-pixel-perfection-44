import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppAccount, useUpdateWhatsAppAccount } from '@/hooks/use-whatsapp-accounts';

interface EditAccountDialogProps {
  account: WhatsAppAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({ account, open, onOpenChange }: EditAccountDialogProps) {
  const [accountName, setAccountName] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const { toast } = useToast();
  const updateAccount = useUpdateWhatsAppAccount();

  useEffect(() => {
    if (account) {
      setAccountName(account.account_name);
      setDisplayName(account.display_name || '');
    }
  }, [account]);

  const handleSave = async () => {
    if (!account) return;
    
    if (!accountName.trim()) {
      toast({
        title: 'Error',
        description: 'Account name is required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateAccount.mutateAsync({
        accountId: account.id,
        accountName: accountName.trim(),
        displayName: displayName.trim() || null,
      });
      toast({
        title: 'Account updated',
        description: 'WhatsApp account details have been saved.',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update account.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    if (account) {
      setAccountName(account.account_name);
      setDisplayName(account.display_name || '');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit WhatsApp Account</DialogTitle>
          <DialogDescription>
            Update the account name and display name for this WhatsApp connection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-accountName">Account Name *</Label>
            <Input
              id="edit-accountName"
              placeholder="e.g., Sales Line, Support Desk"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Internal name to identify this WhatsApp account in the CRM.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-displayName">Display Name</Label>
            <Input
              id="edit-displayName"
              placeholder="e.g., Acme Support"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional display name shown to contacts.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateAccount.isPending}>
            {updateAccount.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
