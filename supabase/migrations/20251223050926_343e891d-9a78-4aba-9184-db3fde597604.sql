-- Drop and recreate with explicit WITH CHECK to prevent conflicts with other UPDATE policies
DROP POLICY IF EXISTS "Users can update own pending items" ON public.items;

CREATE POLICY "Users can update own pending items"
ON public.items
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND status = 'pending'::item_status)
WITH CHECK (created_by = auth.uid() AND status = 'pending'::item_status);