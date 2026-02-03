-- Add pipeline_stage column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'new_lead';

-- Add deal_value column for tracking monetary value
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS deal_value numeric DEFAULT 0;

-- Create index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_conversations_pipeline_stage ON public.conversations(pipeline_stage);

-- Update existing conversations to have a default pipeline stage based on status
UPDATE public.conversations 
SET pipeline_stage = CASE 
  WHEN status = 'resolved' THEN 'closed_won'
  WHEN status = 'pending' THEN 'qualified'
  ELSE 'new_lead'
END
WHERE pipeline_stage IS NULL;