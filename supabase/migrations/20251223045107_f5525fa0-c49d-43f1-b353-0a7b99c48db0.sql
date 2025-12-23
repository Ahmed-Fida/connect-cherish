-- Drop both custom policies
DROP POLICY IF EXISTS "Users can mark lost items as found" ON public.items;
DROP POLICY IF EXISTS "Owners can claim their found lost items" ON public.items;

-- Create a single unified policy for lost item workflow
-- This allows: any user to mark approved lost items as found, and owners to claim their found items
CREATE POLICY "Lost item workflow updates"
ON public.items
FOR UPDATE
TO authenticated
USING (
  type = 'lost'::item_type AND (
    status = 'approved'::item_status OR 
    (status = 'found'::item_status AND created_by = auth.uid())
  )
)
WITH CHECK (
  type = 'lost'::item_type AND (
    status = 'found'::item_status OR 
    (status = 'claimed'::item_status AND created_by = auth.uid())
  )
);