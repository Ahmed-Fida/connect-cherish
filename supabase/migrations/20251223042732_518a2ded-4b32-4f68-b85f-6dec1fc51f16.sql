-- Add columns to track who found the item and where
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS found_by uuid,
ADD COLUMN IF NOT EXISTS found_location text,
ADD COLUMN IF NOT EXISTS found_at timestamp with time zone;

-- Allow any authenticated user to update lost items to mark as found
CREATE POLICY "Users can mark lost items as found"
ON public.items
FOR UPDATE
USING (
  type = 'lost' AND 
  status = 'approved' AND 
  auth.uid() IS NOT NULL
)
WITH CHECK (
  type = 'lost' AND 
  status = 'found' AND 
  found_by = auth.uid()
);