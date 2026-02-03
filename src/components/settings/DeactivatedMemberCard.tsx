import { useState } from 'react';
import { RefreshCw, Shield, ShieldAlert, Trash2, User } from 'lucide-react';
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
import { useReactivateMember, usePermanentlyDeleteMember, type TeamMember } from '@/hooks/use-team-management';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const reactivateMember = useReactivateMember();
  const permanentlyDeleteMember = usePermanentlyDeleteMember();

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

  const handlePermanentDelete = () => {
    permanentlyDeleteMember.mutate(member.user_id);
    setShowDeleteDialog(false);
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

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3" />
            Delete
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Team Member</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Are you sure you want to permanently remove {member.full_name || member.email} from your organization?
              </span>
              <span className="block font-medium text-destructive">
                This action cannot be undone. The user will lose all association with your organization and would need to be re-invited to rejoin.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
