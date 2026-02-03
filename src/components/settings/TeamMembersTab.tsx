import { useState, useMemo } from 'react';
import { Users, UserPlus, UserX, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTeamMembers, useTeamInvitations, useDeactivatedMembers } from '@/hooks/use-team-management';
import { InviteTeamMemberDialog } from './InviteTeamMemberDialog';
import { AddExistingUserDialog } from './AddExistingUserDialog';
import { TeamMemberCard } from './TeamMemberCard';
import { PendingInvitationCard } from './PendingInvitationCard';
import { DeactivatedMemberCard } from './DeactivatedMemberCard';

export function TeamMembersTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: invitations, isLoading: invitationsLoading } = useTeamInvitations();
  const { data: deactivatedMembers, isLoading: deactivatedLoading } = useDeactivatedMembers();

  const isLoading = membersLoading || invitationsLoading;

  const filteredMembers = useMemo(() => {
    if (!members || !searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.email.toLowerCase().includes(query) ||
        member.full_name?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const filteredDeactivatedMembers = useMemo(() => {
    if (!deactivatedMembers || !searchQuery.trim()) return deactivatedMembers;
    const query = searchQuery.toLowerCase();
    return deactivatedMembers.filter(
      (member) =>
        member.email.toLowerCase().includes(query) ||
        member.full_name?.toLowerCase().includes(query)
    );
  }, [deactivatedMembers, searchQuery]);

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

      {/* Search Input */}
      {(members && members.length > 3) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

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
            Team Members ({filteredMembers?.length || 0})
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
          ) : filteredMembers && filteredMembers.length > 0 ? (
            <div className="space-y-3">
              {filteredMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No members match "{searchQuery}"</p>
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

      {/* Deactivated Members */}
      {!deactivatedLoading && filteredDeactivatedMembers && filteredDeactivatedMembers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserX className="w-4 h-4" />
              Removed Members ({filteredDeactivatedMembers.length})
            </CardTitle>
            <CardDescription>
              Previously removed team members who can be reactivated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredDeactivatedMembers.map((member) => (
              <DeactivatedMemberCard key={member.id} member={member} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
