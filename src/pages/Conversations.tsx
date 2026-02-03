import { useState } from 'react';
import { ConversationList } from '@/components/conversations/ConversationList';
import { MessageThread } from '@/components/conversations/MessageThread';
import { Conversation } from '@/hooks/use-conversations';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const isMobile = useIsMobile();

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  // Mobile: show either list or thread
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
          <MessageThread conversationId={selectedConversation.id} />
        </div>
      );
    }
    return (
      <div className="h-full flex animate-fade-in">
        <ConversationList
          selectedId={null}
          onSelect={handleSelectConversation}
        />
      </div>
    );
  }

  // Desktop: show both
  return (
    <div className="h-full flex animate-fade-in">
      <ConversationList
        selectedId={selectedConversation?.id || null}
        onSelect={handleSelectConversation}
      />
      <MessageThread conversationId={selectedConversation?.id || null} />
    </div>
  );
}
