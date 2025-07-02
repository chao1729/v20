/*
  # Complete AquaFlow Database Schema

  1. New Tables
    - `users` - Store user accounts (customers and vendors)
    - `service_areas` - Geographic areas served by vendors
    - `addresses` - Customer delivery addresses
    - `inventory_items` - Products available from vendors
    - `orders` - Customer orders
    - `order_items` - Individual items within orders
    - `order_messages` - Communication between customers and vendors
    - `invoices` - Billing information for orders

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Vendors can manage their service areas, inventory, and orders
    - Customers can manage their addresses and orders

  3. Relationships
    - Users can be customers or vendors
    - Service areas belong to vendors
    - Addresses belong to customers and reference service areas
    - Orders connect customers, vendors, and addresses
    - Inventory items belong to vendors
    - Order items reference inventory items and orders
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  user_type text NOT NULL CHECK (user_type IN ('customer', 'vendor')),
  area_id uuid,
  service_area text,
  created_at timestamptz DEFAULT now()
);

-- Service areas table
CREATE TABLE IF NOT EXISTS service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vendor_id uuid NOT NULL,
  vendor_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
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
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_user_id text NOT NULL,
  vendor_id uuid NOT NULL,
  vendor_name text NOT NULL,
  area_id uuid NOT NULL,
  address_id uuid NOT NULL,
  total decimal(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_date date,
  preferred_time text,
  invoice_id text,
  created_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Order messages table
CREATE TABLE IF NOT EXISTS order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender IN ('customer', 'vendor')),
  sender_name text NOT NULL,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text UNIQUE NOT NULL,
  order_id uuid NOT NULL,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  due_date date,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  -- Service areas reference users (vendors)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'service_areas_vendor_id_fkey'
  ) THEN
    ALTER TABLE service_areas ADD CONSTRAINT service_areas_vendor_id_fkey 
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- Addresses reference users and service areas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'addresses_user_id_fkey'
  ) THEN
    ALTER TABLE addresses ADD CONSTRAINT addresses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'addresses_area_id_fkey'
  ) THEN
    ALTER TABLE addresses ADD CONSTRAINT addresses_area_id_fkey 
    FOREIGN KEY (area_id) REFERENCES service_areas(id) ON DELETE SET NULL;
  END IF;

  -- Inventory items reference users (vendors)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_items_vendor_id_fkey'
  ) THEN
    ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_vendor_id_fkey 
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- Orders reference users, service areas, and addresses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_customer_id_fkey'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_vendor_id_fkey'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_vendor_id_fkey 
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_area_id_fkey'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_area_id_fkey 
    FOREIGN KEY (area_id) REFERENCES service_areas(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_address_id_fkey'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_address_id_fkey 
    FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE;
  END IF;

  -- Order items reference orders and inventory items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_order_id_fkey'
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_inventory_item_id_fkey'
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_inventory_item_id_fkey 
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;
  END IF;

  -- Order messages reference orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_messages_order_id_fkey'
  ) THEN
    ALTER TABLE order_messages ADD CONSTRAINT order_messages_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;

  -- Invoices reference orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoices_order_id_fkey'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = (user_id || '@aquaflow.local'));

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = (user_id || '@aquaflow.local'));

-- RLS Policies for service_areas table
CREATE POLICY "Anyone can read service areas"
  ON service_areas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendors can manage their service areas"
  ON service_areas
  FOR ALL
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      AND user_type = 'vendor'
    )
  );

-- RLS Policies for addresses table
CREATE POLICY "Users can manage their addresses"
  ON addresses
  FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = (user_id || '@aquaflow.local')
    )
  );

-- RLS Policies for inventory_items table
CREATE POLICY "Anyone can read inventory items"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendors can manage their inventory"
  ON inventory_items
  FOR ALL
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      AND user_type = 'vendor'
    )
  );

-- RLS Policies for orders table
CREATE POLICY "Users can read their orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = (user_id || '@aquaflow.local')
    )
    OR
    vendor_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = (user_id || '@aquaflow.local')
    )
  );

CREATE POLICY "Customers can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      AND user_type = 'customer'
    )
  );

CREATE POLICY "Vendors can update their orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM users 
      WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      AND user_type = 'vendor'
    )
  );

-- RLS Policies for order_items table
CREATE POLICY "Users can read order items for their orders"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      )
      OR vendor_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      )
    )
  );

CREATE POLICY "Customers can create order items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
        AND user_type = 'customer'
      )
    )
  );

-- RLS Policies for order_messages table
CREATE POLICY "Users can read messages for their orders"
  ON order_messages
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      )
      OR vendor_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      )
    )
  );

CREATE POLICY "Users can create messages for their orders"
  ON order_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      )
      OR vendor_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      )
    )
  );

-- RLS Policies for invoices table
CREATE POLICY "Users can read invoices for their orders"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      )
      OR vendor_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
      )
    )
  );

CREATE POLICY "Vendors can manage invoices for their orders"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE vendor_id IN (
        SELECT id FROM users 
        WHERE auth.uid()::text = (user_id || '@aquaflow.local')
        AND user_type = 'vendor'
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
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