import React, { useState, useEffect } from 'react';
import { Category, MenuItem, Order } from '../types';
import { Coffee, Info, ChevronRight, ShoppingBag, X, Plus, Minus, Trash2, History, CreditCard, RefreshCw, ClipboardList, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface CartItem extends MenuItem {
  quantity: number;
  selectedType: 'hot' | 'cold' | 'fixed';
  selectedPrice: number;
  selectedAddons: { name: string, price: number }[];
}

export default function CustomerMenu() {
  const [menu, setMenu] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(false);
  
  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ 
    item: MenuItem, 
    type: 'hot' | 'cold' | 'fixed', 
    price: number,
    selectedAddons: { name: string, price: number }[]
  } | null>(null);
  
  const [customerId] = useState(() => {
    const saved = localStorage.getItem('cafe_customer_id');
    if (saved) return saved;
    const newId = `CUST-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    localStorage.setItem('cafe_customer_id', newId);
    return newId;
  });

  const navigate = useNavigate();

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    if (newCount === 3) {
      setLogoClicks(0);
      setShowAdminModal(true);
    } else {
      setLogoClicks(newCount);
      setTimeout(() => setLogoClicks(0), 2000);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "admin") {
      setShowAdminModal(false);
      setAdminPassword('');
      navigate('/admin');
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    }
  };

  const fetchOrders = () => {
    fetch(`/api/orders?customerId=${customerId}`)
      .then(res => res.json())
      .then(data => setOrders(data));
  };

  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        setMenu(data);
        // Default to "All" (null)
        setActiveCategory(null);
        setLoading(false);
      });
    fetchOrders();
  }, []);

  const addToCart = (item: MenuItem, type: 'hot' | 'cold' | 'fixed', price: number) => {
    setPendingItem({ item, type, price, selectedAddons: [] });
  };

  const confirmAddToCart = () => {
    if (!pendingItem) return;
    const { item, type, price, selectedAddons } = pendingItem;
    setCart(prev => {
      // We check for same item, same type, AND same addons to group them
      const existing = prev.find(i => 
        i.id === item.id && 
        i.selectedType === type && 
        JSON.stringify(i.selectedAddons) === JSON.stringify(selectedAddons)
      );
      if (existing) {
        return prev.map(i => 
          i.id === item.id && 
          i.selectedType === type && 
          JSON.stringify(i.selectedAddons) === JSON.stringify(selectedAddons)
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, selectedType: type, selectedPrice: price, selectedAddons }];
    });
    setPendingItem(null);
  };

  const updateCartQuantity = (id: number, type: string, addons: any[], delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id && i.selectedType === type && JSON.stringify(i.selectedAddons) === JSON.stringify(addons)) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const addonsTotal = item.selectedAddons.reduce((s, a) => s + a.price, 0);
    return sum + ((item.selectedPrice + addonsTotal) * item.quantity);
  }, 0);

  const finalizeOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: customerId,
          total: cartTotal,
          items: cart.map(i => ({
            id: i.id,
            name: i.name,
            price: i.selectedPrice,
            quantity: i.quantity,
            type: i.selectedType,
            selectedAddons: i.selectedAddons
          }))
        })
      });
      if (res.ok) {
        setCart([]);
        setShowCart(false);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handlePay = async (orderId: number) => {
    await fetch(`/api/orders/${orderId}/pay`, { method: 'PUT' });
    fetchOrders();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center">
          <Coffee className="w-12 h-12 text-black mb-4" />
          <p className="text-black font-medium uppercase tracking-widest">Loading Menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20 font-sans text-black">
      {/* Black Navbar */}
      <header className="bg-black sticky top-0 z-20 shadow-2xl">
        {/* Main Brand Bar */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            {/* Logo Space - Triple click for Admin */}
            <div 
              onClick={handleLogoClick}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-lg cursor-pointer active:scale-95 hover:bg-black border-2 border-transparent hover:border-white transition-all group"
            >
              <Coffee className="text-black w-6 h-6 group-hover:text-white transition-colors" />
            </div>
            <div className="text-left flex-1">
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase leading-none">BODEGA</h1>
              <p className="text-[8px] text-white/80 font-bold tracking-[0.2em] uppercase mt-1">COWORKING CAFE</p>
            </div>

            {/* Cart & Tracker Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={() => setShowOrderTracker(true)}
                className="relative w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all group"
              >
                <ClipboardList className="text-black w-6 h-6" />
                {orders.some(o => !o.is_paid || o.status !== 'completed') && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-black">
                    {orders.filter(o => !o.is_paid || o.status !== 'completed').length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setShowCart(true)}
                className="relative w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all group"
              >
                <ShoppingBag className="text-black w-6 h-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sub Navbar for Categories - Black Background */}
        <div className="bg-black px-6 py-3 overflow-x-auto no-scrollbar border-b border-white/10">
          <nav className="max-w-4xl mx-auto flex gap-3 min-w-max">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black transition-all whitespace-nowrap uppercase tracking-widest border-2 ${
                activeCategory === null
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-white border-white hover:bg-white hover:text-black'
              }`}
            >
              All
            </button>
            {menu.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-[9px] font-black transition-all whitespace-nowrap uppercase tracking-widest border-2 ${
                  activeCategory === cat.id
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-white border-white hover:bg-white hover:text-black'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Menu Items */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory ?? 'all'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-16"
          >
            {menu
              .filter(cat => activeCategory === null || cat.id === activeCategory)
              .map(cat => (
                <section key={cat.id}>
                  {activeCategory === null && (
                    <div className="flex items-center gap-6 mb-8">
                      <h3 className="text-2xl font-black text-black uppercase tracking-tight">{cat.name}</h3>
                      <div className="h-1 flex-1 bg-black/5 rounded-full"></div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cat.items.map(item => (
                      <div 
                        key={item.id} 
                        className={`group bg-white border-2 border-black p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 ${!item.available ? 'opacity-60' : ''}`}
                      >
                        {/* Decorative background element */}
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-black/5 rounded-full group-hover:bg-white/10 transition-colors" />
                        
                        {item.image && (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4 border border-black/10 group-hover:border-white/20 transition-colors">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-xl font-black uppercase tracking-tight leading-tight">
                              {item.name}
                            </h3>
                            <div className="flex gap-2 items-center">
                              {item.available ? (
                                <span className="bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Available</span>
                              ) : (
                                <span className="bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Sold Out</span>
                              )}
                              {item.addons && JSON.parse(item.addons).length > 0 && (
                                <span className={`text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-sm ${
                                  JSON.parse(item.addons).some((a: any) => a.available !== false) 
                                    ? 'bg-orange-500' 
                                    : 'bg-gray-400'
                                }`}>
                                  <Plus size={8} strokeWidth={4} />
                                  {JSON.parse(item.addons).some((a: any) => a.available !== false) ? 'Add-ons' : 'Add-ons Unavailable'}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {item.description && (
                            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4 italic">
                              {item.description}
                            </p>
                          )}

                          {item.addons && JSON.parse(item.addons).length > 0 && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-6">
                              {JSON.parse(item.addons).map((addon: any, idx: number) => (
                                <span key={idx} className="text-[8px] font-black text-orange-500 uppercase tracking-widest">
                                  +{addon.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-end justify-between mt-auto relative z-10">
                          <div className="flex gap-4">
                            {item.price_fixed !== null && (
                              <button 
                                disabled={!item.available}
                                onClick={() => addToCart(item, 'fixed', item.price_fixed!)}
                                className="flex flex-col items-start group/btn disabled:opacity-50"
                              >
                                <span className="text-[8px] uppercase font-black opacity-40 mb-1 group-hover/btn:opacity-100">Price</span>
                                <div className="flex items-center gap-2 bg-[#4A3728]/10 px-3 py-2 rounded-xl group-hover/btn:bg-[#4A3728] group-hover/btn:text-white transition-all">
                                  <span className="text-lg font-black">₱{item.price_fixed}</span>
                                  <Plus size={14} />
                                </div>
                              </button>
                            )}
                            {item.price_hot !== null && (
                              <button 
                                disabled={!item.available}
                                onClick={() => addToCart(item, 'hot', item.price_hot!)}
                                className="flex flex-col items-start group/btn disabled:opacity-50"
                              >
                                <span className="text-[8px] uppercase font-black opacity-40 mb-1 group-hover/btn:opacity-100">Hot</span>
                                <div className="flex items-center gap-2 bg-orange-500/10 px-3 py-2 rounded-xl group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-all">
                                  <span className="text-lg font-black">₱{item.price_hot}</span>
                                  <Plus size={14} />
                                </div>
                              </button>
                            )}
                            {item.price_cold !== null && (
                              <button 
                                disabled={!item.available}
                                onClick={() => addToCart(item, 'cold', item.price_cold!)}
                                className="flex flex-col items-start group/btn disabled:opacity-50"
                              >
                                <span className="text-[8px] uppercase font-black opacity-40 mb-1 group-hover/btn:opacity-100">Cold</span>
                                <div className="flex items-center gap-2 bg-orange-500/10 px-3 py-2 rounded-xl group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-all">
                                  <span className="text-lg font-black">₱{item.price_cold}</span>
                                  <Plus size={14} />
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="h-px bg-black/20 mb-12" />
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center">
            <Info className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Mandaue City • Bodega Coffee</p>
          <p className="text-[9px] text-gray-400 font-medium uppercase mt-2">© 2026 Bodega Coffee Roasters</p>
        </div>
      </footer>

      {/* Order Tracker Modal */}
      <AnimatePresence>
        {showOrderTracker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-6"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 sm:p-10 border-t-4 sm:border-4 border-black shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Order Tracker</h2>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Customer ID: {customerId}</p>
                </div>
                <button 
                  onClick={() => setShowOrderTracker(false)}
                  className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-10 pr-2 no-scrollbar">
                {/* Active Orders Section */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <Clock size={18} className="text-orange-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Active Orders</h3>
                  </div>
                  {orders.filter(o => !o.is_paid || o.status !== 'completed').length === 0 ? (
                    <p className="text-center py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">No active orders</p>
                  ) : (
                    <div className="space-y-4">
                      {orders.filter(o => !o.is_paid || o.status !== 'completed').map(order => (
                        <div key={order.id} className="bg-white border-2 border-black p-5 rounded-2xl shadow-md">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Order #{order.id}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] font-bold text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</p>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                  order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                  {order.status === 'completed' ? 'Complete' : 'Preparing'}
                                </span>
                              </div>
                            </div>
                            {!order.is_paid ? (
                              <button 
                                onClick={() => handlePay(order.id)}
                                className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all"
                              >
                                Pay ₱{order.total}
                              </button>
                            ) : (
                              <div className="bg-emerald-100 text-emerald-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                                Paid
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex flex-col">
                                <div className="flex justify-between text-[11px]">
                                  <span className="font-bold">{item.quantity}x {item.name}</span>
                                  <span className="font-black">₱{item.price * item.quantity}</span>
                                </div>
                                {item.selected_addons && item.selected_addons.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
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
                      ))}
                    </div>
                  )}
                </section>

                {/* Order History Section */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <History size={18} className="text-black" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Order History</h3>
                  </div>
                  {orders.filter(o => o.is_paid && o.status === 'completed').length === 0 ? (
                    <p className="text-center py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">No past orders</p>
                  ) : (
                    <div className="space-y-4">
                      {orders.filter(o => o.is_paid && o.status === 'completed').map(order => (
                        <div key={order.id} className="bg-gray-50 border border-black/5 p-5 rounded-2xl opacity-80">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Order #{order.id}</p>
                              <p className="text-[10px] font-bold text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className="text-emerald-600 text-[8px] font-black uppercase tracking-widest">Completed</span>
                          </div>
                          <div className="space-y-2 mb-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex flex-col">
                                <div className="flex justify-between text-[10px]">
                                  <span className="font-bold">{item.quantity}x {item.name}</span>
                                  <span className="font-black">₱{item.price * item.quantity}</span>
                                </div>
                                {item.selected_addons && item.selected_addons.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
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
                          <div className="flex justify-between items-center pt-3 border-t border-black/5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Amount</span>
                            <span className="font-black text-sm">₱{order.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-6"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 sm:p-10 border-t-4 sm:border-4 border-black shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Your Cart</h2>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Review your selection</p>
                </div>
                <div className="flex items-center gap-3">
                  {cart.length > 0 && (
                    <button 
                      onClick={() => setCart([])}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-red-500 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={14} />
                      Clear All
                    </button>
                  )}
                  <button 
                    onClick={() => setShowCart(false)}
                    className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 no-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Your cart is empty</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={`${item.id}-${item.selectedType}-${idx}`} className="flex gap-4 items-center bg-gray-50 p-4 rounded-2xl border-2 border-black/5">
                      {item.image && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-black/10 shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-black uppercase text-sm tracking-tight">{item.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.selectedType} • ₱{item.selectedPrice}</p>
                        {item.selectedAddons.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.selectedAddons.map(addon => (
                              <span key={addon.name} className="text-[8px] font-black uppercase tracking-tighter bg-black/5 px-2 py-0.5 rounded-full">
                                +{addon.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 bg-white border-2 border-black rounded-xl p-1">
                        <button 
                          onClick={() => updateCartQuantity(item.id, item.selectedType, item.selectedAddons, -1)}
                          className="p-1 hover:bg-black hover:text-white rounded-lg transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQuantity(item.id, item.selectedType, item.selectedAddons, 1)}
                          className="p-1 hover:bg-black hover:text-white rounded-lg transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => setCart(prev => prev.filter(i => 
                          !(i.id === item.id && i.selectedType === item.selectedType && JSON.stringify(i.selectedAddons) === JSON.stringify(item.selectedAddons))
                        ))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Remove from cart"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="mt-8 pt-8 border-t-4 border-black space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-gray-400 font-black uppercase tracking-widest text-xs">Total Amount</span>
                    <span className="text-4xl font-black tracking-tighter">₱{cartTotal}</span>
                  </div>
                  <button 
                    onClick={finalizeOrder}
                    disabled={isSubmittingOrder}
                    className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmittingOrder ? <RefreshCw className="animate-spin" size={20} /> : <ShoppingBag size={20} />}
                    Finalize Order
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add to Cart Confirmation Modal */}
      <AnimatePresence>
        {pendingItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 border-4 border-black shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white mx-auto mb-6">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Add to cart?</h3>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-6">
                {pendingItem.item.name} ({pendingItem.type})
              </p>

              {pendingItem.item.addons && JSON.parse(pendingItem.item.addons).length > 0 && (
                <div className="text-left mb-8 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-black">Would you like an add-on?</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto pr-2 no-scrollbar space-y-2">
                    {JSON.parse(pendingItem.item.addons).map((addon: { name: string, price: number, available?: boolean }) => {
                      const isSelected = pendingItem.selectedAddons.some(a => a.name === addon.name);
                      const isAvailable = addon.available !== false;
                      return (
                        <button
                          key={addon.name}
                          disabled={!isAvailable}
                          onClick={() => {
                            setPendingItem(prev => {
                              if (!prev) return null;
                              const alreadySelected = prev.selectedAddons.some(a => a.name === addon.name);
                              const newAddons = alreadySelected
                                ? prev.selectedAddons.filter(a => a.name !== addon.name)
                                : [...prev.selectedAddons, addon];
                              return { ...prev, selectedAddons: newAddons };
                            });
                          }}
                          className={`w-full flex justify-between items-center p-3 rounded-xl border-2 transition-all ${
                            !isAvailable 
                              ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                              : isSelected 
                                ? 'border-orange-500 bg-orange-500 text-white' 
                                : 'border-black/5 bg-gray-50 text-black hover:border-black/20'
                          }`}
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black uppercase tracking-tight">{addon.name}</span>
                            {!isAvailable && <span className="text-[7px] font-black uppercase text-red-400">Unavailable</span>}
                          </div>
                          <span className="text-[10px] font-bold">+₱{addon.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setPendingItem(null)}
                  className="flex-1 py-4 rounded-2xl border-2 border-black font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
                >
                  No
                </button>
                <button 
                  onClick={confirmAddToCart}
                  className="flex-1 py-4 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-gray-900 transition-all shadow-lg"
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Password Modal */}
      <AnimatePresence>
        {showAdminModal && (
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
              className="bg-white w-full max-w-sm rounded-3xl p-8 border-4 border-black shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Admin Access</h2>
                <button 
                  onClick={() => setShowAdminModal(false)}
                  className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                >
                  <span className="font-bold">×</span>
                </button>
              </div>
              
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Password</label>
                  <input 
                    autoFocus
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-bold transition-all outline-none ${adminError ? 'border-red-500 bg-red-50' : 'border-black focus:ring-4 focus:ring-black/5'}`}
                    placeholder="••••••••"
                  />
                  {adminError && (
                    <p className="text-red-500 text-[9px] font-black uppercase mt-2 tracking-widest">Access Denied</p>
                  )}
                </div>
                <button 
                  type="submit"
                  className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all shadow-lg"
                >
                  Login
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
