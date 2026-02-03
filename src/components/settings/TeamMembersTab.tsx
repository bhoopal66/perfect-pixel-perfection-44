import { Users, UserPlus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeamMembers, useTeamInvitations } from '@/hooks/use-team-management';
import { InviteTeamMemberDialog } from './InviteTeamMemberDialog';
import { AddExistingUserDialog } from './AddExistingUserDialog';
import { TeamMemberCard } from './TeamMemberCard';
import { PendingInvitationCard } from './PendingInvitationCard';

export function TeamMembersTab() {
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: invitations, isLoading: invitationsLoading } = useTeamInvitations();

  const isLoading = membersLoading || invitationsLoading;

  return (
    <div className="space-y-6">
      {/* Header with invite button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage your team and their access levels
          </p>
        </div>
        <div className="flex gap-2">
          <AddExistingUserDialog />
          <InviteTeamMemberDialog />
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Share the invite link with your team members to give them access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((invitation) => (
              <PendingInvitationCard key={invitation.id} invitation={invitation} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Members ({members?.length || 0})
          </CardTitle>
          <CardDescription>
            People with access to your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : members && members.length > 0 ? (
            <div className="space-y-3">
              {members.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm">Invite someone to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
