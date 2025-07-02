/*
  # Initial Schema for AquaFlow Water Delivery Service

  1. New Tables
    - `users` - Store user accounts (customers and vendors)
    - `service_areas` - Store service areas managed by vendors
    - `addresses` - Store customer delivery addresses
    - `inventory_items` - Store vendor inventory
    - `orders` - Store customer orders
    - `order_items` - Store individual items in orders
    - `order_messages` - Store messages between customers and vendors
    - `invoices` - Store generated invoices

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for vendors to access orders in their service areas
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  user_type text NOT NULL CHECK (user_type IN ('customer', 'vendor')),
  area_id uuid REFERENCES service_areas(id),
  service_area text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Service areas table
CREATE TABLE IF NOT EXISTS service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vendor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vendor_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  is_default boolean DEFAULT false,
  area_id uuid REFERENCES service_areas(id),
  created_at timestamptz DEFAULT now()
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_user_id text NOT NULL,
  vendor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vendor_name text NOT NULL,
  area_id uuid REFERENCES service_areas(id),
  address_id uuid REFERENCES addresses(id),
  total decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'confirmed', 'in-transit', 'delivered', 'cancelled')),
  order_date timestamptz DEFAULT now(),
  delivery_date date NOT NULL,
  preferred_time text NOT NULL,
  invoice_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id),
  name text NOT NULL,
  quantity integer NOT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Order messages table
CREATE TABLE IF NOT EXISTS order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('customer', 'vendor')),
  sender_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  generated_date timestamptz DEFAULT now(),
  due_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Anyone can create user accounts"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own account"
  ON users
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Service areas policies
CREATE POLICY "Anyone can read service areas"
  ON service_areas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendors can create service areas"
  ON service_areas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = vendor_id::text);

CREATE POLICY "Vendors can update their service areas"
  ON service_areas
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = vendor_id::text);

CREATE POLICY "Vendors can delete their service areas"
  ON service_areas
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = vendor_id::text);

-- Addresses policies
CREATE POLICY "Users can read own addresses"
  ON addresses
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own addresses"
  ON addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own addresses"
  ON addresses
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own addresses"
  ON addresses
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Inventory items policies
CREATE POLICY "Anyone can read inventory items"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendors can create inventory items"
  ON inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = vendor_id::text);

CREATE POLICY "Vendors can update their inventory items"
  ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = vendor_id::text);

CREATE POLICY "Vendors can delete their inventory items"
  ON inventory_items
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = vendor_id::text);

-- Orders policies
CREATE POLICY "Customers can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = customer_id::text);

CREATE POLICY "Vendors can read orders in their area"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = vendor_id::text);

CREATE POLICY "Customers can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = customer_id::text);

CREATE POLICY "Vendors can update orders in their area"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = vendor_id::text);

-- Order items policies
CREATE POLICY "Users can read order items for their orders"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.customer_id::text = auth.uid()::text OR orders.vendor_id::text = auth.uid()::text)
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
      AND orders.customer_id::text = auth.uid()::text
    )
  );

-- Order messages policies
CREATE POLICY "Users can read messages for their orders"
  ON order_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_messages.order_id 
      AND (orders.customer_id::text = auth.uid()::text OR orders.vendor_id::text = auth.uid()::text)
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
      AND (orders.customer_id::text = auth.uid()::text OR orders.vendor_id::text = auth.uid()::text)
    )
  );

-- Invoices policies
CREATE POLICY "Customers can read invoices for their orders"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = invoices.order_id 
      AND orders.customer_id::text = auth.uid()::text
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
      AND orders.vendor_id::text = auth.uid()::text
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
      AND orders.vendor_id::text = auth.uid()::text
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
      AND orders.vendor_id::text = auth.uid()::text
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_service_areas_vendor_id ON service_areas(vendor_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_area_id ON addresses(area_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_vendor_id ON inventory_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();