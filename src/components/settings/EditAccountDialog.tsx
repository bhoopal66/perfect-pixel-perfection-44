import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, X, Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  WhatsAppAccount, 
  useUpdateWhatsAppAccount,
  useUploadProfilePicture,
} from '@/hooks/use-whatsapp-accounts';
import { useAuthStore } from '@/stores/authStore';

interface EditAccountDialogProps {
  account: WhatsAppAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({ account, open, onOpenChange }: EditAccountDialogProps) {
  const [accountName, setAccountName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { organization } = useAuthStore();
  const updateAccount = useUpdateWhatsAppAccount();
  const uploadPicture = useUploadProfilePicture();

  useEffect(() => {
    if (account) {
      setAccountName(account.account_name);
      setDisplayName(account.display_name || '');
      setPreviewUrl(account.profile_picture_url);
      setSelectedFile(null);
    }
  }, [account]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file.',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!account) return;
    
    if (!accountName.trim()) {
      toast({
        title: 'Error',
        description: 'Account name is required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      let profilePictureUrl: string | null | undefined = undefined;

      // Upload new image if selected
      if (selectedFile && organization) {
        profilePictureUrl = await uploadPicture.mutateAsync({
          organizationId: organization.id,
          accountId: account.id,
          file: selectedFile,
        });
      } else if (previewUrl === null && account.profile_picture_url) {
        // Image was removed
        profilePictureUrl = null;
      }

      await updateAccount.mutateAsync({
        accountId: account.id,
        accountName: accountName.trim(),
        displayName: displayName.trim() || null,
        profilePictureUrl,
      });
      
      toast({
        title: 'Account updated',
        description: 'WhatsApp account details have been saved.',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update account.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    if (account) {
      setAccountName(account.account_name);
      setDisplayName(account.display_name || '');
      setPreviewUrl(account.profile_picture_url);
      setSelectedFile(null);
    }
    onOpenChange(false);
  };

  const initials = account?.display_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || account?.account_name?.charAt(0).toUpperCase() || '?';

  const isLoading = updateAccount.isPending || uploadPicture.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit WhatsApp Account</DialogTitle>
          <DialogDescription>
            Update the account details and profile picture for this WhatsApp connection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Profile Picture Upload */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={previewUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {previewUrl && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {previewUrl ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-accountName">Account Name *</Label>
            <Input
              id="edit-accountName"
              placeholder="e.g., Sales Line, Support Desk"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Internal name to identify this WhatsApp account in the CRM.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-displayName">Display Name</Label>
            <Input
              id="edit-displayName"
              placeholder="e.g., Acme Support"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional display name shown to contacts.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}