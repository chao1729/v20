import React, { useState, useEffect } from 'react';
import { Package, FileText, BarChart3, Settings, LogOut, TrendingUp, Trash2, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OrderManagement } from './OrderManagement';
import { InventoryManager } from './InventoryManager';
import { InvoiceManager } from './InvoiceManager';
import { Order, MonthlyReport } from '../../types';
import { getOrdersByVendor } from '../../services/database';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const VendorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const { user, logout, deleteProfile } = useAuth();

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const { data: orderData, error } = await getOrdersByVendor(user.id);
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

        setOrders(transformedOrders.sort((a: Order, b: Order) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
        generateMonthlyReports(transformedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const generateMonthlyReports = (ordersList: Order[]) => {
    const deliveredOrders = ordersList.filter(order => order.status === 'delivered');
    const reports: { [key: string]: MonthlyReport } = {};
    
    deliveredOrders.forEach(order => {
      const date = new Date(order.deliveryDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!reports[monthKey]) {
        reports[monthKey] = {
          month: date.toLocaleDateString('en-US', { month: 'long' }),
          year: date.getFullYear(),
          totalOrders: 0,
          totalRevenue: 0,
          customerBreakdown: {}
        };
      }
      
      reports[monthKey].totalOrders++;
      reports[monthKey].totalRevenue += order.total;
      
      if (!reports[monthKey].customerBreakdown[order.customerId]) {
        reports[monthKey].customerBreakdown[order.customerId] = {
          name: order.customerName,
          orders: 0,
          amount: 0
        };
      }
      
      reports[monthKey].customerBreakdown[order.customerId].orders++;
      reports[monthKey].customerBreakdown[order.customerId].amount += order.total;
    });
    
    setMonthlyReports(Object.values(reports).sort((a, b) => 
      new Date(b.year, new Date(`${b.month} 1`).getMonth()).getTime() - 
      new Date(a.year, new Date(`${a.month} 1`).getMonth()).getTime()
    ));
  };

  const handleDeleteProfile = () => {
    if (window.confirm('Are you sure you want to delete your profile? This action cannot be undone and will remove your service area.')) {
      deleteProfile();
    }
  };

  const getAvailableMonths = () => {
    const months = new Set<string>();
    orders.forEach(order => {
      const date = new Date(order.orderDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  };

  const getAvailableYears = () => {
    const years = new Set<number>();
    orders.forEach(order => {
      const date = new Date(order.orderDate);
      years.add(date.getFullYear());
    });
    return Array.from(years).sort().reverse();
  };

  const generateMonthlyPDF = () => {
    if (!selectedMonth) return;
    
    const [year, month] = selectedMonth.split('-');
    const monthlyData = monthlyReports.find(report => 
      report.year === parseInt(year) && 
      report.month === new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' })
    );
    
    if (!monthlyData) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('AquaFlow - Monthly Report', 20, 20);
    
    // Report details
    doc.setFontSize(12);
    doc.text(`Vendor: ${user?.name}`, 20, 40);
    doc.text(`Month: ${monthlyData.month} ${monthlyData.year}`, 20, 50);
    doc.text(`Total Orders: ${monthlyData.totalOrders}`, 20, 60);
    doc.text(`Total Revenue: ₹${monthlyData.totalRevenue.toFixed(2)}`, 20, 70);
    
    // Customer breakdown table
    const tableData = Object.values(monthlyData.customerBreakdown).map(customer => [
      customer.name,
      customer.orders.toString(),
      `₹${customer.amount.toFixed(2)}`
    ]);
    
    doc.autoTable({
      head: [['Customer Name', 'Orders', 'Total Amount']],
      body: tableData,
      startY: 90,
      theme: 'grid'
    });
    
    doc.save(`monthly-report-${selectedMonth}.pdf`);
  };

  const generateYearlyPDF = () => {
    const yearlyData = monthlyReports.filter(report => report.year === selectedYear);
    if (yearlyData.length === 0) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('AquaFlow - Yearly Report', 20, 20);
    
    // Report details
    doc.setFontSize(12);
    doc.text(`Vendor: ${user?.name}`, 20, 40);
    doc.text(`Year: ${selectedYear}`, 20, 50);
    
    const totalOrders = yearlyData.reduce((sum, report) => sum + report.totalOrders, 0);
    const totalRevenue = yearlyData.reduce((sum, report) => sum + report.totalRevenue, 0);
    
    doc.text(`Total Orders: ${totalOrders}`, 20, 60);
    doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, 20, 70);
    
    // Monthly breakdown table
    const tableData = yearlyData.map(report => [
      report.month,
      report.totalOrders.toString(),
      `₹${report.totalRevenue.toFixed(2)}`
    ]);
    
    doc.autoTable({
      head: [['Month', 'Orders', 'Revenue']],
      body: tableData,
      startY: 90,
      theme: 'grid'
    });
    
    doc.save(`yearly-report-${selectedYear}.pdf`);
  };

  const pendingOrdersCount = orders.filter(order => order.status === 'pending').length;
  const monthlyData = selectedMonth ? monthlyReports.find(report => {
    const [year, month] = selectedMonth.split('-');
    return report.year === parseInt(year) && 
           report.month === new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' });
  }) : null;

  const yearlyData = monthlyReports.filter(report => report.year === selectedYear);
  const yearlyTotalOrders = yearlyData.reduce((sum, report) => sum + report.totalOrders, 0);
  const yearlyTotalRevenue = yearlyData.reduce((sum, report) => sum + report.totalRevenue, 0);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Package },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: BarChart3 },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Alerts */}
            {pendingOrdersCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-yellow-800 font-medium">
                    You have {pendingOrdersCount} pending order(s) that need attention
                  </span>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{orders.filter(o => o.status === 'delivered').reduce((sum, order) => sum + order.total, 0).toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unique Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{new Set(orders.map(o => o.customerId)).size}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Reports Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Report */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Report</h3>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Month</option>
                      {getAvailableMonths().map(month => {
                        const [year, monthNum] = month.split('-');
                        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        return (
                          <option key={month} value={month}>{monthName}</option>
                        );
                      })}
                    </select>
                    {selectedMonth && (
                      <button
                        onClick={generateMonthlyPDF}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>

                {monthlyData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Orders</p>
                        <p className="text-xl font-bold text-gray-900">{monthlyData.totalOrders}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Revenue</p>
                        <p className="text-xl font-bold text-gray-900">₹{monthlyData.totalRevenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Select a month to view report</p>
                )}
              </div>

              {/* Yearly Report */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Yearly Report</h3>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {getAvailableYears().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    {yearlyData.length > 0 && (
                      <button
                        onClick={generateYearlyPDF}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>

                {yearlyData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Orders</p>
                        <p className="text-xl font-bold text-gray-900">{yearlyTotalOrders}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Revenue</p>
                        <p className="text-xl font-bold text-gray-900">₹{yearlyTotalRevenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No data for {selectedYear}</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'orders':
        return <OrderManagement />;
      case 'inventory':
        return <InventoryManager />;
      case 'invoices':
        return <InvoiceManager />;
      case 'settings':
        return (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Vendor Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <p className="mt-1 text-sm text-gray-900">{user?.userId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{user?.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Service Area</label>
                <p className="mt-1 text-sm text-gray-900">{user?.serviceArea}</p>
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
                  This will permanently delete your account, service area, and all associated data.
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
                  <Package className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">AquaFlow Vendor</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.name} ({user?.userId})</span>
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