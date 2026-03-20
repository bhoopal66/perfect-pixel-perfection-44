import { useState } from 'react';
import { WaConversationList } from '@/components/conversations/WaConversationList';
import { WaMessageThread } from '@/components/conversations/WaMessageThread';
import { WaConversation } from '@/hooks/use-wa-conversations';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState<WaConversation | null>(null);
  const isMobile = useIsMobile();

  const handleBack = () => setSelectedConversation(null);

  if (isMobile) {
    if (selectedConversation) {
      return (
        <div className="h-full flex flex-col animate-fade-in">
          <div className="p-2 border-b border-border">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <WaMessageThread conversationId={selectedConversation.id} />
        </div>
      );
    }
    return (
      <div className="h-full flex animate-fade-in">
        <WaConversationList selectedId={null} onSelect={setSelectedConversation} />
      </div>
    );
  }

  return (
    <div className="h-full flex animate-fade-in">
      <WaConversationList
        selectedId={selectedConversation?.id || null}
        onSelect={setSelectedConversation}
      />
      <WaMessageThread conversationId={selectedConversation?.id || null} />
    </div>
  );
}
