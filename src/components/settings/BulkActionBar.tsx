import { useState } from 'react';
import { Shield, ShieldAlert, User, UserX, X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { useBulkRemoveMembers, useBulkUpdateRoles } from '@/hooks/use-team-management';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface BulkActionBarProps {
  selectedCount: number;
  selectedUserIds: string[];
  onClearSelection: () => void;
  showRemoveDialog?: boolean;
  onRemoveDialogChange?: (open: boolean) => void;
  showRoleDropdown?: boolean;
  onRoleDropdownChange?: (open: boolean) => void;
}

export function BulkActionBar({ 
  selectedCount, 
  selectedUserIds, 
  onClearSelection,
  showRemoveDialog: externalShowRemoveDialog,
  onRemoveDialogChange,
  showRoleDropdown: externalShowRoleDropdown,
  onRoleDropdownChange,
}: BulkActionBarProps) {
  const [internalShowRemoveDialog, setInternalShowRemoveDialog] = useState(false);
  const [internalShowRoleDropdown, setInternalShowRoleDropdown] = useState(false);
  const bulkUpdateRoles = useBulkUpdateRoles();
  const bulkRemove = useBulkRemoveMembers();

  // Support both controlled and uncontrolled dialog state
  const showRemoveDialog = externalShowRemoveDialog ?? internalShowRemoveDialog;
  const setShowRemoveDialog = onRemoveDialogChange ?? setInternalShowRemoveDialog;
  
  // Support both controlled and uncontrolled dropdown state
  const showRoleDropdown = externalShowRoleDropdown ?? internalShowRoleDropdown;
  const setShowRoleDropdown = onRoleDropdownChange ?? setInternalShowRoleDropdown;

  const handleBulkRoleChange = (role: AppRole) => {
    bulkUpdateRoles.mutate(
      { userIds: selectedUserIds, role },
      { onSuccess: () => {
        onClearSelection();
        setShowRoleDropdown(false);
      }}
    );
  };

  const handleBulkRemove = () => {
    bulkRemove.mutate(selectedUserIds, { onSuccess: onClearSelection });
    setShowRemoveDialog(false);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg">
          <span className="font-medium">
            {selectedCount} member{selectedCount > 1 ? 's' : ''} selected
          </span>
          
          <div className="h-4 w-px bg-primary-foreground/30" />
          
          <DropdownMenu open={showRoleDropdown} onOpenChange={setShowRoleDropdown}>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Change Role
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkRoleChange('admin')}>
                <ShieldAlert className="w-4 h-4 mr-2" />
                Make Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkRoleChange('manager')}>
                <Shield className="w-4 h-4 mr-2" />
                Make Manager
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkRoleChange('agent')}>
                <User className="w-4 h-4 mr-2" />
                Make Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowRemoveDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <UserX className="w-4 h-4 mr-1" />
            Remove
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl+A</kbd> Select all</p>
                  <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl+R</kbd> Change role</p>
                  <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Delete</kbd> Remove selected</p>
                  <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> Clear selection</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedCount} Team Members</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedCount} member{selectedCount > 1 ? 's' : ''} from your team?
              They will lose access to all conversations and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove {selectedCount} Member{selectedCount > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
