import { useState } from 'react';
import { RefreshCw, Shield, ShieldAlert, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useReactivateMember, type TeamMember } from '@/hooks/use-team-management';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface DeactivatedMemberCardProps {
  member: TeamMember;
}

const ROLE_CONFIG: Record<AppRole, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: typeof Shield }> = {
  admin: { label: 'Admin', variant: 'default', icon: ShieldAlert },
  manager: { label: 'Manager', variant: 'secondary', icon: Shield },
  agent: { label: 'Agent', variant: 'outline', icon: User },
};

export function DeactivatedMemberCard({ member }: DeactivatedMemberCardProps) {
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const reactivateMember = useReactivateMember();

  const config = ROLE_CONFIG[member.role];
  const Icon = config.icon;

  const initials = member.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || member.email[0].toUpperCase();

  const handleReactivate = () => {
    reactivateMember.mutate(member.user_id);
    setShowReactivateDialog(false);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 opacity-75 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 grayscale">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">{member.full_name || 'Unnamed'}</span>
              <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
                Removed
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">{member.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className="gap-1 opacity-50">
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReactivateDialog(true)}
            className="gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reactivate
          </Button>
        </div>
      </div>

      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate {member.full_name || member.email}?
              They will regain access to all conversations and data in your organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate}>
              Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
