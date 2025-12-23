-- Drop the old policy
DROP POLICY IF EXISTS "Users can mark lost items as found" ON public.items;

-- Create a policy with explicit type casting
CREATE POLICY "Users can mark lost items as found"
ON public.items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  CASE 
    WHEN type = 'lost'::item_type AND status = 'found'::item_status 
    THEN true
    ELSE (created_by = auth.uid())
  END
);