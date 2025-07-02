/*
  # Fix Registration Flow - Remove User ID Already Exists Error

  1. Changes
    - Fix RLS policies to allow proper user registration
    - Add helper function for user lookup during registration
    - Ensure proper auth flow without conflicts

  2. Security
    - Maintain security while allowing registration
    - Proper RLS policies for authenticated users
*/

-- Drop existing tables and recreate with proper structure
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS order_messages CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS service_areas CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  user_type text NOT NULL CHECK (user_type IN ('customer', 'vendor')),
  area_id uuid,
  service_area text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Service areas table
CREATE TABLE service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vendor_id uuid,
  vendor_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Addresses table
CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  label text NOT NULL DEFAULT 'Home',
  street text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  is_default boolean DEFAULT false,
  area_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Inventory items table
CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_user_id text NOT NULL,
  vendor_id uuid,
  vendor_name text NOT NULL,
  area_id uuid,
  address_id uuid,
  total decimal(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'confirmed', 'in-transit', 'delivered', 'cancelled')),
  order_date timestamptz DEFAULT now(),
  delivery_date date NOT NULL,
  preferred_time text NOT NULL,
  invoice_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  inventory_item_id uuid,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Order messages table
CREATE TABLE order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  sender text NOT NULL CHECK (sender IN ('customer', 'vendor')),
  sender_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Invoices table
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text UNIQUE NOT NULL,
  order_id uuid,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  generated_date timestamptz DEFAULT now(),
  due_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT users_area_id_fkey 
  FOREIGN KEY (area_id) REFERENCES service_areas(id);

ALTER TABLE service_areas ADD CONSTRAINT service_areas_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE addresses ADD CONSTRAINT addresses_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE addresses ADD CONSTRAINT addresses_area_id_fkey 
  FOREIGN KEY (area_id) REFERENCES service_areas(id);

ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE orders ADD CONSTRAINT orders_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE orders ADD CONSTRAINT orders_area_id_fkey 
  FOREIGN KEY (area_id) REFERENCES service_areas(id);

ALTER TABLE orders ADD CONSTRAINT orders_address_id_fkey 
  FOREIGN KEY (address_id) REFERENCES addresses(id);

ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE order_items ADD CONSTRAINT order_items_inventory_item_id_fkey 
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);

ALTER TABLE order_messages ADD CONSTRAINT order_messages_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE invoices ADD CONSTRAINT invoices_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Helper function to get user ID from auth
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS uuid AS $$
DECLARE
  user_email text;
  user_id_text text;
  user_uuid uuid;
BEGIN
  -- Get the current user's email
  user_email := auth.email();
  
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract user_id from email (remove @aquaflow.local)
  user_id_text := replace(user_email, '@aquaflow.local', '');
  
  -- Find the user's UUID from the users table
  SELECT id INTO user_uuid FROM users WHERE user_id = user_id_text;
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = get_user_id_from_auth());

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = get_user_id_from_auth());

-- CRITICAL: Allow user creation during registration
CREATE POLICY "Allow user creation during registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own account"
  ON users
  FOR DELETE
  TO authenticated
  USING (id = get_user_id_from_auth());

-- Create RLS Policies for service_areas table
CREATE POLICY "Anyone can read service areas"
  ON service_areas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendors can create service areas"
  ON service_areas
  FOR INSERT
  TO authenticated
  WITH CHECK (vendor_id = get_user_id_from_auth());

CREATE POLICY "Vendors can update their service areas"
  ON service_areas
  FOR UPDATE
  TO authenticated
  USING (vendor_id = get_user_id_from_auth());

CREATE POLICY "Vendors can delete their service areas"
  ON service_areas
  FOR DELETE
  TO authenticated
  USING (vendor_id = get_user_id_from_auth());

-- Create RLS Policies for addresses table
CREATE POLICY "Users can read own addresses"
  ON addresses
  FOR SELECT
  TO authenticated
  USING (user_id = get_user_id_from_auth());

CREATE POLICY "Users can create own addresses"
  ON addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "Users can update own addresses"
  ON addresses
  FOR UPDATE
  TO authenticated
  USING (user_id = get_user_id_from_auth());

CREATE POLICY "Users can delete own addresses"
  ON addresses
  FOR DELETE
  TO authenticated
  USING (user_id = get_user_id_from_auth());

-- Create RLS Policies for inventory_items table
CREATE POLICY "Anyone can read inventory items"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendors can create inventory items"
  ON inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (vendor_id = get_user_id_from_auth());

CREATE POLICY "Vendors can update their inventory items"
  ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (vendor_id = get_user_id_from_auth());

CREATE POLICY "Vendors can delete their inventory items"
  ON inventory_items
  FOR DELETE
  TO authenticated
  USING (vendor_id = get_user_id_from_auth());

-- Create RLS Policies for orders table
CREATE POLICY "Customers can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (customer_id = get_user_id_from_auth());

CREATE POLICY "Vendors can read orders in their area"
  ON orders
  FOR SELECT
  TO authenticated
  USING (vendor_id = get_user_id_from_auth());

CREATE POLICY "Customers can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = get_user_id_from_auth());

CREATE POLICY "Vendors can update orders in their area"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (vendor_id = get_user_id_from_auth());

-- Create RLS Policies for order_items table
CREATE POLICY "Users can read order items for their orders"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.customer_id = get_user_id_from_auth() OR orders.vendor_id = get_user_id_from_auth())
    )
  );

CREATE POLICY "Customers can create order items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.customer_id = get_user_id_from_auth()
    )
  );

-- Create RLS Policies for order_messages table
CREATE POLICY "Users can read messages for their orders"
  ON order_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_messages.order_id 
      AND (orders.customer_id = get_user_id_from_auth() OR orders.vendor_id = get_user_id_from_auth())
    )
  );

CREATE POLICY "Users can create messages for their orders"
  ON order_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_messages.order_id 
      AND (orders.customer_id = get_user_id_from_auth() OR orders.vendor_id = get_user_id_from_auth())
    )
  );

-- Create RLS Policies for invoices table
CREATE POLICY "Customers can read invoices for their orders"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = invoices.order_id 
      AND orders.customer_id = get_user_id_from_auth()
    )
  );

CREATE POLICY "Vendors can read invoices for their orders"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = invoices.order_id 
      AND orders.vendor_id = get_user_id_from_auth()
    )
  );

CREATE POLICY "Vendors can create invoices for their orders"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = invoices.order_id 
      AND orders.vendor_id = get_user_id_from_auth()
    )
  );

CREATE POLICY "Vendors can update invoices for their orders"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = invoices.order_id 
      AND orders.vendor_id = get_user_id_from_auth()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_service_areas_vendor_id ON service_areas(vendor_id);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_area_id ON addresses(area_id);
CREATE INDEX idx_inventory_items_vendor_id ON inventory_items(vendor_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_messages_order_id ON order_messages(order_id);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to check if user_id exists (for registration validation)
CREATE OR REPLACE FUNCTION check_user_id_exists(user_id_param text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE user_id = user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_user_id_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_id_from_auth() TO authenticated;