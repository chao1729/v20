/*
  # Create service_areas table

  1. New Tables
    - `service_areas`
      - `id` (uuid, primary key)
      - `name` (text, not null) - Name of the service area
      - `vendor_id` (uuid, foreign key) - References users table
      - `vendor_name` (text, not null) - Name of the vendor
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `service_areas` table
    - Add policy for authenticated users to read service areas
    - Add policy for vendors to manage their own service areas

  3. Extensions
    - Enable uuid-ossp extension for UUID generation
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create service_areas table
CREATE TABLE IF NOT EXISTS public.service_areas (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    vendor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    vendor_name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

-- Create policies for service_areas table
CREATE POLICY "Anyone can read service areas"
    ON public.service_areas
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Vendors can insert their own service areas"
    ON public.service_areas
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update their own service areas"
    ON public.service_areas
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can delete their own service areas"
    ON public.service_areas
    FOR DELETE
    TO authenticated
    USING (auth.uid() = vendor_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_service_areas_vendor_id ON public.service_areas(vendor_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_created_at ON public.service_areas(created_at);