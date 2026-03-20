import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Wifi,
  WifiOff,
  Loader2,
  Trash2,
  Radio,
  Unplug,
  Smartphone,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useWaSessions, useDeleteWaSession, useWaSessionStatus } from '@/hooks/use-whatsapp-api';
import { AddAccountDialog } from './AddAccountDialog';

type WaSession = {
  id: string;
  session_id: string;
  organization_id: string;
  status: string | null;
  phone: string | null;
  name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function statusConfig(status: string | null) {
  switch (status) {
    case 'connected':
      return {
        label: 'Connected',
        color: 'bg-emerald-500',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        bgClass: 'bg-emerald-500/10',
        borderClass: 'border-emerald-500/20',
        icon: Wifi,
        pulse: true,
      };
    case 'connecting':
      return {
        label: 'Connecting',
        color: 'bg-amber-500',
        textClass: 'text-amber-700 dark:text-amber-400',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/20',
        icon: Radio,
        pulse: true,
      };
    default:
      return {
        label: 'Disconnected',
        color: 'bg-muted-foreground/40',
        textClass: 'text-muted-foreground',
        bgClass: 'bg-muted/50',
        borderClass: 'border-border',
        icon: WifiOff,
        pulse: false,
      };
  }
}

function SessionCard({ session }: { session: WaSession }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const deleteSession = useDeleteWaSession();
  const config = statusConfig(session.status);
  const StatusIcon = config.icon;

  const handleDisconnect = async () => {
    try {
      await deleteSession.mutateAsync(session.session_id);
      toast({
        title: 'Session disconnected',
        description: `"${session.name || session.session_id}" has been disconnected.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect session.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSession.mutateAsync(session.session_id);
      toast({
        title: 'Session deleted',
        description: `"${session.name || session.session_id}" has been removed.`,
      });
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete session.',
        variant: 'destructive',
      });
    }
  };

  const initial = (session.name || session.session_id).charAt(0).toUpperCase();

  return (
    <>
      <div
        className={`group relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 hover:shadow-sm ${config.borderClass} ${config.bgClass}`}
      >
        {/* Status indicator dot */}
        <div className="relative flex-shrink-0">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full border ${config.borderClass} bg-background`}
          >
            <StatusIcon className={`h-5 w-5 ${config.textClass}`} />
          </div>
          {/* Live pulse dot */}
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            {config.pulse && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.color} opacity-50`}
              />
            )}
            <span
              className={`relative inline-flex h-3.5 w-3.5 rounded-full ${config.color} ring-2 ring-background`}
            />
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate text-sm">
              {session.name || session.session_id}
            </h4>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0 border ${config.borderClass} ${config.textClass}`}
            >
              {config.label}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {session.phone && (
              <span className="flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                {session.phone}
              </span>
            )}
            <span className="font-mono opacity-60">{session.session_id}</span>
          </div>

          {session.created_at && (
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Created{' '}
              {formatDistanceToNow(new Date(session.created_at), {
                addSuffix: true,
              })}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {session.status === 'connected' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
              onClick={handleDisconnect}
              disabled={deleteSession.isPending}
            >
              {deleteSession.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unplug className="h-3.5 w-3.5" />
              )}
              Disconnect
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteSession.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "
              {session.name || session.session_id}"? This will disconnect the
              WhatsApp session and remove it from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSession.isPending}
            >
              {deleteSession.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function WhatsAppSessionsPanel() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { data: sessions, isLoading, error } = useWaSessions();

  const connectedCount =
    (sessions as WaSession[] | undefined)?.filter(
      (s) => s.status === 'connected'
    ).length || 0;
  const totalCount = (sessions as WaSession[] | undefined)?.length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Sessions</CardTitle>
          <CardDescription className="text-destructive">
            Failed to load sessions. Please try again.
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
              <CardTitle className="flex items-center gap-2">
                WhatsApp Sessions
                {connectedCount > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Manage active WhatsApp connections to your backend
                {totalCount > 0 && (
                  <span className="ml-1">
                    — {connectedCount} of {totalCount} active
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New Session
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {totalCount > 0 ? (
            <div className="space-y-2">
              {(sessions as WaSession[]).map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                <Radio className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-sm">No sessions yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Create a session to connect a WhatsApp number via your backend
                server
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddAccountDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </>
  );
}
