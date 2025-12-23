-- Drop ALL existing UPDATE policies on items table
DROP POLICY IF EXISTS "Admins can update any item" ON public.items;
DROP POLICY IF EXISTS "Anyone can mark lost items as found" ON public.items;
DROP POLICY IF EXISTS "Finder can resolve item" ON public.items;
DROP POLICY IF EXISTS "Owner can claim their found item" ON public.items;
DROP POLICY IF EXISTS "Users can update own pending items" ON public.items;

-- Recreate as PERMISSIVE policies (explicitly using AS PERMISSIVE for clarity)

-- Admin can update any item
CREATE POLICY "Admins can update any item"
ON public.items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can update their own pending items
CREATE POLICY "Users can update own pending items"
ON public.items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND status = 'pending'::item_status)
WITH CHECK (created_by = auth.uid() AND status = 'pending'::item_status);

-- Anyone can mark approved lost items as found (only if not already found)
CREATE POLICY "Anyone can mark lost items as found"
ON public.items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (type = 'lost'::item_type AND status = 'approved'::item_status AND found_by IS NULL)
WITH CHECK (type = 'lost'::item_type AND status = 'found'::item_status AND found_by = auth.uid());

-- Owner can submit claim proof on their found item
CREATE POLICY "Owner can claim their found item"
ON public.items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (type = 'lost'::item_type AND status = 'found'::item_status AND created_by = auth.uid())
WITH CHECK (type = 'lost'::item_type AND status = 'claimed'::item_status);

-- Finder can resolve the item after verifying ownership
CREATE POLICY "Finder can resolve item"
ON public.items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (type = 'lost'::item_type AND status = 'found'::item_status AND found_by = auth.uid())
WITH CHECK (type = 'lost'::item_type AND status = 'resolved'::item_status);