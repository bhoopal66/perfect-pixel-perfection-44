import { useState, useEffect, useRef } from 'react';
import { Loader2, Smartphone, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCreateWhatsAppAccount, useRegeneratePairingCode } from '@/hooks/use-whatsapp-accounts';
import { supabase } from '@/integrations/supabase/client';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAccountDialog({ open, onOpenChange }: AddAccountDialogProps) {
  const [step, setStep] = useState<'name' | 'pairing' | 'success'>('name');
  const [accountName, setAccountName] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [connectedPhoneNumber, setConnectedPhoneNumber] = useState<string | null>(null);
  const hasTriggeredRegenRef = useRef(false);
  
  const { toast } = useToast();
  const createAccount = useCreateWhatsAppAccount();
  const regenerateCode = useRegeneratePairingCode();

  // Reset regeneration flag when pairing code changes
  useEffect(() => {
    hasTriggeredRegenRef.current = false;
  }, [pairingCode]);

  // Realtime subscription to detect when account connects
  useEffect(() => {
    if (!accountId || step !== 'pairing') return;

    const channel = supabase
      .channel(`whatsapp-account-${accountId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_accounts',
          filter: `id=eq.${accountId}`,
        },
        (payload) => {
          const newData = payload.new as { is_connected: boolean; phone_number: string | null };
          if (newData.is_connected) {
            setConnectedPhoneNumber(newData.phone_number);
            setStep('success');
            toast({
              title: 'WhatsApp Connected!',
              description: 'Your WhatsApp account has been successfully linked.',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, step, toast]);

  // Countdown timer for pairing code with auto-regeneration
  useEffect(() => {
    if (!expiresAt || step !== 'pairing') return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && accountId && !hasTriggeredRegenRef.current && !isRegenerating) {
        hasTriggeredRegenRef.current = true;
        clearInterval(interval);
        setIsRegenerating(true);
        
        // Auto-regenerate the code
        regenerateCode.mutate(accountId, {
          onSuccess: (data) => {
            setPairingCode(data.connection_token);
            setExpiresAt(new Date(data.connection_token_expires_at!));
            setTimeLeft(300);
            setIsRegenerating(false);
            toast({
              title: 'QR Code refreshed',
              description: 'A new QR code has been generated.',
            });
          },
          onError: () => {
            setIsRegenerating(false);
            toast({
              title: 'Failed to refresh',
              description: 'Could not generate a new QR code. Please try again.',
              variant: 'destructive',
            });
          },
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, step, accountId, isRegenerating, regenerateCode, toast]);

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an account name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const account = await createAccount.mutateAsync({ accountName: accountName.trim() });
      setAccountId(account.id);
      setPairingCode(account.connection_token);
      setExpiresAt(new Date(account.connection_token_expires_at!));
      setTimeLeft(300);
      setStep('pairing');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setStep('name');
    setAccountName('');
    setAccountId(null);
    setPairingCode(null);
    setExpiresAt(null);
    setIsRegenerating(false);
    setConnectedPhoneNumber(null);
    hasTriggeredRegenRef.current = false;
    onOpenChange(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate QR code data - this would typically be a deep link or connection URL
  const qrCodeData = pairingCode 
    ? `whatsapp-crm://connect?code=${pairingCode}&account=${accountId}`
    : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'name' ? (
          <>
            <DialogHeader>
              <DialogTitle>Add WhatsApp Account</DialogTitle>
              <DialogDescription>
                Give your WhatsApp account a name to identify it in the CRM.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="e.g., Sales Line, Support Desk"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a name that helps you identify this WhatsApp number.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAccount}
                disabled={createAccount.isPending}
              >
                {createAccount.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Continue
              </Button>
            </div>
          </>
        ) : step === 'pairing' ? (
          <>
            <DialogHeader>
              <DialogTitle>Connect Your WhatsApp</DialogTitle>
              <DialogDescription>
                Scan this QR code with your WhatsApp mobile app to connect your account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* QR Code Display */}
              <div className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-lg">
                <div className="relative">
                  {/* Pulse rings animation */}
                  {!isRegenerating && timeLeft > 0 && (
                    <>
                      <div className="absolute inset-0 -m-3 rounded-xl bg-[#25D366]/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                      <div className="absolute inset-0 -m-2 rounded-xl bg-[#25D366]/10 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
                    </>
                  )}
                  
                  {isRegenerating ? (
                    <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="relative bg-white p-3 rounded-lg shadow-lg ring-2 ring-[#25D366]/30">
                      <QRCodeSVG
                        value={qrCodeData}
                        size={180}
                        level="M"
                        includeMargin={false}
                        fgColor="#128C7E"
                      />
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex items-center gap-2">
                  <Badge 
                    variant={timeLeft < 60 && timeLeft > 0 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {isRegenerating ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Refreshing...
                      </span>
                    ) : timeLeft > 0 ? (
                      `Expires in ${formatTime(timeLeft)}`
                    ) : (
                      'Expired'
                    )}
                  </Badge>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  How to connect:
                </h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Tap "Link a Device"</li>
                  <li>Point your phone at this QR code to scan</li>
                </ol>
              </div>

              {timeLeft === 0 && !isRegenerating && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (accountId) {
                      setIsRegenerating(true);
                      regenerateCode.mutate(accountId, {
                        onSuccess: (data) => {
                          setPairingCode(data.connection_token);
                          setExpiresAt(new Date(data.connection_token_expires_at!));
                          setTimeLeft(300);
                          setIsRegenerating(false);
                          hasTriggeredRegenRef.current = false;
                        },
                        onError: () => {
                          setIsRegenerating(false);
                        },
                      });
                    }
                  }}
                  disabled={regenerateCode.isPending}
                >
                  Refresh QR Code
                </Button>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </>
        ) : (
          // Success step
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#25D366]" />
                Connected Successfully!
              </DialogTitle>
              <DialogDescription>
                Your WhatsApp account has been linked to the CRM.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex flex-col items-center justify-center p-6 bg-[#25D366]/10 rounded-lg border border-[#25D366]/20">
                <div className="w-16 h-16 rounded-full bg-[#25D366] flex items-center justify-center mb-4 animate-scale-in">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-medium text-lg">{accountName}</h3>
                {connectedPhoneNumber && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {connectedPhoneNumber}
                  </p>
                )}
                <p className="text-sm text-[#25D366] mt-2 font-medium">
                  Ready to receive messages
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose} className="bg-[#25D366] hover:bg-[#128C7E]">
                Get Started
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
