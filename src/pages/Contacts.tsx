import { useState } from 'react';
import { Users } from 'lucide-react';
import { ContactList } from '@/components/contacts/ContactList';
import { ContactDetail } from '@/components/contacts/ContactDetail';
import { Contact } from '@/hooks/use-contacts';

export default function Contacts() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleStartConversation = () => {
    // Navigate to conversations with this contact
    // For now, just show a message - this can be enhanced later
    console.log('Start conversation with:', selectedContact?.phone_number);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
      {/* Contact List */}
      <ContactList
        selectedId={selectedContact?.id || null}
        onSelect={setSelectedContact}
      />

      {/* Contact Detail or Empty State */}
      {selectedContact ? (
        <ContactDetail
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onStartConversation={handleStartConversation}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/30">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">Select a contact</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
            Choose a contact from the list to view their details, tags, and notes
          </p>
        </div>
      )}
    </div>
  );
}
