-- Add columns for finder's submission details (photos and message)
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS found_images text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS found_message text;

-- Update RLS policy to allow finder to update with their photos/message when marking as found
DROP POLICY IF EXISTS "Lost item workflow updates" ON public.items;

CREATE POLICY "Lost item workflow updates"
ON public.items
FOR UPDATE
TO authenticated
USING (
  (type = 'lost'::item_type) AND 
  (
    -- Anyone can mark approved lost items as found
    (status = 'approved'::item_status) OR
    -- Finder can approve/reject claims on items they found
    (status = 'found'::item_status AND found_by = auth.uid()) OR
    -- Owner can claim their found item
    (status = 'found'::item_status AND created_by = auth.uid())
  )
)
WITH CHECK (
  (type = 'lost'::item_type) AND 
  (
    -- Mark as found (with finder details)
    (status = 'found'::item_status) OR
    -- Owner claiming their item
    (status = 'claimed'::item_status AND created_by = auth.uid()) OR
    -- Finder resolving the item
    (status = 'resolved'::item_status)
  )
);