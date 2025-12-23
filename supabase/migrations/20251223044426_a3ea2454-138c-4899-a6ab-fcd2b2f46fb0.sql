-- Drop the old policy
DROP POLICY IF EXISTS "Users can mark lost items as found" ON public.items;

-- Create a more permissive policy that allows the update
CREATE POLICY "Users can mark lost items as found"
ON public.items
FOR UPDATE
TO authenticated
USING (
  type = 'lost' AND 
  status = 'approved'
)
WITH CHECK (
  type = 'lost' AND 
  status = 'found'
);