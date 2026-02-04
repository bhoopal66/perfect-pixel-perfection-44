import { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useCreateWhatsAppAccount, useRegeneratePairingCode } from '@/hooks/use-whatsapp-accounts';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAccountDialog({ open, onOpenChange }: AddAccountDialogProps) {
  const [step, setStep] = useState<'name' | 'pairing'>('name');
  const [accountName, setAccountName] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const hasTriggeredRegenRef = useRef(false);
  
  const { toast } = useToast();
  const createAccount = useCreateWhatsAppAccount();
  const regenerateCode = useRegeneratePairingCode();

  // Reset regeneration flag when pairing code changes
  useEffect(() => {
    hasTriggeredRegenRef.current = false;
  }, [pairingCode]);

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
              title: 'Code regenerated',
              description: 'A new pairing code has been generated.',
            });
          },
          onError: () => {
            setIsRegenerating(false);
            toast({
              title: 'Failed to regenerate',
              description: 'Could not generate a new pairing code. Please try manually.',
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

  const handleCopyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: 'Pairing code copied to clipboard.',
      });
    }
  };

  const handleClose = () => {
    setStep('name');
    setAccountName('');
    setAccountId(null);
    setPairingCode(null);
    setExpiresAt(null);
    setCopied(false);
    setIsRegenerating(false);
    hasTriggeredRegenRef.current = false;
    onOpenChange(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Connect Your WhatsApp</DialogTitle>
              <DialogDescription>
                Enter this pairing code in the Chrome extension to connect your WhatsApp account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Pairing Code Display */}
              <div className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Pairing Code</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-mono font-bold tracking-[0.5em] text-primary">
                    {pairingCode}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCode}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <p className={`text-sm mt-3 ${timeLeft < 60 && timeLeft > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {isRegenerating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Regenerating...
                    </span>
                  ) : timeLeft > 0 ? (
                    <>Expires in {formatTime(timeLeft)}</>
                  ) : (
                    <span className="text-destructive">Code expired</span>
                  )}
                </p>
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Instructions:</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Install the WhatsApp CRM Chrome Extension</li>
                  <li>Open WhatsApp Web in your browser</li>
                  <li>Click the extension icon and enter the pairing code</li>
                  <li>Your account will connect automatically</li>
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
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Code
                </Button>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
