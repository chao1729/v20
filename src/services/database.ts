import { supabase } from '../lib/supabase';
import { User, Address, ServiceArea, Order, OrderItem, InventoryItem, Invoice, OrderMessage } from '../types';

// Auth functions
export const signUp = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  } catch (err) {
    console.error('SignUp error:', err);
    return { data: null, error: err };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  } catch (err) {
    console.error('SignIn error:', err);
    return { data: null, error: err };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    console.error('SignOut error:', err);
    return { error: err };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    console.error('GetCurrentUser error:', err);
    return null;
  }
};

// User functions
export const createUser = async (userData: Omit<User, 'id' | 'addresses'>) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        user_id: userData.userId,
        name: userData.name,
        phone: userData.phone || null,
        user_type: userData.type,
        area_id: userData.areaId || null,
        service_area: userData.serviceArea || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create user error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Create user exception:', err);
    return { data: null, error: err };
  }
};

export const getUserByUserId = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Get user by userId error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Get user by userId exception:', err);
    return { data: null, error: err };
  }
};

export const updateUser = async (id: string, updates: Partial<User>) => {
  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.areaId !== undefined) updateData.area_id = updates.areaId;
    if (updates.serviceArea !== undefined) updateData.service_area = updates.serviceArea;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update user error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Update user exception:', err);
    return { data: null, error: err };
  }
};

export const deleteUser = async (id: string) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete user error:', error);
    }

    return { error };
  } catch (err) {
    console.error('Delete user exception:', err);
    return { error: err };
  }
};

// Service Area functions
export const getServiceAreas = async () => {
  try {
    const { data, error } = await supabase
      .from('service_areas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get service areas error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Get service areas exception:', err);
    return { data: null, error: err };
  }
};

export const createServiceArea = async (areaData: Omit<ServiceArea, 'id' | 'createdDate'>) => {
  try {
    const { data, error } = await supabase
      .from('service_areas')
      .insert({
        name: areaData.name,
        vendor_id: areaData.vendorId,
        vendor_name: areaData.vendorName,
      })
      .select()
      .single();

    if (error) {
      console.error('Create service area error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Create service area exception:', err);
    return { data: null, error: err };
  }
};

export const updateServiceArea = async (id: string, updates: Partial<ServiceArea>) => {
  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.vendorId !== undefined) updateData.vendor_id = updates.vendorId;
    if (updates.vendorName !== undefined) updateData.vendor_name = updates.vendorName;

    const { data, error } = await supabase
      .from('service_areas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update service area error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Update service area exception:', err);
    return { data: null, error: err };
  }
};

export const deleteServiceArea = async (vendorId: string) => {
  try {
    const { error } = await supabase
      .from('service_areas')
      .delete()
      .eq('vendor_id', vendorId);

    if (error) {
      console.error('Delete service area error:', error);
    }

    return { error };
  } catch (err) {
    console.error('Delete service area exception:', err);
    return { error: err };
  }
};

// Address functions
export const getUserAddresses = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Get user addresses error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Get user addresses exception:', err);
    return { data: null, error: err };
  }
};

export const createAddress = async (addressData: Omit<Address, 'id'> & { userId: string }) => {
  try {
    // If this is set as default, unset all other defaults first
    if (addressData.isDefault) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', addressData.userId);
    }

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: addressData.userId,
        label: addressData.label,
        street: addressData.street,
        city: addressData.city,
        state: addressData.state,
        zip_code: addressData.zipCode,
        is_default: addressData.isDefault,
        area_id: addressData.areaId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create address error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Create address exception:', err);
    return { data: null, error: err };
  }
};

export const updateAddress = async (id: string, updates: Partial<Address> & { isDefault?: boolean }) => {
  try {
    // If setting as default, unset all other defaults first
    if (updates.isDefault) {
      const { data: address } = await supabase
        .from('addresses')
        .select('user_id')
        .eq('id', id)
        .single();

      if (address) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', address.user_id);
      }
    }

    const updateData: any = {};
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.street !== undefined) updateData.street = updates.street;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.zipCode !== undefined) updateData.zip_code = updates.zipCode;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
    if (updates.areaId !== undefined) updateData.area_id = updates.areaId;

    const { data, error } = await supabase
      .from('addresses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update address error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Update address exception:', err);
    return { data: null, error: err };
  }
};

export const deleteAddress = async (id: string) => {
  try {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete address error:', error);
    }

    return { error };
  } catch (err) {
    console.error('Delete address exception:', err);
    return { error: err };
  }
};

// Inventory functions
export const getInventoryByVendor = async (vendorId: string) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get inventory by vendor error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Get inventory by vendor exception:', err);
    return { data: null, error: err };
  }
};

export const getInventoryByArea = async (areaId: string) => {
  try {
    // First get the vendor for this area
    const { data: area, error: areaError } = await supabase
      .from('service_areas')
      .select('vendor_id')
      .eq('id', areaId)
      .single();

    if (areaError || !area) {
      console.error('Get area error:', areaError);
      return { data: null, error: areaError };
    }

    // Then get inventory for that vendor
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('vendor_id', area.vendor_id);

    if (error) {
      console.error('Get inventory by area error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Get inventory by area exception:', err);
    return { data: null, error: err };
  }
};

export const createInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        vendor_id: itemData.vendorId,
        name: itemData.name,
        price: itemData.price,
        stock: itemData.stock,
        description: itemData.description || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Create inventory item error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Create inventory item exception:', err);
    return { data: null, error: err };
  }
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.stock !== undefined) updateData.stock = updates.stock;
    if (updates.description !== undefined) updateData.description = updates.description;

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update inventory item error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Update inventory item exception:', err);
    return { data: null, error: err };
  }
};

