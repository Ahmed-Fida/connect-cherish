-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'admin');

-- Create enum for item type
CREATE TYPE public.item_type AS ENUM ('lost', 'found');

-- Create enum for item status
CREATE TYPE public.item_status AS ENUM ('pending', 'approved', 'rejected', 'claimed', 'resolved');

-- Create enum for claim status
CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for item category
CREATE TYPE public.item_category AS ENUM ('stationery', 'electronics', 'clothing', 'id_docs', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type item_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category item_category NOT NULL,
  location TEXT NOT NULL,
  item_date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_urls TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status item_status NOT NULL DEFAULT 'pending',
  rejection_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create claims table
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  claimant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  proof_image_urls TEXT[] DEFAULT '{}',
  status claim_status NOT NULL DEFAULT 'pending',
  rejection_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    NEW.email
  );
  
  -- Insert default role as student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles (read-only for users, admin can manage via functions)
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for items
CREATE POLICY "Anyone can view approved items"
  ON public.items FOR SELECT
  TO authenticated
  USING (status IN ('approved', 'claimed', 'resolved'));

CREATE POLICY "Users can view own items"
  ON public.items FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can view all items"
  ON public.items FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create items"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own pending items"
  ON public.items FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can update any item"
  ON public.items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own pending items"
  ON public.items FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can delete any item"
  ON public.items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for claims
CREATE POLICY "Users can view own claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (claimant_id = auth.uid());

CREATE POLICY "Admins can view all claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Item owners can view claims on their items"
  ON public.claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items 
      WHERE items.id = claims.item_id 
      AND items.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create claims"
  ON public.claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = claimant_id);

CREATE POLICY "Users can update own pending claims"
  ON public.claims FOR UPDATE
  TO authenticated
  USING (claimant_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can update any claim"
  ON public.claims FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for item images
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

-- Storage policies
CREATE POLICY "Anyone can view item images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can upload item images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);