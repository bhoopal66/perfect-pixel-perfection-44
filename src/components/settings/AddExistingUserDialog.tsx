import { useState, useEffect } from 'react';
import { UserPlus, Search, Loader2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSearchUsers, useAddUserToOrganization } from '@/hooks/use-team-management';
import type { Enums } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type AppRole = Enums<'app_role'>;

interface AvailableUser {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Full access to all settings and team management',
  manager: 'Can manage conversations and view reports',
  agent: 'Can handle assigned conversations',
};

export function AddExistingUserDialog() {
  const [open, setOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [role, setRole] = useState<AppRole>('agent');

  const { data: searchResults, isLoading: isSearching } = useSearchUsers(debouncedSearch);
  const addUser = useAddUserToOrganization();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchEmail);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    await addUser.mutateAsync({ userId: selectedUser.user_id, role });
    setSearchEmail('');
    setSelectedUser(null);
    setRole('agent');
    setOpen(false);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchEmail('');
      setSelectedUser(null);
      setRole('agent');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Existing User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Existing User</DialogTitle>
            <DialogDescription>
              Search for users who have already signed up and add them to your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">Search by Email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search email..."
                  className="pl-9"
                  value={searchEmail}
                  onChange={(e) => {
                    setSearchEmail(e.target.value);
                    setSelectedUser(null);
                  }}
                />
              </div>
            </div>

            {/* Search Results */}
            {searchEmail.length >= 2 && (
              <div className="border rounded-lg max-h-48 overflow-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="divide-y">
                    {searchResults.map((user) => (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className={cn(
                          'w-full p-3 flex items-center gap-3 text-left hover:bg-accent transition-colors',
                          selectedUser?.user_id === user.user_id && 'bg-accent'
                        )}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {user.full_name || user.email}
                          </p>
                          {user.full_name && (
                            <p className="text-sm text-muted-foreground truncate">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <User className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No available users found</p>
                    <p className="text-xs mt-1">Users must sign up first</p>
                  </div>
                )}
              </div>
            )}

            {/* Selected User Preview */}
            {selectedUser && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(selectedUser.full_name, selectedUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedUser.full_name || selectedUser.email}
                    </p>
                    {selectedUser.full_name && (
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Role Selection */}
            {selectedUser && (
              <div className="space-y-2">
                <Label htmlFor="role">Assign Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Agent</span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_DESCRIPTIONS.agent}
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Manager</span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_DESCRIPTIONS.manager}
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Admin</span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_DESCRIPTIONS.admin}
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedUser || addUser.isPending}
            >
              {addUser.isPending ? 'Adding...' : 'Add to Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
