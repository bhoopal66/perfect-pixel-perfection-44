import { useState } from 'react';
import { Check, Clock, Copy, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCancelInvitation, generateInviteLink } from '@/hooks/use-team-management';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { Tables, Enums } from '@/integrations/supabase/types';

type TeamInvitation = Tables<'team_invitations'>;
type AppRole = Enums<'app_role'>;

interface PendingInvitationCardProps {
  invitation: TeamInvitation;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent',
};

export function PendingInvitationCard({ invitation }: PendingInvitationCardProps) {
  const [copied, setCopied] = useState(false);
  const cancelInvitation = useCancelInvitation();

  const inviteLink = generateInviteLink(invitation.token);
  const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleCancel = () => {
    cancelInvitation.mutate({ id: invitation.id, email: invitation.email });
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card border-dashed">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{invitation.email}</span>
            <Badge variant="outline" className="text-xs">
              {ROLE_LABELS[invitation.role]}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            Expires {expiresIn}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="gap-1"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Link
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          disabled={cancelInvitation.isPending}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
