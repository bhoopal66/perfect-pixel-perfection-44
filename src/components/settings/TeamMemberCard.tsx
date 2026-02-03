import { useState } from 'react';
import { MoreVertical, Shield, ShieldAlert, User, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useRemoveMember, useUpdateMemberRole, type TeamMember } from '@/hooks/use-team-management';
import { useAuthStore } from '@/stores/authStore';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface TeamMemberCardProps {
  member: TeamMember;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (userId: string, selected: boolean) => void;
}

const ROLE_CONFIG: Record<AppRole, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: typeof Shield }> = {
  admin: { label: 'Admin', variant: 'default', icon: ShieldAlert },
  manager: { label: 'Manager', variant: 'secondary', icon: Shield },
  agent: { label: 'Agent', variant: 'outline', icon: User },
};

export function TeamMemberCard({ member, selectionMode, isSelected, onSelectionChange }: TeamMemberCardProps) {
  const { user } = useAuthStore();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const isCurrentUser = user?.id === member.user_id;
  const config = ROLE_CONFIG[member.role];
  const Icon = config.icon;

  const initials = member.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || member.email[0].toUpperCase();

  const handleRoleChange = (newRole: AppRole) => {
    if (newRole !== member.role) {
      updateRole.mutate({
        userId: member.user_id,
        role: newRole,
        targetEmail: member.email,
        targetName: member.full_name || undefined,
      });
    }
  };

  const handleRemove = () => {
    removeMember.mutate({
      userId: member.user_id,
      targetEmail: member.email,
      targetName: member.full_name || undefined,
    });
    setShowRemoveDialog(false);
  };

  const canSelect = selectionMode && !isCurrentUser;

  return (
    <>
      <div 
        className={`flex items-center justify-between p-4 border rounded-lg bg-card transition-colors ${
          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
        } ${canSelect ? 'cursor-pointer' : ''}`}
        onClick={() => canSelect && onSelectionChange?.(member.user_id, !isSelected)}
      >
        <div className="flex items-center gap-3">
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              disabled={isCurrentUser}
              onCheckedChange={(checked) => onSelectionChange?.(member.user_id, !!checked)}
              onClick={(e) => e.stopPropagation()}
              className={isCurrentUser ? 'opacity-30' : ''}
            />
          )}
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{member.full_name || 'Unnamed'}</span>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">You</Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{member.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className="gap-1">
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>

          {!isCurrentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleRoleChange('admin')}
                  disabled={member.role === 'admin'}
                >
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Make Admin
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRoleChange('manager')}
                  disabled={member.role === 'manager'}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Make Manager
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRoleChange('agent')}
                  disabled={member.role === 'agent'}
                >
                  <User className="w-4 h-4 mr-2" />
                  Make Agent
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowRemoveDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Remove from Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {member.full_name || member.email} from your team?
              They will lose access to all conversations and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
