import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Plus, Minus, ShoppingCart, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Address, Order, OrderItem, InventoryItem, ServiceArea } from '../../types';
import { getInventoryByArea, createOrder, createOrderMessage } from '../../services/database';

export const BookingForm: React.FC = () => {
  const { user } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set default address
    if (user?.addresses && user.addresses.length > 0) {
      const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
      setSelectedAddress(defaultAddress);
    }

    // Set minimum delivery date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDeliveryDate(tomorrow.toISOString().split('T')[0]);
  }, [user]);

  useEffect(() => {
    // Load inventory based on selected address area
    if (selectedAddress && selectedAddress.areaId) {
      loadInventory(selectedAddress.areaId);
    }
  }, [selectedAddress]);

  const loadInventory = async (areaId: string) => {
    try {
      const { data, error } = await getInventoryByArea(areaId);
      if (!error && data) {
        const inventoryItems: InventoryItem[] = data.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          stock: item.stock,
          description: item.description,
          vendorId: item.vendor_id,
        }));
        setInventory(inventoryItems);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const addToCart = (item: InventoryItem) => {
    if (item.stock === 0) return;
    
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      if (existingItem.quantity < item.stock) {
        setCart(cart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        ));
      }
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        quantity: 1,
        price: item.price,
      }]);
    }
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    const inventoryItem = inventory.find(item => item.id === itemId);
    if (!inventoryItem) return;

    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== itemId));
    } else if (quantity <= inventoryItem.stock) {
      setCart(cart.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartQuantity = (itemId: string) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem?.quantity || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAddress || cart.length === 0) {
      alert('Please select an address and add items to cart');
      return;
    }

    if (!preferredTime.trim()) {
      alert('Please enter your preferred delivery time');
      return;
    }

    if (!user) return;

    setLoading(true);

    try {
      // Find vendor from inventory
      const vendorId = inventory[0]?.vendorId;
      if (!vendorId) {
        alert('No vendor found for this area');
        setLoading(false);
        return;
      }

      // Create order
      const { data: orderData, error: orderError } = await createOrder({
        customerId: user.id,
        customerName: user.name,
        customerPhone: user.phone || '',
        customerUserId: user.userId,
        address: selectedAddress,
        items: cart,
        total: getTotalPrice(),
        status: 'pending',
        deliveryDate: deliveryDate,
        preferredTime: preferredTime,
        vendorId: vendorId,
        vendorName: '', // Will be filled by the database
        areaId: selectedAddress.areaId,
      });

      if (orderError) {
        console.error('Order creation error:', orderError);
        alert('Failed to create order. Please try again.');
        setLoading(false);
        return;
      }

      // Show celebration animation
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);

      // Clear form
      setCart([]);
      setPreferredTime('');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  return (
    <div className="space-y-6">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-8 text-center animate-bounce">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Order Placed Successfully!</h2>
            <p className="text-gray-600">Your water delivery has been scheduled</p>
            <div className="mt-4 text-4xl">💧✨</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Book Water Delivery</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Delivery Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <MapPin className="w-4 h-4 inline mr-2" />
              Delivery Address
            </label>
            {user?.addresses && user.addresses.length > 0 ? (
              <div className="space-y-2">
                {user.addresses.map((address) => (
                  <label key={address.id} className="block">
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddress?.id === address.id}
                      onChange={() => setSelectedAddress(address)}
                      className="mr-3"
                    />
                    <span className="text-sm">
                      <strong>{address.label}</strong> - {address.street}, {address.city}, {address.state} {address.zipCode}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No addresses found. Please add an address first.</p>
            )}
          </div>

          {/* Delivery Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Delivery Date
            </label>
            <input
              type="date"
              required
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {deliveryDate && (
              <p className="text-sm text-gray-500 mt-1">
                Selected: {formatDate(deliveryDate)}
              </p>
            )}
          </div>

          {/* Preferred Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Preferred Time
            </label>
            <input
              type="text"
              required
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder="e.g., 8pm, Morning, Afternoon"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </form>
      </div>

      {/* Product Selection */}
      {selectedAddress && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Available Products
          </h3>
          {inventory.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Products Available</h4>
              <p className="text-gray-500">No products are currently available in your selected area.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {inventory.map((item) => {
                const cartQuantity = getCartQuantity(item.id);
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-500">20L Can • {item.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-blue-600">₹{item.price}</p>
                        <p className="text-xs text-gray-500">per can</p>
                      </div>
                    </div>
                    
                    {cartQuantity > 0 ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, cartQuantity - 1)}
                            className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{cartQuantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, cartQuantity + 1)}
                            disabled={cartQuantity >= item.stock}
                            className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-medium text-gray-900">₹{(item.price * cartQuantity).toFixed(2)}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        disabled={item.stock === 0}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Add to Cart
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <ShoppingCart className="w-5 h-5 inline mr-2" />
            Order Summary
          </h3>
          <div className="space-y-3 mb-4">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{item.name} (20L Can)</p>
                  <p className="text-sm text-gray-500">₹{item.price} per can</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.quantity} cans</p>
                  <p className="text-sm text-gray-500">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <span className="text-lg font-semibold">Total: ₹{getTotalPrice().toFixed(2)}</span>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};