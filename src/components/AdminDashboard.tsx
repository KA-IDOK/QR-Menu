import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category, MenuItem } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Trash2, Save, Upload, RefreshCw, QrCode, LayoutDashboard, Settings, Coffee, Edit3, X, Image as ImageIcon, ShoppingCart, CheckCircle, Clock, CreditCard, History, Check } from 'lucide-react';
import { extractMenuFromImage } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../types';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [view, setView] = useState<'items' | 'qr' | 'orders'>('items');
  const [activeAdminCategory, setActiveAdminCategory] = useState<number | null>(null);
  
  // Editor State
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [managingAddonsItem, setManagingAddonsItem] = useState<MenuItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchMenu = async () => {
    const res = await fetch('/api/menu');
    const data = await res.json();
    setMenu(data);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const res = await fetch('/api/admin/orders');
    const data = await res.json();
    setOrders(data);
  };

  useEffect(() => {
    fetchMenu();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (view === 'orders') {
      fetchOrders();
    }
  }, [view]);

  const updateOrderStatus = async (orderId: number, status: string, isPaid: number) => {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, is_paid: isPaid }),
    });
    fetchOrders();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSeeding(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const extracted = await extractMenuFromImage(base64);
        await fetch('/api/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extracted),
        });
        await fetchMenu();
      } catch (err) {
        console.error(err);
        alert('Failed to extract menu. Please try again.');
      } finally {
        setIsSeeding(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateItemAvailability = async (id: number, available: number, addons?: string) => {
    const item = menu.flatMap(c => c.items).find(i => i.id === id);
    if (!item) return;
    
    await fetch(`/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, available, addons: addons ?? item.addons }),
    });
    fetchMenu();
  };

  const toggleAvailability = async (item: MenuItem) => {
    await updateItemAvailability(item.id, item.available ? 0 : 1);
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    fetchMenu();
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setIsSaving(true);
    try {
      const method = editingItem.id ? 'PUT' : 'POST';
      const url = editingItem.id ? `/api/items/${editingItem.id}` : '/api/items';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });
      
      await fetchMenu();
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = (categoryId: number) => {
    setEditingItem({
      category_id: categoryId,
      name: '',
      price_fixed: 0,
      available: 1,
      description: '',
      image: ''
    });
  };

  const handleItemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingItem(prev => prev ? { ...prev, image: reader.result as string } : null);
    };
    reader.readAsDataURL(file);
  };

  const customerUrl = window.location.origin;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Black Sidebar */}
      <aside className="w-64 bg-black text-white p-6 flex flex-col border-r border-white/10">
        <div className="mb-12 flex items-center gap-3">
          <div 
            onClick={() => navigate('/')}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-pointer hover:bg-black border-2 border-transparent hover:border-white active:scale-95 transition-all shadow-lg group"
          >
            <Coffee className="text-black w-6 h-6 group-hover:text-white transition-colors" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">Bodega Admin</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setView('items')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'items' ? 'bg-white text-black shadow-lg' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-bold uppercase text-[10px] tracking-widest">Menu Items</span>
          </button>
          <button 
            onClick={() => setView('qr')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'qr' ? 'bg-white text-black shadow-lg' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <QrCode size={20} />
            <span className="font-bold uppercase text-[10px] tracking-widest">QR Code</span>
          </button>
          <button 
            onClick={() => setView('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'orders' ? 'bg-white text-black shadow-lg' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <ShoppingCart size={20} />
            <span className="font-bold uppercase text-[10px] tracking-widest">Orders</span>
          </button>
        </nav>

        <div className="pt-6 border-t border-white/10">
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer transition-all">
            <Upload size={20} />
            <span className="font-bold uppercase text-[10px] tracking-widest">Import Image</span>
            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
          </label>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto bg-white">
        {isSeeding && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
            <div className="bg-white p-12 rounded-3xl shadow-2xl flex flex-col items-center border-4 border-[#4A3728]">
              <RefreshCw className="animate-spin text-[#4A3728] mb-6" size={48} />
              <p className="font-black text-2xl text-black uppercase tracking-tighter">AI Extraction...</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">Processing your menu image</p>
            </div>
          </div>
        )}

        {view === 'items' ? (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-5xl font-black text-black uppercase tracking-tighter">Menu Management</h2>
              </div>
            </div>

            {/* Admin Sub Navbar */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-12 no-scrollbar">
              <button
                onClick={() => setActiveAdminCategory(null)}
                className={`px-6 py-2 rounded-full text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest border-2 ${
                  activeAdminCategory === null
                    ? 'bg-white text-black border-black'
                    : 'bg-black text-white border-black hover:bg-white hover:text-black'
                }`}
              >
                All
              </button>
              {menu.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveAdminCategory(cat.id)}
                  className={`px-6 py-2 rounded-full text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest border-2 ${
                    activeAdminCategory === cat.id
                      ? 'bg-white text-black border-black'
                      : 'bg-black text-white border-black hover:bg-white hover:text-black'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="space-y-16">
              {menu
                .filter(cat => activeAdminCategory === null || cat.id === activeAdminCategory)
                .map(cat => (
                <section key={cat.id}>
                  <div className="flex items-center gap-6 mb-8">
                    <h3 className="text-2xl font-black text-black uppercase tracking-tight">{cat.name}</h3>
                    <div className="h-1 flex-1 bg-black/5 rounded-full"></div>
                    <button 
                      onClick={() => openAddModal(cat.id)}
                      className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-all active:scale-95"
                    >
                      <Plus size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Add Item</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {cat.items.map(item => (
                      <div key={item.id} className="bg-white p-8 rounded-2xl border-2 border-black shadow-sm hover:shadow-xl transition-all flex justify-between items-center group relative overflow-hidden">
                        <div className="flex gap-6 items-center relative z-10">
                          {item.image && (
                            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-black shrink-0">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <div>
                            <h4 className="text-lg font-black text-black uppercase tracking-tight">{item.name}</h4>
                            <div className="flex gap-4 mt-2">
                              {item.price_fixed !== null && item.price_fixed !== undefined && <span className="text-black font-black text-xl">₱{item.price_fixed}</span>}
                              {item.price_hot !== null && item.price_hot !== undefined && <span className="text-gray-400 text-xs font-bold uppercase">Hot: <span className="text-black">₱{item.price_hot}</span></span>}
                              {item.price_cold !== null && item.price_cold !== undefined && <span className="text-gray-400 text-xs font-bold uppercase">Cold: <span className="text-black">₱{item.price_cold}</span></span>}
                            </div>
                            {item.description && <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-widest line-clamp-1">{item.description}</p>}
                            {item.addons && JSON.parse(item.addons).length > 0 && (
                              <div className="flex flex-col gap-2 mt-3">
                                <div className="flex flex-wrap gap-2">
                                  {JSON.parse(item.addons).map((addon: any, idx: number) => (
                                    <span 
                                      key={idx} 
                                      className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                        addon.available !== false 
                                          ? 'text-orange-500 bg-orange-500/5' 
                                          : 'text-gray-400 bg-gray-100 line-through'
                                      }`}
                                    >
                                      +{addon.name}
                                    </span>
                                  ))}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManagingAddonsItem(item);
                                  }}
                                  className={`self-start text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 transition-all active:scale-95 border-2 ${
                                    JSON.parse(item.addons).some((a: any) => a.available !== false) 
                                      ? 'bg-orange-500 text-white border-orange-500' 
                                      : 'bg-gray-100 text-gray-400 border-gray-200'
                                  }`}
                                  title="Manage add-ons availability"
                                >
                                  <Plus size={8} strokeWidth={4} />
                                  {JSON.parse(item.addons).some((a: any) => a.available !== false) ? 'Add-ons' : 'Add-ons Unavailable'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 relative z-10">
                          <button 
                            onClick={() => toggleAvailability(item)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                              item.available 
                                ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
                                : 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                            }`}
                          >
                            {item.available ? 'Available' : 'Sold Out'}
                          </button>
                          <button 
                            onClick={() => setEditingItem(item)}
                            className="p-2.5 text-black hover:bg-black hover:text-white border-2 border-transparent hover:border-black rounded-xl transition-all"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => deleteItem(item.id)}
                            className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : view === 'orders' ? (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-5xl font-black text-black uppercase tracking-tighter">Order Management</h2>
                <p className="text-[#4A3728] font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Real-time order tracking & status</p>
              </div>
              <button 
                onClick={fetchOrders}
                className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all active:scale-95"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-12">
              {/* Active Orders Section */}
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Active Orders</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Awaiting preparation or payment</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {orders.filter(o => !o.is_paid || o.status !== 'completed').length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No active orders</p>
                    </div>
                  ) : (
                    orders.filter(o => !o.is_paid || o.status !== 'completed').map(order => (
                      <div key={order.id} className="bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl transition-all">
                        <div className="flex flex-col lg:flex-row justify-between gap-8">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-6">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${order.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`}>
                                {order.status === 'completed' ? <CheckCircle size={24} /> : <Clock size={24} />}
                              </div>
                                <div>
                                  <h3 className="text-2xl font-black uppercase tracking-tighter">Order #{order.id}</h3>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customer ID: {order.user_email}</p>
                                </div>
                            </div>

                            <div className="space-y-3 bg-gray-50 p-6 rounded-2xl border-2 border-black/5">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-black text-xs">{item.quantity}x</span>
                                    <div className="flex flex-col">
                                      <span className="font-bold uppercase text-sm">{item.name}</span>
                                      {item.selected_addons && item.selected_addons.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {item.selected_addons.map((addon, aIdx) => (
                                            <span key={aIdx} className="text-[8px] font-black uppercase tracking-tighter bg-black/5 px-2 py-0.5 rounded-full">
                                              +{addon.name}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">({item.type})</span>
                                  </div>
                                  <span className="font-black">₱{item.price * item.quantity}</span>
                                </div>
                              ))}
                              <div className="pt-4 mt-4 border-t-2 border-black/5 flex justify-between items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Amount</span>
                                <span className="text-3xl font-black">₱{order.total}</span>
                              </div>
                            </div>
                          </div>

                          <div className="lg:w-72 flex flex-col gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Preparation Status</label>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'pending', order.is_paid)}
                                  className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 transition-all ${order.status === 'pending' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black'}`}
                                >
                                  Preparing
                                </button>
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'completed', order.is_paid)}
                                  className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 transition-all ${order.status === 'completed' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black'}`}
                                >
                                  Complete
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Payment Status</label>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => updateOrderStatus(order.id, order.status, 0)}
                                  className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 transition-all ${!order.is_paid ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black'}`}
                                >
                                  Unpaid
                                </button>
                                <button 
                                  onClick={() => updateOrderStatus(order.id, order.status, 1)}
                                  className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 transition-all ${order.is_paid ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black'}`}
                                >
                                  Paid
                                </button>
                              </div>
                            </div>

                            <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
                              <span>{new Date(order.created_at).toLocaleDateString()}</span>
                              <span>{new Date(order.created_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Order History Section */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white shadow-lg">
                      <History size={24} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter">Order History</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed & paid transactions</p>
                    </div>
                  </div>
                  <div className="bg-black text-white px-8 py-4 rounded-3xl border-4 border-orange-500 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">Total Revenue</p>
                    <p className="text-3xl font-black tracking-tighter">₱{orders.filter(o => o.is_paid && o.status === 'completed').reduce((sum, o) => sum + o.total, 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {orders.filter(o => o.is_paid && o.status === 'completed').length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No history found</p>
                    </div>
                  ) : (
                    orders.filter(o => o.is_paid && o.status === 'completed').map(order => (
                      <div key={order.id} className="bg-gray-50 border-2 border-black/10 rounded-[2.5rem] p-8 opacity-80 hover:opacity-100 transition-all">
                        <div className="flex flex-col lg:flex-row justify-between gap-8">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                                <CheckCircle size={20} />
                              </div>
                              <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Order #{order.id}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {order.user_email} • {new Date(order.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex flex-col gap-1">
                                  <span className="bg-white px-3 py-1 rounded-full border border-black/5 text-[10px] font-bold uppercase">
                                    {item.quantity}x {item.name}
                                  </span>
                                  {item.selected_addons && item.selected_addons.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pl-2">
                                      {item.selected_addons.map((addon, aIdx) => (
                                        <span key={aIdx} className="text-[7px] font-black uppercase tracking-tighter text-gray-400">
                                          +{addon.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Paid</span>
                            <span className="text-2xl font-black">₱{order.total}</span>
                            <button 
                              onClick={() => updateOrderStatus(order.id, order.status, 0)}
                              className="mt-4 text-[9px] font-black uppercase tracking-widest text-red-500 hover:underline"
                            >
                              Mark as Unpaid
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center py-20">
            <h2 className="text-5xl font-black text-black uppercase tracking-tighter mb-6">Customer QR</h2>
            <p className="text-[#4A3728] font-bold uppercase tracking-widest text-xs mb-16">Scan to view the menu</p>
            
            <div className="bg-black p-16 rounded-[3rem] shadow-2xl inline-block border-8 border-orange-500">
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG 
                  value={customerUrl} 
                  size={256}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="mt-10">
                <p className="text-2xl font-black text-white uppercase tracking-tighter mb-1">BODEGA COFFEE</p>
                <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.4em]">Mandaue City</p>
              </div>
            </div>
            
            <div className="mt-16">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Direct Access Link</p>
              <div className="bg-gray-100 px-6 py-4 rounded-2xl text-black font-mono text-sm border border-gray-200 inline-block">
                {customerUrl}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Item Editor Modal */}
      {/* Add-ons Management Modal */}
      <AnimatePresence>
        {managingAddonsItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setManagingAddonsItem(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border-2 border-black relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Manage Add-ons</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mt-1">{managingAddonsItem.name}</p>
                </div>
                <button 
                  onClick={() => setManagingAddonsItem(null)}
                  className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 mb-8">
                {JSON.parse(managingAddonsItem.addons || '[]').map((addon: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const addons = JSON.parse(managingAddonsItem.addons || '[]');
                      addons[idx].available = addons[idx].available === false ? true : false;
                      const updatedItem = { ...managingAddonsItem, addons: JSON.stringify(addons) };
                      setManagingAddonsItem(updatedItem);
                      updateItemAvailability(updatedItem.id, updatedItem.available, updatedItem.addons);
                    }}
                    className={`w-full flex justify-between items-center p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                      addon.available !== false 
                        ? 'border-orange-500 bg-orange-500/5 text-black' 
                        : 'border-gray-100 bg-gray-50 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                        addon.available !== false ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-300'
                      }`}>
                        {addon.available !== false ? <Check size={12} strokeWidth={4} /> : <X size={12} strokeWidth={4} />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-tight">{addon.name}</span>
                    </div>
                    <span className="text-[10px] font-bold">₱{addon.price}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  const addons = JSON.parse(managingAddonsItem.addons || '[]');
                  const allAvailable = addons.every((a: any) => a.available !== false);
                  const newAddons = addons.map((a: any) => ({ ...a, available: !allAvailable }));
                  const updatedItem = { ...managingAddonsItem, addons: JSON.stringify(newAddons) };
                  setManagingAddonsItem(updatedItem);
                  updateItemAvailability(updatedItem.id, updatedItem.available, updatedItem.addons);
                }}
                className="w-full py-4 rounded-2xl border-2 border-black font-black uppercase tracking-widest text-[10px] hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                Toggle All Add-ons
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 border-4 border-black shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">{editingItem.id ? 'Edit Item' : 'Add New Item'}</h2>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Refine your menu details</p>
                </div>
                <button 
                  onClick={() => setEditingItem(null)}
                  className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveItem} className="space-y-8">
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-black rounded-3xl bg-gray-50">
                    {editingItem.image ? (
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-black">
                        <img src={editingItem.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          type="button"
                          onClick={() => setEditingItem({...editingItem, image: ''})}
                          className="absolute top-2 right-2 bg-black text-white p-2 rounded-full hover:bg-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full aspect-video flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 transition-all gap-2">
                        <ImageIcon size={40} className="text-gray-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Upload Item Image</span>
                        <input type="file" className="hidden" onChange={handleItemImageUpload} accept="image/*" />
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3">Item Name</label>
                    <input 
                      required
                      type="text"
                      value={editingItem.name || ''}
                      onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-black font-bold focus:ring-4 focus:ring-black/5 outline-none transition-all"
                      placeholder="e.g. Spanish Latte"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3">Description</label>
                    <textarea 
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-black font-bold focus:ring-4 focus:ring-black/5 outline-none transition-all min-h-[100px]"
                      placeholder="Tell customers about this item..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3">Fixed Price</label>
                      <input 
                        type="number"
                        value={editingItem.price_fixed ?? ''}
                        onChange={(e) => setEditingItem({...editingItem, price_fixed: e.target.value ? Number(e.target.value) : null})}
                        className="w-full px-4 py-4 rounded-2xl border-2 border-black font-bold focus:ring-4 focus:ring-black/5 outline-none transition-all"
                        placeholder="₱"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3">Hot Price</label>
                      <input 
                        type="number"
                        value={editingItem.price_hot ?? ''}
                        onChange={(e) => setEditingItem({...editingItem, price_hot: e.target.value ? Number(e.target.value) : null})}
                        className="w-full px-4 py-4 rounded-2xl border-2 border-black font-bold focus:ring-4 focus:ring-black/5 outline-none transition-all"
                        placeholder="₱"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3">Cold Price</label>
                      <input 
                        type="number"
                        value={editingItem.price_cold ?? ''}
                        onChange={(e) => setEditingItem({...editingItem, price_cold: e.target.value ? Number(e.target.value) : null})}
                        className="w-full px-4 py-4 rounded-2xl border-2 border-black font-bold focus:ring-4 focus:ring-black/5 outline-none transition-all"
                        placeholder="₱"
                      />
                    </div>
                  </div>

                  {/* Addons Management */}
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest">Add-ons</label>
                    <div className="space-y-2">
                      {(editingItem.addons ? JSON.parse(editingItem.addons) : []).map((addon: { name: string, price: number, available?: boolean }, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => {
                              const addons = JSON.parse(editingItem.addons || '[]');
                              addons[idx].available = addons[idx].available === false ? true : false;
                              setEditingItem({...editingItem, addons: JSON.stringify(addons)});
                            }}
                            className={`p-2 rounded-xl border-2 transition-all ${
                              addon.available !== false 
                                ? 'border-green-500 text-green-500 bg-green-50' 
                                : 'border-gray-300 text-gray-300 bg-gray-50'
                            }`}
                            title={addon.available !== false ? "Add-on Available" : "Add-on Unavailable"}
                          >
                            {addon.available !== false ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                          </button>
                          <input 
                            type="text"
                            value={addon.name}
                            onChange={(e) => {
                              const addons = JSON.parse(editingItem.addons || '[]');
                              addons[idx].name = e.target.value;
                              setEditingItem({...editingItem, addons: JSON.stringify(addons)});
                            }}
                            className={`flex-1 px-4 py-2 rounded-xl border-2 border-black font-bold text-xs ${addon.available === false ? 'opacity-50' : ''}`}
                            placeholder="Addon Name"
                          />
                          <input 
                            type="number"
                            value={addon.price}
                            onChange={(e) => {
                              const addons = JSON.parse(editingItem.addons || '[]');
                              addons[idx].price = Number(e.target.value);
                              setEditingItem({...editingItem, addons: JSON.stringify(addons)});
                            }}
                            className={`w-24 px-4 py-2 rounded-xl border-2 border-black font-bold text-xs ${addon.available === false ? 'opacity-50' : ''}`}
                            placeholder="₱"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const addons = JSON.parse(editingItem.addons || '[]');
                              const newAddons = addons.filter((_: any, i: number) => i !== idx);
                              setEditingItem({...editingItem, addons: JSON.stringify(newAddons)});
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => {
                          const addons = JSON.parse(editingItem.addons || '[]');
                          addons.push({ name: '', price: 0, available: true });
                          setEditingItem({...editingItem, addons: JSON.stringify(addons)});
                        }}
                        className="w-full py-2 rounded-xl border-2 border-dashed border-black text-[10px] font-black uppercase tracking-widest hover:bg-black/5 transition-all"
                      >
                        + Add Add-on
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    {editingItem.id ? 'Update Item' : 'Create Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
