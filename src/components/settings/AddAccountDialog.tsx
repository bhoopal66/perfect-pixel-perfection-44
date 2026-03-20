import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Wifi, WifiOff, QrCode } from 'lucide-react';
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
import { useCreateWaSession, useWaQrCode, useWaSessionStatus } from '@/hooks/use-whatsapp-api';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAccountDialog({ open, onOpenChange }: AddAccountDialogProps) {
  const [step, setStep] = useState<'name' | 'qr' | 'success'>('name');
  const [sessionName, setSessionName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { toast } = useToast();
  const createSession = useCreateWaSession();
  const { data: qrData, isLoading: qrLoading, error: qrError } = useWaQrCode(
    step === 'qr' ? sessionId : null
  );
  const { data: statusData } = useWaSessionStatus(
    step === 'qr' ? sessionId : null
  );

  // Watch for connected status
  useEffect(() => {
    if (statusData?.status === 'connected' || statusData?.connected) {
      setStep('success');
      toast({
        title: 'WhatsApp Connected!',
        description: 'Your session is now active and ready.',
      });
    }
  }, [statusData, toast]);

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      toast({ title: 'Error', description: 'Please enter a session name.', variant: 'destructive' });
      return;
    }

    try {
      const result = await createSession.mutateAsync({ name: sessionName.trim() });
      setSessionId(result.sessionId);
      setStep('qr');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create session.', variant: 'destructive' });
    }
  };

  const handleClose = () => {
    setStep('name');
    setSessionName('');
    setSessionId(null);
    onOpenChange(false);
  };

  const qrValue = qrData?.qr || qrData?.qrCode || qrData?.data?.qr || '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'name' ? (
          <>
            <DialogHeader>
              <DialogTitle>Add WhatsApp Session</DialogTitle>
              <DialogDescription>
                Create a new WhatsApp session to connect your phone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sessionName">Session Name</Label>
                <Input
                  id="sessionName"
                  placeholder="e.g., Sales Line, Support Desk"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a name that helps you identify this WhatsApp number.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreateSession} disabled={createSession.isPending}>
                {createSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Continue
              </Button>
            </div>
          </>
        ) : step === 'qr' ? (
          <>
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
              <DialogDescription>
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → Scan this QR.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-lg">
                {qrLoading ? (
                  <div className="w-52 h-52 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : qrError ? (
                  <div className="w-52 h-52 flex flex-col items-center justify-center gap-2 text-center">
                    <WifiOff className="w-8 h-8 text-destructive" />
                    <p className="text-sm text-destructive">Failed to load QR code</p>
                    <p className="text-xs text-muted-foreground">The backend may still be starting the session. It will auto-retry.</p>
                  </div>
                ) : qrValue ? (
                  <div className="relative">
                    <div className="absolute -inset-3 rounded-xl bg-[#25D366]/15 animate-[pulse_2.5s_ease-in-out_infinite]" />
                    <div className="relative bg-white p-3 rounded-lg shadow-lg ring-2 ring-[#25D366]/60">
                      <img
                        src={qrValue.startsWith('data:') ? qrValue : `data:image/png;base64,${qrValue}`}
                        alt="WhatsApp QR Code"
                        className="w-48 h-48"
                        onError={(e) => {
                          // If it's not an image, try rendering as text QR
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-52 h-52 flex flex-col items-center justify-center gap-2">
                    <QrCode className="w-8 h-8 text-muted-foreground animate-pulse" />
                    <p className="text-sm text-muted-foreground">Waiting for QR code...</p>
                  </div>
                )}

                <Badge variant="secondary" className="mt-4 text-xs">
                  <Wifi className="w-3 h-3 mr-1" />
                  {qrValue ? 'QR ready — scan with your phone' : 'Connecting to server...'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">How to connect:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Tap "Link a Device"</li>
                  <li>Point your phone at this QR code</li>
                </ol>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#25D366]" />
                Connected Successfully!
              </DialogTitle>
              <DialogDescription>
                Your WhatsApp session is now active and receiving messages.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex flex-col items-center justify-center p-6 bg-[#25D366]/10 rounded-lg border border-[#25D366]/20">
                <div className="w-16 h-16 rounded-full bg-[#25D366] flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-medium text-lg">{sessionName}</h3>
                <p className="text-sm text-[#25D366] mt-2 font-medium">
                  Ready to receive messages
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose} className="bg-[#25D366] hover:bg-[#128C7E]">
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
