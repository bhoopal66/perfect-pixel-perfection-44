import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Smartphone, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
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
import { useCreateWhatsAppAccount } from '@/hooks/use-whatsapp-accounts';
import { supabase } from '@/integrations/supabase/client';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAccountDialog({ open, onOpenChange }: AddAccountDialogProps) {
  const [step, setStep] = useState<'name' | 'pairing' | 'success'>('name');
  const [accountName, setAccountName] = useState('');
  const [qrString, setQrString] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [connectedPhoneNumber, setConnectedPhoneNumber] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { toast } = useToast();
  const createAccount = useCreateWhatsAppAccount();

  // Fetch QR code from the backend function
  const fetchQrCode = useCallback(async () => {
    setIsLoadingQr(true);
    setQrError(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const params = accountId ? `?accountId=${accountId}` : '';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/whatsapp-qr${params}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch QR (${response.status})`);
      }

      const data = await response.json();
      // Expect { qr: "base64-or-string-data" } from your whatsapp-web.js backend
      if (data.qr) {
        setQrString(data.qr);
        setQrError(null);
      } else {
        setQrError('Waiting for QR code from WhatsApp...');
      }
    } catch (error: any) {
      setQrError(error.message || 'Failed to fetch QR code');
    } finally {
      setIsLoadingQr(false);
    }
  }, [accountId]);

  // Poll for QR code updates when in pairing step
  useEffect(() => {
    if (step !== 'pairing') return;

    // Initial fetch
    fetchQrCode();

    // Poll every 5 seconds for new QR codes (they rotate ~every 20s)
    pollingRef.current = setInterval(fetchQrCode, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step, fetchQrCode]);

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
            if (pollingRef.current) clearInterval(pollingRef.current);
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
    setQrString(null);
    setQrError(null);
    setIsLoadingQr(false);
    setConnectedPhoneNumber(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
    onOpenChange(false);
  };

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
                  {isLoadingQr && !qrString ? (
                    <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : qrError && !qrString ? (
                    <div className="w-48 h-48 flex flex-col items-center justify-center bg-muted rounded-lg gap-3 p-4">
                      <AlertCircle className="w-8 h-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground text-center">{qrError}</p>
                    </div>
                  ) : qrString ? (
                    <>
                      {/* Pulsing glow */}
                      <div className="absolute -inset-4 rounded-2xl bg-[#25D366]/20 animate-[pulse_2s_ease-in-out_infinite]" />
                      <div className="absolute -inset-2 rounded-xl border-2 border-[#25D366]/40 animate-[pulse_1.5s_ease-in-out_infinite]" />
                      <div className="relative bg-white p-3 rounded-lg shadow-lg ring-2 ring-[#25D366]">
                        <QRCodeSVG
                          value={qrString}
                          size={180}
                          level="M"
                          includeMargin={false}
                          fgColor="#128C7E"
                        />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {isLoadingQr ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading...
                      </span>
                    ) : qrString ? (
                      'Scan with WhatsApp'
                    ) : (
                      'Waiting for QR...'
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

              {qrError && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={fetchQrCode}
                  disabled={isLoadingQr}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingQr ? 'animate-spin' : ''}`} />
                  Retry
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
