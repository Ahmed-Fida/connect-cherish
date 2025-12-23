-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can mark lost items as found" ON public.items;

-- Create a permissive policy instead (uses OR logic with other permissive policies)
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
  status = 'found' AND 
  found_by = auth.uid()
);

-- Also allow owners to claim their found items
CREATE POLICY "Owners can claim their found lost items"
ON public.items
FOR UPDATE
TO authenticated
USING (
  type = 'lost' AND 
  status = 'found' AND 
  created_by = auth.uid()
)
WITH CHECK (
  type = 'lost' AND 
  status = 'claimed' AND 
  created_by = auth.uid()
);