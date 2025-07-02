import { supabase } from '../lib/supabase';
import { User, Address, ServiceArea, Order, OrderItem, InventoryItem, Invoice, OrderMessage } from '../types';

// Auth functions
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// User functions
export const createUser = async (userData: Omit<User, 'id' | 'addresses'>) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        user_id: userData.userId,
        name: userData.name,
        phone: userData.phone,
        user_type: userData.type,
        area_id: userData.areaId,
        service_area: userData.serviceArea,
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error creating user:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error getting user by userId:', err);
    return { data: null, error: err };
  }
};

export const updateUser = async (id: string, updates: Partial<User>) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        phone: updates.phone,
        area_id: updates.areaId,
        service_area: updates.serviceArea,
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error updating user:', err);
    return { data: null, error: err };
  }
};

export const deleteUser = async (id: string) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    return { error };
  } catch (err) {
    console.error('Error deleting user:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error getting service areas:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error creating service area:', err);
    return { data: null, error: err };
  }
};

export const updateServiceArea = async (id: string, updates: Partial<ServiceArea>) => {
  try {
    const { data, error } = await supabase
      .from('service_areas')
      .update({
        name: updates.name,
        vendor_id: updates.vendorId,
        vendor_name: updates.vendorName,
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error updating service area:', err);
    return { data: null, error: err };
  }
};

export const deleteServiceArea = async (vendorId: string) => {
  try {
    const { error } = await supabase
      .from('service_areas')
      .delete()
      .eq('vendor_id', vendorId);

    return { error };
  } catch (err) {
    console.error('Error deleting service area:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error getting user addresses:', err);
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
        area_id: addressData.areaId,
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error creating address:', err);
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

    const { data, error } = await supabase
      .from('addresses')
      .update({
        label: updates.label,
        street: updates.street,
        city: updates.city,
        state: updates.state,
        zip_code: updates.zipCode,
        is_default: updates.isDefault,
        area_id: updates.areaId,
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error updating address:', err);
    return { data: null, error: err };
  }
};

export const deleteAddress = async (id: string) => {
  try {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id);

    return { error };
  } catch (err) {
    console.error('Error deleting address:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error getting inventory by vendor:', err);
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
      return { data: null, error: areaError };
    }

    // Then get inventory for that vendor
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('vendor_id', area.vendor_id);

    return { data, error };
  } catch (err) {
    console.error('Error getting inventory by area:', err);
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
        description: itemData.description,
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error creating inventory item:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error updating inventory item:', err);
    return { data: null, error: err };
  }
};

export const deleteInventoryItem = async (id: string) => {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    return { error };
  } catch (err) {
    console.error('Error deleting inventory item:', err);
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

    if (ordersError || !orders) {
      return { data: null, error: ordersError };
    }

    // Get order items and messages for each order
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
    console.error('Error getting orders by customer:', err);
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

    if (ordersError || !orders) {
      return { data: null, error: ordersError };
    }

    // Get order items and messages for each order
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
    console.error('Error getting orders by vendor:', err);
    return { data: null, error: err };
  }
};

export const createOrder = async (orderData: Omit<Order, 'id' | 'orderDate' | 'messages' | 'items'> & { items: OrderItem[] }) => {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: orderData.customerId,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_user_id: orderData.customerUserId,
        vendor_id: orderData.vendorId,
        vendor_name: orderData.vendorName,
        area_id: orderData.areaId,
        address_id: orderData.address.id,
        total: orderData.total,
        delivery_date: orderData.deliveryDate,
        preferred_time: orderData.preferredTime,
      })
      .select()
      .single();

    if (orderError || !order) {
      return { data: null, error: orderError };
    }

    // Insert order items
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
      return { data: null, error: itemsError };
    }

    return { data: order, error: null };
  } catch (err) {
    console.error('Error creating order:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error updating order status:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error updating order invoice ID:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error creating order message:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error getting invoices by vendor:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error creating invoice:', err);
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

    return { data, error };
  } catch (err) {
    console.error('Error updating invoice status:', err);
    return { data: null, error: err };
  }
};