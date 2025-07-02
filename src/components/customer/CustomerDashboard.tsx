import React, { useState, useEffect } from 'react';
import { ShoppingCart, MapPin, Clock, User, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BookingForm } from './BookingForm';
import { OrderHistory } from './OrderHistory';
import { AddressManager } from './AddressManager';
import { Order } from '../../types';
import { getOrdersByCustomer } from '../../services/database';

export const CustomerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const { user, logout, deleteProfile } = useAuth();

  useEffect(() => {
    // Set current month as default
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
    
    loadOrders(currentMonth);
  }, [user]);

  const loadOrders = async (month?: string) => {
    if (!user) return;

    try {
      const { data: orderData, error } = await getOrdersByCustomer(user.id);
      if (!error && orderData) {
        // Transform database orders to application format
        const transformedOrders: Order[] = orderData.map(order => ({
          id: order.id,
          customerId: order.customer_id,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          customerUserId: order.customer_user_id,
          vendorId: order.vendor_id,
          vendorName: order.vendor_name,
          areaId: order.area_id,
          address: order.address ? {
            id: order.address.id,
            label: order.address.label,
            street: order.address.street,
            city: order.address.city,
            state: order.address.state,
            zipCode: order.address.zip_code,
            isDefault: order.address.is_default,
            areaId: order.address.area_id || '',
          } : {
            id: '',
            label: 'Unknown',
            street: '',
            city: '',
            state: '',
            zipCode: '',
            isDefault: false,
            areaId: '',
          },
          items: order.order_items?.map(item => ({
            id: item.inventory_item_id || item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })) || [],
          total: order.total,
          status: order.status,
          orderDate: order.order_date || order.created_at,
          deliveryDate: order.delivery_date,
          preferredTime: order.preferred_time,
          invoiceId: order.invoice_id,
          messages: order.order_messages?.map(msg => ({
            id: msg.id,
            sender: msg.sender,
            senderName: msg.sender_name,
            message: msg.message,
            timestamp: msg.created_at,
          })) || [],
        }));

        if (month) {
          const [year, monthNum] = month.split('-');
          const filteredOrders = transformedOrders.filter((order: Order) => {
            const orderDate = new Date(order.orderDate);
            return orderDate.getFullYear() === parseInt(year) && 
                   orderDate.getMonth() === parseInt(monthNum) - 1;
          });
          setOrders(filteredOrders.sort((a: Order, b: Order) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
        } else {
          setOrders(transformedOrders.sort((a: Order, b: Order) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleDeleteProfile = () => {
    if (window.confirm('Are you sure you want to delete your profile? This action cannot be undone.')) {
      deleteProfile();
    }
  };

  const getAvailableMonths = () => {
    const months = new Set<string>();
    orders.forEach((order: Order) => {
      const date = new Date(order.orderDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in-transit':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ShoppingCart },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {/* Booking Form */}
            <BookingForm />
            
            {/* Order History */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Order History</h2>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    loadOrders(e.target.value);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Orders</option>
                  {getAvailableMonths().map(month => {
                    const [year, monthNum] = month.split('-');
                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    return (
                      <option key={month} value={month}>{monthName}</option>
                    );
                  })}
                </select>
              </div>
              
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
                  <p className="text-gray-500">No orders found for the selected period.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">Order #{order.id}</h3>
                          <p className="text-sm text-gray-500">
                            Ordered: {formatDate(order.orderDate)} • Delivery: {formatDate(order.deliveryDate)} at {order.preferredTime}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Items</h4>
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm text-gray-600">
                            <span>{item.name} (20L Can) × {item.quantity}</span>
                            <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <span className="font-medium text-gray-900">Total: ₹{order.total.toFixed(2)}</span>
                        {order.messages && order.messages.length > 0 && (
                          <span className="text-xs text-blue-600">
                            {order.messages.length} message(s)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'addresses':
        return <AddressManager />;
      case 'profile':
        return (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <p className="mt-1 text-sm text-gray-900">{user?.userId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{user?.phone}</p>
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={handleDeleteProfile}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Profile
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  This will permanently delete your account and all associated data.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center mr-3">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">AquaFlow</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};