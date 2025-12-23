-- The issue is that policies are RESTRICTIVE - ALL must pass
-- We need to make them PERMISSIVE so only ONE needs to pass

-- Drop all conflicting UPDATE policies
DROP POLICY IF EXISTS "Lost item workflow updates" ON public.items;
DROP POLICY IF EXISTS "Users can update own pending items" ON public.items;

-- Create PERMISSIVE policy for owners updating their pending items
CREATE POLICY "Users can update own pending items"
ON public.items
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND status = 'pending'::item_status)
WITH CHECK (created_by = auth.uid() AND status = 'pending'::item_status);

-- Create PERMISSIVE policy for marking lost items as found (by anyone except owner)
CREATE POLICY "Anyone can mark lost items as found"
ON public.items
FOR UPDATE
TO authenticated
USING (type = 'lost'::item_type AND status = 'approved'::item_status)
WITH CHECK (type = 'lost'::item_type AND status = 'found'::item_status);

-- Create PERMISSIVE policy for owner claiming their found item
CREATE POLICY "Owner can claim their found item"
ON public.items
FOR UPDATE
TO authenticated
USING (type = 'lost'::item_type AND status = 'found'::item_status AND created_by = auth.uid())
WITH CHECK (type = 'lost'::item_type AND status = 'claimed'::item_status);

-- Create PERMISSIVE policy for finder resolving the item
CREATE POLICY "Finder can resolve item"
ON public.items
FOR UPDATE
TO authenticated
USING (type = 'lost'::item_type AND status = 'found'::item_status AND found_by = auth.uid())
WITH CHECK (type = 'lost'::item_type AND status = 'resolved'::item_status);