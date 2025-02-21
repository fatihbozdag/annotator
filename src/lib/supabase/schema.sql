-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Annotations are viewable by admin users" ON annotations;
DROP POLICY IF EXISTS "Annotators can insert their own annotations" ON annotations;
DROP POLICY IF EXISTS "Annotators can update their own annotations" ON annotations;
DROP POLICY IF EXISTS "Annotators can view their own annotations" ON annotations;

-- Drop and recreate the annotations table
DROP TABLE IF EXISTS annotations;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'annotator' CHECK (role IN ('admin', 'annotator')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create annotations table with proper foreign key
CREATE TABLE IF NOT EXISTS annotations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  annotator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sentence text NOT NULL,
  target_tense text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  notes text,
  cefr_level text NOT NULL,
  original_text text NOT NULL,
  learner_id text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(annotator_id, sentence)
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create policies for annotations
CREATE POLICY "Annotations are viewable by admin users"
  ON annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Annotators can view their own annotations"
  ON annotations FOR SELECT
  USING (annotator_id = auth.uid());

CREATE POLICY "Annotators can insert their own annotations"
  ON annotations FOR INSERT
  WITH CHECK (
    auth.uid() = annotator_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'annotator' OR profiles.role = 'admin')
    )
  );

CREATE POLICY "Annotators can update their own annotations"
  ON annotations FOR UPDATE
  USING (annotator_id = auth.uid());

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'annotator');
  RETURN new;
END;
$$;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 