export const deleteInventoryItem = async (id: string) => {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete inventory item error:', error);
    }

    return { error };
  } catch (err) {
    console.error('Delete inventory item exception:', err);
    return { error: err };
  }
};

// Order functions
export const getOrdersByCustomer = async (customerId: string) => {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Get orders by customer error:', ordersError);
      return { data: null, error: ordersError };
    }

    if (!orders || orders.length === 0) {
      return { data: [], error: null };
    }

    // Get order items, messages, and addresses for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const [itemsResult, messagesResult, addressResult] = await Promise.all([
          supabase.from('order_items').select('*').eq('order_id', order.id),
          supabase.from('order_messages').select('*').eq('order_id', order.id).order('created_at'),
          supabase.from('addresses').select('*').eq('id', order.address_id).single()
        ]);

        return {
          ...order,
          order_items: itemsResult.data || [],
          order_messages: messagesResult.data || [],
          address: addressResult.data
        };
      })
    );

    return { data: ordersWithDetails, error: null };
  } catch (err) {
    console.error('Get orders by customer exception:', err);
    return { data: null, error: err };
  }
};

export const getOrdersByVendor = async (vendorId: string) => {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Get orders by vendor error:', ordersError);
      return { data: null, error: ordersError };
    }

    if (!orders || orders.length === 0) {
      return { data: [], error: null };
    }

    // Get order items, messages, and addresses for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const [itemsResult, messagesResult, addressResult] = await Promise.all([
          supabase.from('order_items').select('*').eq('order_id', order.id),
          supabase.from('order_messages').select('*').eq('order_id', order.id).order('created_at'),
          supabase.from('addresses').select('*').eq('id', order.address_id).single()
        ]);

        return {
          ...order,
          order_items: itemsResult.data || [],
          order_messages: messagesResult.data || [],
          address: addressResult.data
        };
      })
    );

    return { data: ordersWithDetails, error: null };
  } catch (err) {
    console.error('Get orders by vendor exception:', err);
    return { data: null, error: err };
  }
};

export const createOrder = async (orderData: Omit<Order, 'id' | 'orderDate' | 'messages' | 'items'> & { items: OrderItem[] }) => {
  try {
    // Get vendor name from vendor ID
    const { data: vendor } = await supabase
      .from('users')
      .select('name')
      .eq('id', orderData.vendorId)
      .single();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: orderData.customerId,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_user_id: orderData.customerUserId,
        vendor_id: orderData.vendorId,
        vendor_name: vendor?.name || 'Unknown Vendor',
        area_id: orderData.areaId,
        address_id: orderData.address.id,
        total: orderData.total,
        delivery_date: orderData.deliveryDate,
        preferred_time: orderData.preferredTime,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Create order error:', orderError);
      return { data: null, error: orderError };
    }

    // Insert order items
    if (orderData.items.length > 0) {
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        inventory_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Create order items error:', itemsError);
        return { data: null, error: itemsError };
      }
    }

    return { data: order, error: null };
  } catch (err) {
    console.error('Create order exception:', err);
    return { data: null, error: err };
  }
};

export const updateOrderStatus = async (id: string, status: Order['status']) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update order status error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Update order status exception:', err);
    return { data: null, error: err };
  }
};

export const updateOrderInvoiceId = async (id: string, invoiceId: string) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ invoice_id: invoiceId })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update order invoice ID error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Update order invoice ID exception:', err);
    return { data: null, error: err };
  }
};

// Order Messages functions
export const createOrderMessage = async (messageData: Omit<OrderMessage, 'id' | 'timestamp'> & { orderId: string }) => {
  try {
    const { data, error } = await supabase
      .from('order_messages')
      .insert({
        order_id: messageData.orderId,
        sender: messageData.sender,
        sender_name: messageData.senderName,
        message: messageData.message,
      })
      .select()
      .single();

    if (error) {
      console.error('Create order message error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Create order message exception:', err);
    return { data: null, error: err };
  }
};

// Invoice functions
export const getInvoicesByVendor = async (vendorId: string) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        orders!inner(vendor_id)
      `)
      .eq('orders.vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get invoices by vendor error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Get invoices by vendor exception:', err);
    return { data: null, error: err };
  }
};

export const createInvoice = async (invoiceData: Omit<Invoice, 'generatedDate'>) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_id: invoiceData.id,
        order_id: invoiceData.orderId,
        amount: invoiceData.amount,
        due_date: invoiceData.dueDate,
        status: invoiceData.status,
      })
      .select()
      .single();

    if (error) {
      console.error('Create invoice error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Create invoice exception:', err);
    return { data: null, error: err };
  }
};

export const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update invoice status error:', error);
    }

    return { data, error };
  } catch (err) {
    console.error('Update invoice status exception:', err);
    return { data: null, error: err };
  }
};