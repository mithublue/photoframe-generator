/*
  # Photo Frame Generator Schema

  ## Overview
  This migration creates the storage and database structure for the photo frame generator application.
  Users can upload frames and profile pictures to create merged Facebook-ready images.

  ## New Tables
  
  ### `frames`
  Stores pre-uploaded frame templates that users can choose from
  - `id` (uuid, primary key) - Unique identifier for each frame
  - `name` (text) - Display name of the frame
  - `image_url` (text) - URL to the frame image in storage
  - `thumbnail_url` (text) - URL to thumbnail preview
  - `created_at` (timestamptz) - Timestamp of frame creation
  
  ### `user_creations`
  Stores user-generated merged photos
  - `id` (uuid, primary key) - Unique identifier for each creation
  - `user_id` (uuid) - Reference to authenticated user
  - `frame_id` (uuid) - Reference to the frame used
  - `profile_image_url` (text) - URL to user's uploaded profile picture
  - `merged_image_url` (text) - URL to the final merged image
  - `created_at` (timestamptz) - Timestamp of creation

  ## Storage Buckets
  
  1. **frames-bucket** - Stores frame templates
  2. **profile-pictures-bucket** - Stores user uploaded profile pictures
  3. **merged-photos-bucket** - Stores final merged images

  ## Security
  
  ### RLS Policies
  
  #### frames table
  - Enable RLS on frames table
  - Allow anyone to view frames (public read access)
  - Only authenticated users can create new frames
  
  #### user_creations table
  - Enable RLS on user_creations table
  - Users can view only their own creations
  - Users can create their own creations
  - Users can delete their own creations
  
  ### Storage Policies
  - frames-bucket: Public read access, authenticated write
  - profile-pictures-bucket: Users can upload their own images
  - merged-photos-bucket: Users can access their own merged photos

  ## Important Notes
  1. All tables have RLS enabled for security
  2. Storage buckets are configured with appropriate access policies
  3. Timestamps use `timestamptz` for proper timezone handling
  4. Foreign key constraints maintain data integrity
*/

-- Create frames table
CREATE TABLE IF NOT EXISTS frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- Create user_creations table
CREATE TABLE IF NOT EXISTS user_creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  frame_id uuid REFERENCES frames(id) ON DELETE SET NULL,
  profile_image_url text NOT NULL,
  merged_image_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on frames table
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- RLS Policies for frames table
CREATE POLICY "Anyone can view frames"
  ON frames FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create frames"
  ON frames FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable RLS on user_creations table
ALTER TABLE user_creations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_creations table
CREATE POLICY "Users can view own creations"
  ON user_creations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own creations"
  ON user_creations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own creations"
  ON user_creations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('frames', 'frames', true),
  ('profile-pictures', 'profile-pictures', false),
  ('merged-photos', 'merged-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for frames bucket
CREATE POLICY "Public read access for frames"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'frames');

CREATE POLICY "Authenticated users can upload frames"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'frames');

-- Storage policies for profile-pictures bucket
CREATE POLICY "Users can upload own profile pictures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own profile pictures"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for merged-photos bucket
CREATE POLICY "Users can upload own merged photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'merged-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own merged photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'merged-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );