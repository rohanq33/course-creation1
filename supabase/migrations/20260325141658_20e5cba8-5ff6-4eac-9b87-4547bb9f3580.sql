
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'anonymous',
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  answer_mode text,
  sources jsonb DEFAULT '[]'::jsonb,
  suggested_queries jsonb DEFAULT '[]'::jsonb,
  course_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages for demo" ON public.chat_messages FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert chat messages for demo" ON public.chat_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete chat messages for demo" ON public.chat_messages FOR DELETE TO public USING (true);
