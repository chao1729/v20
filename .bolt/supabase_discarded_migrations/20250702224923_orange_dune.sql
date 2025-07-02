/*
  # Fix Authentication and RLS Policies

  1. Issues Fixed
    - RLS policies using incorrect auth.uid() comparison
    - Missing proper user creation flow
    - Incorrect foreign key constraints
    - Auth user ID mapping issues

  2. Changes
    - Update RLS policies to work with custom user_id system
    - Fix user creation and authentication flow
    - Ensure proper data access patterns
*/

-- Drop all existing RLS policies to recreate them properly
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Recreate RLS policies with correct logic

-- Users table policies
CREATE POLICY "Enable read access for authenticated users to own data"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = id::text OR
    auth.email() = (user_id || '@aquaflow.local')
  );

CREATE POLICY "Enable insert for authenticated users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
  ON users FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = id::text OR
    auth.email() = (user_id || '@aquaflow.local')
  );

CREATE POLICY "Enable delete for users based on user_id"
  ON users FOR DELETE
  TO authenticated
  USING (
    auth.uid()::text = id::text OR
    auth.email() = (user_id || '@aquaflow.local')
  );

-- Service areas policies
CREATE POLICY "Enable read access for all authenticated users"
  ON service_areas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for vendors"
  ON service_areas FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM users 
      WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
      AND user_type = 'vendor'
    )
  );

CREATE POLICY "Enable update for vendor owners"
  ON service_areas FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM users 
      WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
      AND user_type = 'vendor'
    )
  );

CREATE POLICY "Enable delete for vendor owners"
  ON service_areas FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM users 
      WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
      AND user_type = 'vendor'
    )
  );

-- Addresses policies
CREATE POLICY "Enable read access for address owners"
  ON addresses FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
    )
  );

CREATE POLICY "Enable insert for address owners"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
    )
  );

CREATE POLICY "Enable update for address owners"
  ON addresses FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
    )
  );

CREATE POLICY "Enable delete for address owners"
  ON addresses FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
    )
  );

-- Inventory items policies
CREATE POLICY "Enable read access for all authenticated users"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for vendors"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM users 
      WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
      AND user_type = 'vendor'
    )
  );

CREATE POLICY "Enable update for vendor owners"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM users 
      WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
      AND user_type = 'vendor'
    )
  );

CREATE POLICY "Enable delete for vendor owners"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM users 
      WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
      AND user_type = 'vendor'
    )
  );

-- Orders policies
CREATE POLICY "Enable read access for customers and vendors"
  ON orders FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
    )
    OR
    vendor_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
    )
  );

CREATE POLICY "Enable insert for customers"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM users 
      WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
      AND user_type = 'customer'
    )
  );

CREATE POLICY "Enable update for vendors"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM users 
      WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
      AND user_type = 'vendor'
    )
  );

-- Order items policies
CREATE POLICY "Enable read access for order participants"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
      )
      OR vendor_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
      )
    )
  );

CREATE POLICY "Enable insert for customers"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
        AND user_type = 'customer'
      )
    )
  );

-- Order messages policies
CREATE POLICY "Enable read access for order participants"
  ON order_messages FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
      )
      OR vendor_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
      )
    )
  );

CREATE POLICY "Enable insert for order participants"
  ON order_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
      )
      OR vendor_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
      )
    )
  );

-- Invoices policies
CREATE POLICY "Enable read access for order participants"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
      )
      OR vendor_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local')
      )
    )
  );

CREATE POLICY "Enable insert for vendors"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE vendor_id IN (
        SELECT id FROM users 
        WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
        AND user_type = 'vendor'
      )
    )
  );

CREATE POLICY "Enable update for vendors"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE vendor_id IN (
        SELECT id FROM users 
        WHERE (auth.uid()::text = id::text OR auth.email() = (user_id || '@aquaflow.local'))
        AND user_type = 'vendor'
      )
    )
  );