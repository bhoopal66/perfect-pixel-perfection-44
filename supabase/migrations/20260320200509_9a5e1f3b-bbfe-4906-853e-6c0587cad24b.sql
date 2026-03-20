
-- 1. WhatsApp Sessions (one per connected phone number)
CREATE TABLE IF NOT EXISTS public.wa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  status TEXT DEFAULT 'disconnected',
  phone TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Conversations (one per phone number per session)
CREATE TABLE IF NOT EXISTS public.wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES wa_sessions(session_id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  phone TEXT NOT NULL,
  contact_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  channel TEXT DEFAULT 'whatsapp',
  assigned_to UUID,
  status TEXT DEFAULT 'open',
  contact_id UUID REFERENCES public.contacts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, phone)
);

-- 3. Messages
CREATE TABLE IF NOT EXISTS public.wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES wa_sessions(session_id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  jid TEXT,
  from_me BOOLEAN DEFAULT false,
  sender_phone TEXT,
  sender_name TEXT,
  recipient_phone TEXT,
  body TEXT,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  status TEXT DEFAULT 'received',
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, session_id)
);

-- 4. Message Templates
CREATE TABLE IF NOT EXISTS public.wa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wa_conv_session ON wa_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON wa_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_wa_conv_assigned ON wa_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wa_conv_contact ON wa_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_org ON wa_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_session ON wa_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_sender ON wa_messages(sender_phone);
CREATE INDEX IF NOT EXISTS idx_wa_msg_recipient ON wa_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_wa_msg_timestamp ON wa_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_wa_msg_jid ON wa_messages(jid);
CREATE INDEX IF NOT EXISTS idx_wa_msg_org ON wa_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_org ON wa_sessions(organization_id);

-- RLS
ALTER TABLE wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;

-- wa_sessions policies
CREATE POLICY "Users can view sessions in their org" ON wa_sessions FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Admins can insert sessions" ON wa_sessions FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update sessions" ON wa_sessions FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete sessions" ON wa_sessions FOR DELETE USING (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- wa_conversations policies
CREATE POLICY "Users can view conversations in their org" ON wa_conversations FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert conversations in their org" ON wa_conversations FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update conversations in their org" ON wa_conversations FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- wa_messages policies
CREATE POLICY "Users can view messages in their org" ON wa_messages FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert messages in their org" ON wa_messages FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

-- wa_templates policies
CREATE POLICY "Users can view templates in their org" ON wa_templates FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Admins can manage templates" ON wa_templates FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update templates" ON wa_templates FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete templates" ON wa_templates FOR DELETE USING (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE wa_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE wa_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE wa_messages;

-- Auto-link conversations to CRM contacts
CREATE OR REPLACE FUNCTION public.link_wa_conversation_to_contact()
RETURNS TRIGGER AS $$
BEGIN
  SELECT id INTO NEW.contact_id
  FROM public.contacts
  WHERE phone_number = NEW.phone
    AND organization_id = NEW.organization_id
  LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_link_wa_crm_contact
  BEFORE INSERT ON wa_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.link_wa_conversation_to_contact();
