import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageCircle,
  MoreVertical,
  RefreshCw,
  Trash2,
  Unplug,
  Loader2,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  WhatsAppAccount,
  useDisconnectAccount,
  useDeleteWhatsAppAccount,
  useRegeneratePairingCode,
} from '@/hooks/use-whatsapp-accounts';

interface WhatsAppAccountCardProps {
  account: WhatsAppAccount;
}

export function WhatsAppAccountCard({ account }: WhatsAppAccountCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPairingCode, setShowPairingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const disconnectAccount = useDisconnectAccount();
  const deleteAccount = useDeleteWhatsAppAccount();
  const regenerateCode = useRegeneratePairingCode();

  const isTokenExpired = account.connection_token_expires_at
    ? new Date(account.connection_token_expires_at) < new Date()
    : true;

  const handleDisconnect = async () => {
    try {
      await disconnectAccount.mutateAsync(account.id);
      toast({
        title: 'Account disconnected',
        description: `${account.account_name} has been disconnected.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect account.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAccount.mutateAsync(account.id);
      toast({
        title: 'Account deleted',
        description: `${account.account_name} has been deleted.`,
      });
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account.',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerate = async () => {
    try {
      await regenerateCode.mutateAsync(account.id);
      setShowPairingCode(true);
      toast({
        title: 'Code regenerated',
        description: 'A new pairing code has been generated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate code.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyCode = () => {
    if (account.connection_token) {
      navigator.clipboard.writeText(account.connection_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: 'Pairing code copied to clipboard.',
      });
    }
  };

  const initials = account.display_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || account.account_name.charAt(0).toUpperCase();

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="w-12 h-12">
              <AvatarImage src={account.profile_picture_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{account.account_name}</h3>
                <Badge
                  variant={account.is_connected ? 'default' : 'secondary'}
                  className={account.is_connected ? 'bg-primary' : ''}
                >
                  {account.is_connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              
              {account.phone_number && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {account.phone_number}
                </p>
              )}
              
              {account.display_name && account.display_name !== account.account_name && (
                <p className="text-sm text-muted-foreground">
                  {account.display_name}
                </p>
              )}

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {account.last_sync_at && (
                  <span>
                    Last sync: {formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true })}
                  </span>
                )}
                {!account.is_connected && !isTokenExpired && account.connection_token && (
                  <span className="text-primary">Waiting for connection...</span>
                )}
              </div>

              {/* Show pairing code if not connected and code exists */}
              {!account.is_connected && account.connection_token && !isTokenExpired && showPairingCode && (
                <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Pairing Code</p>
                      <p className="text-lg font-mono font-bold tracking-wider">
                        {account.connection_token}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyCode}
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!account.is_connected && (
                  <>
                    <DropdownMenuItem
                      onClick={handleRegenerate}
                      disabled={regenerateCode.isPending}
                    >
                      {regenerateCode.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Generate Pairing Code
                    </DropdownMenuItem>
                    {!showPairingCode && account.connection_token && !isTokenExpired && (
                      <DropdownMenuItem onClick={() => setShowPairingCode(true)}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Show Pairing Code
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {account.is_connected && (
                  <>
                    <DropdownMenuItem
                      onClick={handleDisconnect}
                      disabled={disconnectAccount.isPending}
                    >
                      {disconnectAccount.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Unplug className="w-4 h-4 mr-2" />
                      )}
                      Disconnect
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete WhatsApp Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{account.account_name}"? This action cannot be undone.
              All conversations and contacts associated with this account will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
