/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Home, 
  Wallet, 
  ShoppingBag, 
  User, 
  Bell, 
  Menu, 
  ChevronRight, 
  Plus, 
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  LogOut,
  Settings,
  History,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---
interface Category {
  id: number;
  name: string;
  image_url: string;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  image_url: string;
}

interface Product {
  id: number;
  subcategory_id: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  requires_input: boolean;
  store_type: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  balance: number;
  role: string;
  personal_number: string;
  phone?: string;
  telegram_chat_id?: number | null;
}

interface Order {
  id: number;
  product_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  meta: string;
}

interface Transaction {
  id: number;
  amount: number;
  method_name: string;
  status: string;
  created_at: string;
  receipt_image_url: string;
  note: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  wallet_address: string;
  instructions: string;
  image_url: string;
  min_amount: number;
}

interface Banner {
  id: number;
  image_url: string;
}

interface Offer {
  id: number;
  title: string;
  description: string;
  image_url: string;
}

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [user, setUser] = useState<UserData | null>(null);
  const [view, setView] = useState<{ type: string; id?: number; data?: any }>({ type: "main" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchPaymentMethods();
    fetchBanners();
    fetchOffers();
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      fetchUser(parsed.id);
    }

    // Handle referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      localStorage.setItem("referralCode", ref);
      if (!savedUser) {
        setView({ type: "login" });
      }
    }
  }, []);

  useEffect(() => {
    if (user?.telegram_chat_id) {
      setNotifications([
        {
          id: 'tg-link',
          title: 'تم ربط حسابك ببوت تلجرام',
          message: 'لقد تم ربط حسابك ببوت تلجرام. إن لم تكن أنت، يرجى الضغط على فك الارتباط وتغيير بياناتك.',
          type: 'warning',
          action: 'unlink'
        }
      ]);
    } else {
      setNotifications([]);
    }
  }, [user]);

  const handleUnlinkTelegram = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/user/unlink-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        fetchUser(user.id);
        alert("تم فك الارتباط بنجاح. يرجى تغيير كلمة المرور لزيادة الأمان.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUser = async (id: number) => {
    try {
      const res = await fetch(`/api/user/${id}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      if (data) {
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      }
    } catch (e) {
      console.error("Fetch user error:", e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data || []);
    } catch (e) {
      console.error("Fetch categories error:", e);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch("/api/payment-methods");
      if (!res.ok) throw new Error("Failed to fetch payment methods");
      const data = await res.json();
      setPaymentMethods(data || []);
    } catch (e) {
      console.error("Fetch payment methods error:", e);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/banners");
      if (!res.ok) throw new Error("Failed to fetch banners");
      const data = await res.json();
      setBanners(data || []);
    } catch (e) {
      console.error("Fetch banners error:", e);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await fetch("/api/offers");
      if (!res.ok) throw new Error("Failed to fetch offers");
      const data = await res.json();
      setOffers(data || []);
    } catch (e) {
      console.error("Fetch offers error:", e);
    }
  };

  const fetchSubcategories = async (catId: number) => {
    try {
      const res = await fetch(`/api/categories/${catId}/subcategories`);
      if (!res.ok) throw new Error("Failed to fetch subcategories");
      const data = await res.json();
      setSubcategories(data || []);
    } catch (e) {
      console.error("Fetch subcategories error:", e);
    }
  };

  const fetchProducts = async (subId: number) => {
    try {
      const res = await fetch(`/api/subcategories/${subId}/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data || []);
    } catch (e) {
      console.error("Fetch products error:", e);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data || []);
    } catch (e) {
      console.error("Fetch orders error:", e);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/transactions/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      setTransactions(data || []);
    } catch (e) {
      console.error("Fetch transactions error:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "orders") fetchOrders();
    if (activeTab === "wallet" || view.type === "payments") fetchTransactions();
  }, [activeTab, view.type, user]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setIsDrawerOpen(false);
    setActiveTab("home");
    setView({ type: "main" });
  };

  // --- UI Components ---

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-40">
      <div className="flex items-center gap-3">
        <button onClick={() => setIsDrawerOpen(true)} className="p-2 hover:bg-gray-50 rounded-full">
          <Menu size={24} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">V</div>
          <span className="font-bold text-gray-800 hidden sm:block">فيبرو</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {user && (
          <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-2 border border-emerald-100">
            <Wallet size={16} />
            <span className="font-bold">{user.balance.toFixed(2)} $</span>
          </div>
        )}
        <button onClick={() => setNotificationsOpen(true)} className="p-2 hover:bg-gray-50 rounded-full relative">
          <Bell size={22} className="text-gray-600" />
          {notifications.length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>
      </div>
    </header>
  );

  const NotificationPanel = () => (
    <AnimatePresence>
      {notificationsOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNotificationsOpen(false)}
            className="fixed inset-0 bg-black/20 z-50"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-800">الإشعارات</h3>
              <button onClick={() => setNotificationsOpen(false)} className="p-2 bg-gray-100 rounded-full">
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {notifications.length > 0 ? (
                notifications.map(notif => (
                  <div key={notif.id} className={`p-4 rounded-2xl border ${notif.type === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                    <h4 className={`font-bold mb-1 ${notif.type === 'warning' ? 'text-amber-800' : 'text-blue-800'}`}>{notif.title}</h4>
                    <p className={`text-sm leading-relaxed ${notif.type === 'warning' ? 'text-amber-700' : 'text-blue-700'}`}>{notif.message}</p>
                    {notif.action === 'unlink' && (
                      <button 
                        onClick={handleUnlinkTelegram}
                        className="mt-3 bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
                      >
                        فك الارتباط الآن
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bell size={48} className="mb-4 opacity-20" />
                  <p>لا توجد إشعارات حالياً</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-40">
      <button 
        onClick={() => { setActiveTab("home"); setView({ type: "main" }); }}
        className={`flex flex-col items-center gap-1 ${activeTab === "home" ? "text-emerald-600" : "text-gray-400"}`}
      >
        <Home size={22} />
        <span className="text-[10px] font-medium">الرئيسية</span>
      </button>
      <button 
        onClick={() => setActiveTab("wallet")}
        className={`flex flex-col items-center gap-1 ${activeTab === "wallet" ? "text-emerald-600" : "text-gray-400"}`}
      >
        <Wallet size={22} />
        <span className="text-[10px] font-medium">شحن الرصيد</span>
      </button>
      <button 
        onClick={() => setActiveTab("orders")}
        className={`flex flex-col items-center gap-1 ${activeTab === "orders" ? "text-emerald-600" : "text-gray-400"}`}
      >
        <ShoppingBag size={22} />
        <span className="text-[10px] font-medium">الطلبات</span>
      </button>
      <button 
        onClick={() => setActiveTab("profile")}
        className={`flex flex-col items-center gap-1 ${activeTab === "profile" ? "text-emerald-600" : "text-gray-400"}`}
      >
        <User size={22} />
        <span className="text-[10px] font-medium">الملخص</span>
      </button>
    </nav>
  );

  const Drawer = () => (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 z-50"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col"
          >
            <div className="p-6 bg-emerald-600 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <User size={32} />
              </div>
              <h3 className="font-bold text-lg">{user ? user.name : "زائر"}</h3>
              <p className="text-emerald-100 text-sm">{user ? user.email : "سجل الدخول للمزيد"}</p>
            </div>
            
            <div className="flex-1 py-4 overflow-y-auto">
              <DrawerItem icon={<User size={20} />} label="الملف الشخصي" onClick={() => { setActiveTab("profile"); setView({ type: "main" }); setIsDrawerOpen(false); }} />
              <DrawerItem icon={<History size={20} />} label="دفعاتي" onClick={() => { setActiveTab("profile"); setView({ type: "payments" }); setIsDrawerOpen(false); }} />
              <DrawerItem icon={<ShoppingBag size={20} />} label="طلباتي" onClick={() => { setActiveTab("orders"); setIsDrawerOpen(false); }} />
              <DrawerItem icon={<MessageSquare size={20} />} label="تذاكر الدعم" onClick={() => setIsDrawerOpen(false)} />
              <div className="border-t border-gray-100 my-2"></div>
              {user ? (
                <DrawerItem icon={<LogOut size={20} />} label="تسجيل الخروج" onClick={handleLogout} className="text-red-500" />
              ) : (
                <DrawerItem icon={<ArrowRight size={20} />} label="تسجيل الدخول" onClick={() => { setView({ type: "login" }); setIsDrawerOpen(false); }} />
              )}
            </div>
            
            <div className="p-4 text-center text-xs text-gray-400 border-t border-gray-100">
              الإصدار 1.0.0
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const DrawerItem = ({ icon, label, onClick, className = "" }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${className}`}>
      <span className="text-gray-500">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );

  // --- Views ---

  const HomeView = () => {
    const [currentBanner, setCurrentBanner] = useState(0);

    useEffect(() => {
      if (banners.length > 1) {
        const timer = setInterval(() => {
          setCurrentBanner((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
      }
    }, [banners]);

    return (
      <div className="space-y-6 pb-20">
        {/* Hero Carousel */}
        <div className="px-4">
          <div className="h-44 bg-gray-100 rounded-2xl overflow-hidden relative shadow-lg shadow-emerald-50">
            {banners.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.img
                  key={banners[currentBanner].id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={banners[currentBanner].image_url}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
            ) : (
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 flex flex-col justify-center px-6 text-white">
                <h2 className="text-2xl font-bold mb-1">أفضل العروض</h2>
                <p className="text-emerald-50 opacity-90 text-sm">اشحن ألعابك المفضلة بضغطة واحدة</p>
                <button className="mt-4 bg-white text-emerald-600 px-4 py-1.5 rounded-full text-sm font-bold w-fit">اكتشف الآن</button>
              </div>
            )}
            
            {banners.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {banners.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all ${idx === currentBanner ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Categories */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">الأقسام الرئيسية</h3>
          <button className="text-emerald-600 text-sm font-medium">عرض الكل</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {categories.map(cat => (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              key={cat.id}
              onClick={() => {
                fetchSubcategories(cat.id);
                setView({ type: "subcategories", id: cat.id, data: cat.name });
              }}
              className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 hover:border-emerald-200 transition-colors"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center overflow-hidden">
                <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <span className="font-bold text-gray-700 text-[10px] text-center">{cat.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Dynamic Offers */}
      {offers.length > 0 && (
        <div className="px-4">
          <h3 className="font-bold text-gray-800 mb-4">عروض مميزة</h3>
          <div className="space-y-4">
            {offers.map(offer => (
              <div key={offer.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {offer.image_url ? (
                    <img src={offer.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon size={24} className="text-orange-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-sm">{offer.title}</h4>
                  <p className="text-gray-400 text-xs">{offer.description}</p>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

  const SubcategoriesView = () => (
    <div className="px-4 space-y-4 pb-20">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setView({ type: "main" })} className="p-2 bg-gray-100 rounded-full">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">{view.data}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {subcategories.map(sub => (
          <motion.button 
            whileTap={{ scale: 0.98 }}
            key={sub.id}
            onClick={() => {
              fetchProducts(sub.id);
              setView({ type: "products", id: sub.id, data: sub.name });
            }}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-emerald-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                <img src={sub.image_url || "https://picsum.photos/seed/sub/100/100"} alt={sub.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <span className="font-bold text-gray-700">{sub.name}</span>
            </div>
            <ChevronRight size={20} className="text-gray-300" />
          </motion.button>
        ))}
      </div>
    </div>
  );

  const ProductsView = () => (
    <div className="px-4 space-y-4 pb-20">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setView({ type: "subcategories", data: "الرجوع" })} className="p-2 bg-gray-100 rounded-full">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">{view.data}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {products.map(prod => (
          <div key={prod.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                <img src={prod.image_url || "https://picsum.photos/seed/prod/100/100"} alt={prod.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800">{prod.name}</h4>
                <p className="text-emerald-600 font-bold">{prod.price.toFixed(2)} $</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">{prod.description || "لا يوجد وصف متاح لهذا المنتج."}</p>
            <button 
              onClick={() => {
                if (!user) return setView({ type: "login" });
                if (prod.store_type === 'quick_order') {
                  setView({ type: "quick_order", data: prod });
                } else {
                  setView({ type: "checkout", data: prod });
                }
              }}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              {prod.store_type === 'quick_order' ? "طلب سريع" : "شراء الآن"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const QuickOrderView = () => {
    const prod = view.data;
    const [playerId, setPlayerId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const finalPrice = user?.is_vip ? prod.price * 0.95 : prod.price;

    const handleQuickOrder = async () => {
      if (!user) return;
      if (!playerId) return setError("يرجى إدخال المعرف");
      
      setLoading(true);
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            productId: prod.id,
            quantity: 1,
            extraData: { playerId, storeType: 'quick_order' }
          })
        });
        const data = await res.json();
        if (data.success) {
          fetchUser(user.id);
          setView({ type: "success", data: "تم إرسال الطلب السريع بنجاح!" });
        } else {
          setError(data.error || "حدث خطأ ما");
        }
      } catch (e) {
        setError("فشل الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="px-4 space-y-6 pb-20">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView({ type: "products", data: "الرجوع" })} className="p-2 bg-gray-100 rounded-full">
            <ArrowRight size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">متجر الطلب السريع</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h4 className="font-bold text-lg text-gray-800">{prod.name}</h4>
            <div className="flex flex-col items-center">
              {user?.is_vip && <p className="text-gray-400 line-through text-sm">{prod.price.toFixed(2)} $</p>}
              <p className="text-emerald-600 font-bold text-xl">{finalPrice.toFixed(2)} $</p>
              {user?.is_vip && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold mt-1">خصم VIP 5%</span>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">ضع المعرف (ID)</label>
              <input 
                type="text" 
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="أدخل المعرف هنا..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-center text-lg font-bold outline-none focus:border-emerald-500"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <p className="text-xs text-gray-500 mb-1">السعر الإجمالي</p>
              <p className="text-xl font-bold text-gray-800">{finalPrice.toFixed(2)} $</p>
            </div>

            {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

            <button 
              disabled={loading}
              onClick={handleQuickOrder}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {loading ? "جاري الإرسال..." : "إرسال الطلب"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CheckoutView = () => {
    const prod = view.data;
    const [extraData, setExtraData] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const finalPrice = user?.is_vip ? prod.price * 0.95 : prod.price;

    const handlePurchase = async () => {
      if (!user) return;
      if (prod.requires_input && !extraData) return setError("يرجى إدخال البيانات المطلوبة");
      
      setLoading(true);
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            productId: prod.id,
            quantity: 1,
            extraData: { input: extraData }
          })
        });
        const data = await res.json();
        if (data.success) {
          fetchUser(user.id);
          setView({ type: "success", data: "تمت عملية الشراء بنجاح!" });
        } else {
          setError(data.error || "حدث خطأ ما");
        }
      } catch (e) {
        setError("فشل الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="px-4 space-y-6 pb-20">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView({ type: "products", data: "الرجوع" })} className="p-2 bg-gray-100 rounded-full">
            <ArrowRight size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">تأكيد الطلب</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
            <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden">
              <img src={prod.image_url || "https://picsum.photos/seed/prod/100/100"} alt={prod.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">{prod.name}</h4>
              <div className="flex items-center gap-2">
                {user?.is_vip && <p className="text-gray-400 line-through text-xs">{prod.price.toFixed(2)} $</p>}
                <p className="text-emerald-600 font-bold">{finalPrice.toFixed(2)} $</p>
                {user?.is_vip && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold">VIP</span>}
              </div>
            </div>
          </div>

          {prod.requires_input && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">معرف اللاعب / رقم الحساب</label>
              <input 
                type="text" 
                value={extraData}
                onChange={(e) => setExtraData(e.target.value)}
                placeholder="أدخل البيانات هنا..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          )}

          <div className="space-y-3 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">سعر المنتج</span>
              <span className="font-bold">{prod.price.toFixed(2)} $</span>
            </div>
            {user?.is_vip && (
              <div className="flex justify-between text-sm text-purple-600">
                <span>خصم VIP (5%)</span>
                <span className="font-bold">- {(prod.price * 0.05).toFixed(2)} $</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الضريبة</span>
              <span className="font-bold">0.00 $</span>
            </div>
            <div className="flex justify-between text-lg border-t border-gray-50 pt-3">
              <span className="font-bold text-gray-800">الإجمالي</span>
              <span className="font-bold text-emerald-600">{finalPrice.toFixed(2)} $</span>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button 
            disabled={loading}
            onClick={handlePurchase}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "جاري المعالجة..." : "تأكيد الدفع بالرصيد"}
          </button>
        </div>
      </div>
    );
  };

  const WalletView = () => {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const formData = new FormData();
      formData.append("image", file);

      try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=5d069b43efb47ed02b0a00a4069f53f9`, {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          setReceiptUrl(data.data.url);
        } else {
          alert("فشل رفع الصورة");
        }
      } catch (err) {
        alert("خطأ في الاتصال بخادم الصور");
      } finally {
        setUploading(false);
      }
    };

    const handleTopUp = async () => {
      if (!user || !selectedMethod || !amount || !receiptUrl) {
        alert("يرجى إكمال جميع البيانات ورفع الإيصال");
        return;
      }
      
      const numAmount = parseFloat(amount);
      if (numAmount < selectedMethod.min_amount) {
        alert(`أقل مبلغ للشحن عبر هذه الطريقة هو ${selectedMethod.min_amount} $`);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/transactions/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            paymentMethodId: selectedMethod.id,
            amount: numAmount,
            note,
            receiptImageUrl: receiptUrl
          })
        });
        const data = await res.json();
        if (data.success) {
          setView({ type: "success", data: "تم إرسال طلب الشحن بنجاح، يرجى انتظار التحقق." });
          fetchTransactions();
        } else {
          alert(data.error || "فشل إرسال الطلب");
        }
      } catch (e) {
        alert("فشل الاتصال بالخادم، يرجى المحاولة لاحقاً");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (selectedMethod) {
      return (
        <div className="px-4 space-y-6 pb-20">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setSelectedMethod(null)} className="p-2 bg-gray-100 rounded-full">
              <ArrowRight size={20} className="text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">شحن عبر {selectedMethod.name}</h2>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
              <p className="text-emerald-800 text-sm mb-1">رقم المحفظة / العنوان</p>
              <p className="text-2xl font-bold text-emerald-600 tracking-wider">{selectedMethod.wallet_address}</p>
              {selectedMethod.min_amount > 0 && (
                <p className="text-xs text-emerald-600 mt-2 font-bold">أقل مبلغ: {selectedMethod.min_amount} $</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">المبلغ المراد شحنه</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">ملاحظات إضافية</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="اختياري..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 h-24 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">إرفاق صورة الإيصال</label>
                <label className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden">
                  {receiptUrl ? (
                    <img src={receiptUrl} className="w-full h-full object-cover" alt="Receipt" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      <ImageIcon size={32} />
                      <span className="text-xs">{uploading ? "جاري الرفع..." : "اضغط لرفع الصورة"}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>

              <button 
                disabled={loading || uploading || !receiptUrl}
                onClick={handleTopUp}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {loading ? "جاري الإرسال..." : "إرسال طلب التحقق"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 space-y-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">شحن الرصيد</h2>
        
        <div className="grid grid-cols-3 gap-3">
          {paymentMethods.map(method => (
            <button 
              key={method.id}
              onClick={() => setSelectedMethod(method)}
              className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 hover:border-emerald-200 transition-colors"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                <img src={method.image_url || "https://picsum.photos/seed/pay/100/100"} alt={method.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <span className="font-bold text-gray-800 text-[10px] text-center">{method.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const PaymentsView = () => (
    <div className="px-4 space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setView({ type: "main" })} className="p-2 bg-gray-100 rounded-full">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">دفعاتي</h2>
      </div>

      <div className="space-y-3">
        {transactions.map(t => (
          <div key={t.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                t.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                t.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
              }`}>
                {t.status === 'approved' ? <CheckCircle size={20} /> : 
                 t.status === 'rejected' ? <XCircle size={20} /> : <Clock size={20} />}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">{t.method_name}</p>
                <p className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleDateString("ar-EG")}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="font-bold text-emerald-600">+{t.amount} $</p>
              <p className={`text-[10px] font-medium ${
                t.status === 'approved' ? 'text-emerald-500' : 
                t.status === 'rejected' ? 'text-red-500' : 'text-orange-500'
              }`}>
                {t.status === 'approved' ? 'مكتمل' : t.status === 'rejected' ? 'مرفوض' : 'قيد التحقق'}
              </p>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <History size={40} />
            </div>
            <p className="text-gray-400">لا توجد عمليات دفع سابقة</p>
          </div>
        )}
      </div>
    </div>
  );

  const OrdersView = () => (
    <div className="px-4 space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">طلباتي</h2>
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-gray-800">{order.product_name}</h4>
                <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString("ar-EG")}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                order.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {order.status === 'new' ? 'جديد' : order.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
              <span className="text-sm text-gray-500">الإجمالي: <span className="font-bold text-gray-800">{order.total_amount} $</span></span>
              <button className="text-emerald-600 text-xs font-bold">تفاصيل الطلب</button>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <ShoppingBag size={40} />
            </div>
            <p className="text-gray-400">لم تقم بأي طلبات بعد</p>
            <button onClick={() => setActiveTab("home")} className="text-emerald-600 font-bold">ابدأ التسوق الآن</button>
          </div>
        )}
      </div>
    </div>
  );

  const ProfileView = () => (
    <div className="px-4 space-y-6 pb-20">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border-4 border-white shadow-lg shadow-emerald-50">
          <User size={48} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{user?.name || "زائر"}</h2>
          <p className="text-gray-400 text-sm">{user?.email || "قم بتسجيل الدخول للوصول لكافة الميزات"}</p>
        </div>
        
        {user && (
          <div className="w-full grid grid-cols-2 gap-4 pt-4">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">الرصيد الحالي</p>
              <p className="text-lg font-bold text-emerald-700">{user.balance.toFixed(2)} $</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">إجمالي الطلبات</p>
              <p className="text-lg font-bold text-blue-700">{orders.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">الحالة</p>
              <p className="text-lg font-bold text-gray-700">{user.is_vip ? 'VIP 💎' : 'عادي'}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
              <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-1">الرقم الشخصي</p>
              <p className="text-lg font-bold text-purple-700">{user.personal_number}</p>
            </div>
          </div>
        )}

        <div className="w-full space-y-3 pt-4">
          <button 
            onClick={() => setView({ type: "payments" })}
            className="w-full bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <History size={20} />
              </div>
              <span className="font-bold text-gray-800">دفعاتي</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>

          <button 
            onClick={() => setActiveTab("orders")}
            className="w-full bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
              <span className="font-bold text-gray-800">طلباتي</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
        <ProfileItem icon={<User size={20} />} label="تعديل الملف الشخصي" onClick={() => setView({ type: "edit_profile" })} />
        <ProfileItem icon={<Plus size={20} />} label="نظام الإحالة" onClick={() => setView({ type: "referral" })} />
        <ProfileItem icon={<Settings size={20} />} label="الإعدادات" onClick={() => setView({ type: "settings" })} />
        <ProfileItem icon={<Clock size={20} />} label="سياسة الخصوصية" onClick={() => setView({ type: "privacy_policy" })} />
        <ProfileItem 
          icon={<Settings size={20} />} 
          label="لوحة التحكم" 
          onClick={() => {
            const pass = prompt("أدخل كلمة مرور المسؤول:");
            if (pass === "12321") {
              setIsAdmin(true);
              setAdminAuth(true);
            } else {
              alert("كلمة مرور خاطئة");
            }
          }} 
        />
        {user ? (
          <ProfileItem icon={<LogOut size={20} />} label="تسجيل الخروج" onClick={handleLogout} className="text-red-500" />
        ) : (
          <ProfileItem icon={<ArrowRight size={20} />} label="تسجيل الدخول" onClick={() => setView({ type: "login" })} />
        )}
      </div>
    </div>
  );

  const ProfileItem = ({ icon, label, onClick, className = "" }: any) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${className}`}>
      <div className="flex items-center gap-4">
        <span className="text-gray-400">{icon}</span>
        <span className="font-medium text-gray-700">{label}</span>
      </div>
      <ChevronRight size={18} className="text-gray-300" />
    </button>
  );

  const LoginView = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [referralCode, setReferralCode] = useState(localStorage.getItem("referralCode") || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAuth = async () => {
      setLoading(true);
      setError("");
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister ? { name, email, password, phone, referralCode } : { email, password };
      
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data);
          localStorage.setItem("user", JSON.stringify(data));
          localStorage.removeItem("referralCode");
          setView({ type: "main" });
          setActiveTab("home");
        } else {
          setError(data.error || "حدث خطأ ما");
        }
      } catch (e) {
        setError("فشل الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="px-6 flex flex-col items-center justify-center min-h-[80vh] pb-20">
        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-100 mb-8">
          <ShoppingBag size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{isRegister ? "إنشاء حساب جديد" : "تسجيل الدخول"}</h2>
        <p className="text-gray-400 text-sm mb-8 text-center">أهلاً بك في متجرنا، يرجى إدخال بياناتك للمتابعة</p>
        
        <div className="w-full space-y-4">
          {isRegister && (
            <input 
              type="text" 
              placeholder="الاسم الكامل" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 shadow-sm"
            />
          )}
          <input 
            type="email" 
            placeholder="البريد الإلكتروني" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 shadow-sm"
          />
          {isRegister && (
            <input 
              type="tel" 
              placeholder="رقم الهاتف" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 shadow-sm"
            />
          )}
          <input 
            type="password" 
            placeholder="كلمة المرور" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 shadow-sm"
          />
          {isRegister && (
            <input 
              type="text" 
              placeholder="كود الإحالة (اختياري)" 
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 shadow-sm"
            />
          )}
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          
          <button 
            disabled={loading}
            onClick={handleAuth}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            {loading ? "جاري المعالجة..." : (isRegister ? "إنشاء الحساب" : "دخول")}
          </button>
          
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-emerald-600 text-sm font-bold pt-4"
          >
            {isRegister ? "لديك حساب بالفعل؟ سجل دخولك" : "ليس لديك حساب؟ أنشئ حساباً جديداً"}
          </button>
        </div>
      </div>
    );
  };

  const EditProfileView = () => {
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleUpdate = async () => {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/user/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, name, email, phone, password })
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data);
          localStorage.setItem("user", JSON.stringify(data));
          setView({ type: "success", data: "تم تحديث المعلومات بنجاح" });
        } else {
          setError(data.error || "فشل التحديث");
        }
      } catch (e) {
        setError("خطأ في الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="px-4 space-y-6 pb-20">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView({ type: "main" })} className="p-2 bg-gray-100 rounded-full">
            <ArrowRight size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">تعديل المعلومات الشخصية</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">الاسم الكامل</label>
            <input 
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">البريد الإلكتروني</label>
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">رقم الهاتف</label>
            <input 
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">كلمة المرور الجديدة (اختياري)</label>
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="اتركها فارغة إذا لم ترد التغيير"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button 
            disabled={loading}
            onClick={handleUpdate}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>

          <div className="pt-4 border-t border-gray-50">
            <p className="text-[10px] text-gray-400 mb-2">احتفظ ببيانات دخولك في مكان آمن للعودة لحسابك في أي وقت.</p>
            <button 
              onClick={() => {
                const text = `بيانات دخول متجرنا:\nالاسم: ${user?.name}\nالبريد: ${user?.email}\nالرقم الشخصي (ID): ${user?.personal_number}\nرقم الدخول: ${user?.id}`;
                const blob = new Blob([text], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `my_account_info.txt`;
                a.click();
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm"
            >
              تحميل بيانات الحساب (نسخة احتياطية)
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ReferralView = () => {
    const [stats, setStats] = useState({ count: 0 });
    const referralLink = `${window.location.origin}/?ref=${user?.personal_number}`;

    useEffect(() => {
      if (user) {
        fetch(`/api/referrals/stats/${user.id}`)
          .then(res => res.json())
          .then(data => setStats(data))
          .catch(console.error);
      }
    }, [user]);

    const copyLink = () => {
      navigator.clipboard.writeText(referralLink);
      alert("تم نسخ رابط الإحالة");
    };

    return (
      <div className="px-4 space-y-6 pb-20">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView({ type: "main" })} className="p-2 bg-gray-100 rounded-full">
            <ArrowRight size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">نظام الإحالة</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Plus size={32} />
          </div>
          <h3 className="font-bold text-lg">اربح 5% من كل عملية شراء</h3>
          <p className="text-gray-500 text-sm">شارك رابط الإحالة الخاص بك مع أصدقائك واحصل على عمولة 5% من كل عملية شراء يقومون بها، تضاف مباشرة إلى رصيدك.</p>
          
          <div className="bg-emerald-50 p-4 rounded-xl">
            <p className="text-xs text-emerald-600 font-bold mb-1">عدد المستخدمين المسجلين عبر رابطك</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.count}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-700 text-right">رابط الإحالة الخاص بك</p>
            <div className="flex gap-2">
              <button onClick={copyLink} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm">نسخ</button>
              <input 
                readOnly 
                value={referralLink}
                className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm text-left outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PrivacyPolicyView = () => {
    const [policy, setPolicy] = useState("");

    useEffect(() => {
      fetch("/api/settings")
        .then(res => res.json())
        .then(data => {
          const p = data.find((s: any) => s.key === 'privacy_policy');
          setPolicy(p ? p.value : "سيتم إضافة سياسة الخصوصية قريباً.");
        })
        .catch(console.error);
    }, []);

    return (
      <div className="px-4 space-y-6 pb-20">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView({ type: "main" })} className="p-2 bg-gray-100 rounded-full">
            <ArrowRight size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">سياسة الخصوصية</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
            {policy}
          </div>
        </div>
      </div>
    );
  };

  const SettingsView = () => (
    <div className="px-4 space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setView({ type: "main" })} className="p-2 bg-gray-100 rounded-full">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">الإعدادات</h2>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-gray-400" />
            <span className="font-medium text-gray-700">الإشعارات</span>
          </div>
          <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
            <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon size={20} className="text-gray-400" />
            <span className="font-medium text-gray-700">الوضع الليلي</span>
          </div>
          <div className="w-10 h-5 bg-gray-200 rounded-full relative">
            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const SuccessView = () => (
    <div className="px-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6">
      <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
        <CheckCircle size={64} />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">عملية ناجحة</h2>
        <p className="text-gray-400">{view.data}</p>
      </div>
      <button 
        onClick={() => { setView({ type: "main" }); setActiveTab("home"); }}
        className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold"
      >
        العودة للرئيسية
      </button>
    </div>
  );

  // --- Admin Panel ---
  const AdminPanel = () => {
    const [adminTab, setAdminTab] = useState("orders");
    const [adminOrders, setAdminOrders] = useState<any[]>([]);
    const [adminTransactions, setAdminTransactions] = useState<any[]>([]);
    const [newCategory, setNewCategory] = useState({ name: "", image_url: "", special_id: "" });
    const [newSubcategory, setNewSubcategory] = useState({ category_special_id: "", name: "", image_url: "", special_id: "" });
    const [newProduct, setNewProduct] = useState({ category_special_id: "", subcategory_special_id: "", name: "", price: "", description: "", image_url: "", requires_input: false, store_type: "normal" });
    const [newPaymentMethod, setNewPaymentMethod] = useState({ name: "", image_url: "", wallet_address: "", min_amount: "", instructions: "" });
    const [newBanner, setNewBanner] = useState({ image_url: "" });
    const [manualTopup, setManualTopup] = useState({ personalNumber: "", amount: "" });
    const [settings, setSettings] = useState<any[]>([]);
    const [privacyPolicy, setPrivacyPolicy] = useState("");
    const [supportWhatsapp, setSupportWhatsapp] = useState("");

    const [adminUsers, setAdminUsers] = useState<any[]>([]);
    const [newOffer, setNewOffer] = useState({ title: "", description: "", image_url: "" });

    const handleExportDB = async () => {
      try {
        const res = await fetch("/api/admin/export-db");
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `database_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      } catch (e) {
        alert("فشل تصدير البيانات");
      }
    };

    const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (!confirm("تحذير: سيتم مسح كافة البيانات الحالية واستبدالها بالبيانات المستوردة. هل أنت متأكد؟")) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          const res = await fetch("/api/admin/import-db", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          });
          if (res.ok) {
            alert("تم استيراد البيانات بنجاح! سيتم إعادة تحميل الصفحة.");
            window.location.reload();
          } else {
            const err = await res.json();
            alert(`فشل الاستيراد: ${err.error}`);
          }
        } catch (err) {
          alert("ملف غير صالح");
        }
      };
      reader.readAsText(file);
    };

    const handleClearDB = async () => {
      if (!confirm("هل أنت متأكد من مسح كافة بيانات الموقع؟ لا يمكن التراجع عن هذه الخطوة.")) return;
      const res = await fetch("/api/admin/clear-db", { method: "POST" });
      if (res.ok) {
        alert("تم مسح قاعدة البيانات بنجاح");
        window.location.reload();
      }
    };

    useEffect(() => {
      fetchAdminOrders();
      fetchAdminTransactions();
      fetchAdminUsers();
      fetchAdminSettings();
    }, []);

    const fetchAdminSettings = async () => {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
      const pp = data.find((s: any) => s.key === 'privacy_policy');
      const sw = data.find((s: any) => s.key === 'support_whatsapp');
      if (pp) setPrivacyPolicy(pp.value);
      if (sw) setSupportWhatsapp(sw.value);
    };

    const handleUpdateSetting = async (key: string, value: string) => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        alert("تم تحديث الإعداد بنجاح");
        fetchAdminSettings();
      }
    };

    const handleCloudSync = async () => {
      if (!confirm("هل تريد مزامنة كافة البيانات الحالية مع قاعدة البيانات السحابية (Supabase)؟")) return;
      try {
        const res = await fetch("/api/admin/sync-to-cloud", { method: "POST" });
        if (res.ok) {
          alert("تمت المزامنة السحابية بنجاح!");
        } else {
          const data = await res.json();
          alert(`فشل المزامنة: ${data.error}`);
        }
      } catch (e) {
        alert("خطأ في الاتصال بالسيرفر");
      }
    };

    const fetchAdminUsers = async () => {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setAdminUsers(data);
    };

    const handleToggleVip = async (userId: number, currentStatus: boolean) => {
      const res = await fetch(`/api/admin/users/${userId}/vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVip: !currentStatus })
      });
      if (res.ok) {
        fetchAdminUsers();
        alert("تم تحديث حالة VIP");
      }
    };

    const handleAddOffer = async () => {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOffer)
      });
      if (res.ok) {
        setNewOffer({ title: "", description: "", image_url: "" });
        fetchOffers();
        alert("تمت إضافة العرض");
      }
    };

    const fetchAdminOrders = async () => {
      try {
        const res = await fetch("/api/admin/orders");
        const data = await res.json();
        setAdminOrders(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
    };

    const fetchAdminTransactions = async () => {
      try {
        const res = await fetch("/api/admin/transactions");
        const data = await res.json();
        setAdminTransactions(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
    };

    const handleApproveTransaction = async (id: number) => {
      await fetch(`/api/admin/transactions/${id}/approve`, { method: "POST" });
      fetchAdminTransactions();
    };

    const handleRejectTransaction = async (id: number) => {
      await fetch(`/api/admin/transactions/${id}/reject`, { method: "POST" });
      fetchAdminTransactions();
    };

    const handleAddCategory = async () => {
      await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory)
      });
      setNewCategory({ name: "", image_url: "", special_id: "" });
      fetchCategories();
      alert("تمت إضافة القسم الرئيسي");
    };

    const handleAddSubcategory = async () => {
      const res = await fetch("/api/admin/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubcategory)
      });
      if (res.ok) {
        setNewSubcategory({ category_special_id: "", name: "", image_url: "", special_id: "" });
        alert("تمت إضافة القسم الفرعي");
      } else {
        const data = await res.json();
        alert(data.error || "خطأ في الإضافة");
      }
    };

    const handleAddProduct = async () => {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        setNewProduct({ category_special_id: "", subcategory_special_id: "", name: "", price: "", description: "", image_url: "", requires_input: false, store_type: "normal" });
        alert("تمت إضافة المنتج");
      } else {
        const data = await res.json();
        alert(data.error || "خطأ في الإضافة");
      }
    };

    const handleAddPaymentMethod = async () => {
      const res = await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPaymentMethod)
      });
      if (res.ok) {
        setNewPaymentMethod({ name: "", image_url: "", wallet_address: "", min_amount: "", instructions: "" });
        fetchPaymentMethods();
        alert("تمت إضافة طريقة الدفع");
      } else {
        const data = await res.json();
        alert(data.error || "خطأ في الإضافة");
      }
    };

    const handleAddBanner = async () => {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBanner)
      });
      if (res.ok) {
        setNewBanner({ image_url: "" });
        fetchBanners();
        alert("تمت إضافة الصورة المتحركة");
      } else {
        alert("خطأ في الإضافة");
      }
    };

    const handleDelete = async (type: string, id: number) => {
      if (!confirm("هل أنت متأكد من الحذف؟")) return;
      const res = await fetch(`/api/admin/${type}/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (type === 'categories') fetchCategories();
        if (type === 'payment-methods') fetchPaymentMethods();
        if (type === 'banners') fetchBanners();
        alert("تم الحذف بنجاح");
      }
    };

    const handleManualTopup = async () => {
      const res = await fetch("/api/admin/manual-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualTopup)
      });
      if (res.ok) {
        setManualTopup({ personalNumber: "", amount: "" });
        alert("تم شحن الرصيد بنجاح");
      } else {
        const data = await res.json();
        alert(data.error || "خطأ في الشحن");
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 pb-20 text-right" dir="rtl">
        <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-30">
          <h1 className="font-bold text-lg">لوحة التحكم</h1>
          <button onClick={() => setIsAdmin(false)} className="text-gray-400 p-2"><LogOut size={20} /></button>
        </div>

        <div className="flex bg-white border-b border-gray-100 overflow-x-auto no-scrollbar">
          <button onClick={() => setAdminTab("orders")} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${adminTab === "orders" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-400"}`}>الطلبات</button>
          <button onClick={() => setAdminTab("transactions")} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${adminTab === "transactions" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-400"}`}>شحن الرصيد</button>
          <button onClick={() => setAdminTab("users")} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${adminTab === "users" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-400"}`}>المستخدمين</button>
          <button onClick={() => setAdminTab("management")} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${adminTab === "management" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-400"}`}>الإدارة</button>
        </div>

        <div className="p-4 space-y-6">
          {adminTab === "users" && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-lg">إدارة المستخدمين</h3>
                  <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
                    إجمالي: {adminUsers.length}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminUsers.map(u => (
                    <div key={u.id} className="p-4 border border-gray-50 rounded-2xl bg-gray-50/30 space-y-3 hover:border-emerald-100 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-100">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800">{u.name}</p>
                            <p className="text-[10px] text-gray-400">ID: {u.id} | PN: {u.personal_number}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${u.is_vip ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                          {u.is_vip ? 'VIP 💎' : 'عادي'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 flex items-center gap-2"><span className="w-1 h-1 bg-gray-300 rounded-full"></span> {u.email}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-2"><span className="w-1 h-1 bg-gray-300 rounded-full"></span> {u.phone || "بدون هاتف"}</p>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <p className="font-bold text-emerald-600">{u.balance.toFixed(2)} $</p>
                        <button 
                          onClick={() => handleToggleVip(u.id, u.is_vip)}
                          className={`text-xs px-4 py-1.5 rounded-xl font-bold transition-all ${u.is_vip ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-50'}`}
                        >
                          {u.is_vip ? 'إلغاء VIP' : 'ترقية VIP'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === "orders" && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="font-bold text-gray-800 text-lg">سجل الطلبات</h3>
                <div className="space-y-4">
                  {adminOrders.map(order => (
                    <div key={order.id} className="p-4 border border-gray-50 rounded-2xl bg-gray-50/30 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-gray-800">#{order.id} - {order.product_name}</p>
                          <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleString("ar-EG")}</p>
                        </div>
                        <select 
                          value={order.status} 
                          onChange={async (e) => {
                            await fetch(`/api/admin/orders/${order.id}/status`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: e.target.value })
                            });
                            fetchAdminOrders();
                          }}
                          className={`text-[10px] font-bold border-none rounded-full px-3 py-1 outline-none ${
                            order.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                            order.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          <option value="new">جديد</option>
                          <option value="processing">قيد المعالجة</option>
                          <option value="completed">مكتمل</option>
                          <option value="failed">فشل</option>
                        </select>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-50 space-y-1">
                        <p className="text-xs text-gray-600 font-bold">العميل: {order.user_name}</p>
                        <p className="text-[10px] text-gray-400">البيانات: {order.meta}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-600">{order.total_amount} $</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === "transactions" && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="font-bold text-gray-800 text-lg">طلبات الشحن</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {adminTransactions.map(t => (
                    <div key={t.id} className="p-4 border border-gray-50 rounded-2xl bg-gray-50/30 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-gray-800">{t.user_name}</p>
                          <p className="text-[10px] text-gray-400">{t.method_name} | {new Date(t.created_at).toLocaleString("ar-EG")}</p>
                        </div>
                        <span className="font-bold text-emerald-600 text-lg">{t.amount} $</span>
                      </div>
                      {t.note && <p className="text-[10px] text-gray-500 bg-white p-2 rounded-lg border border-gray-50">ملاحظة: {t.note}</p>}
                      <div className="aspect-video bg-white rounded-xl overflow-hidden border border-gray-100 group relative">
                        <img src={t.receipt_image_url} alt="Receipt" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => window.open(t.receipt_image_url)} className="bg-white text-gray-800 px-4 py-2 rounded-xl text-xs font-bold">عرض الصورة كاملة</button>
                        </div>
                      </div>
                      {t.status === 'pending' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleApproveTransaction(t.id)} className="bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-50">موافقة</button>
                          <button onClick={() => handleRejectTransaction(t.id)} className="bg-red-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-red-50">رفض</button>
                        </div>
                      ) : (
                        <div className={`text-center py-2.5 rounded-xl text-xs font-bold ${t.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {t.status === 'approved' ? 'تمت الموافقة ✓' : 'تم الرفض ✗'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === "management" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              {/* Settings Section */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">إعدادات الموقع</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">رقم واتساب الدعم (بدون +)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" value={supportWhatsapp} onChange={(e) => setSupportWhatsapp(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 outline-none"
                      />
                      <button onClick={() => handleUpdateSetting('support_whatsapp', supportWhatsapp)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">حفظ</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">سياسة الخصوصية</label>
                    <textarea 
                      value={privacyPolicy} onChange={(e) => setPrivacyPolicy(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 outline-none h-32 text-sm"
                    />
                    <button onClick={() => handleUpdateSetting('privacy_policy', privacyPolicy)} className="w-full bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold">حفظ سياسة الخصوصية</button>
                  </div>
                </div>
              </div>

              {/* Banners Section */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">إدارة الصور المتحركة (Banners)</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" placeholder="رابط صورة البانر" value={newBanner.image_url} onChange={(e) => setNewBanner({ image_url: e.target.value })}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 outline-none"
                    />
                    <button onClick={handleAddBanner} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">إضافة</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {banners.map(b => (
                      <div key={b.id} className="relative group">
                        <img src={b.image_url} className="w-full h-24 object-cover rounded-xl border border-gray-100" referrerPolicy="no-referrer" />
                        <button onClick={() => handleDelete('banners', b.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <XCircle size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">شحن رصيد يدوي</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="الرقم الشخصي" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={manualTopup.personalNumber} onChange={e => setManualTopup({...manualTopup, personalNumber: e.target.value})} />
                  <input type="number" placeholder="المبلغ" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={manualTopup.amount} onChange={e => setManualTopup({...manualTopup, amount: e.target.value})} />
                  <button onClick={handleManualTopup} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-50">شحن الرصيد</button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">إضافة عرض جديد</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="عنوان العرض" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newOffer.title} onChange={e => setNewOffer({...newOffer, title: e.target.value})} />
                  <input type="text" placeholder="وصف العرض" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newOffer.description} onChange={e => setNewOffer({...newOffer, description: e.target.value})} />
                  <input type="text" placeholder="رابط الصورة" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newOffer.image_url} onChange={e => setNewOffer({...newOffer, image_url: e.target.value})} />
                  <button onClick={handleAddOffer} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-50">إضافة عرض</button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">إضافة قسم رئيسي</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="اسم القسم" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} />
                  <input type="text" placeholder="رابط الصورة" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newCategory.image_url} onChange={e => setNewCategory({...newCategory, image_url: e.target.value})} />
                  <input type="number" placeholder="رقم القسم الخاص" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newCategory.special_id} onChange={e => setNewCategory({...newCategory, special_id: e.target.value})} />
                  <button onClick={handleAddCategory} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-50">إضافة</button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">إضافة قسم فرعي</h3>
                <div className="space-y-3">
                  <input type="number" placeholder="رقم القسم الرئيسي الخاص" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newSubcategory.category_special_id} onChange={e => setNewSubcategory({...newSubcategory, category_special_id: e.target.value})} />
                  <input type="text" placeholder="اسم القسم الفرعي" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newSubcategory.name} onChange={e => setNewSubcategory({...newSubcategory, name: e.target.value})} />
                  <input type="text" placeholder="رابط الصورة" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newSubcategory.image_url} onChange={e => setNewSubcategory({...newSubcategory, image_url: e.target.value})} />
                  <input type="number" placeholder="رقم القسم الفرعي الخاص" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newSubcategory.special_id} onChange={e => setNewSubcategory({...newSubcategory, special_id: e.target.value})} />
                  <button onClick={handleAddSubcategory} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-50">إضافة</button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">إضافة منتج جديد</h3>
                <div className="space-y-3">
                  <input type="number" placeholder="رقم القسم الرئيسي الخاص" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newProduct.category_special_id} onChange={e => setNewProduct({...newProduct, category_special_id: e.target.value})} />
                  <input type="number" placeholder="رقم القسم الفرعي الخاص" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newProduct.subcategory_special_id} onChange={e => setNewProduct({...newProduct, subcategory_special_id: e.target.value})} />
                  <input type="text" placeholder="اسم المنتج" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  <input type="number" placeholder="السعر" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  <textarea placeholder="الوصف" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                  <input type="text" placeholder="رابط الصورة" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} />
                  <select className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newProduct.store_type} onChange={e => setNewProduct({...newProduct, store_type: e.target.value})}>
                    <option value="normal">متجر عادي</option>
                    <option value="quick_order">متجر الطلب السريع</option>
                  </select>
                  <div className="flex items-center gap-2 px-1">
                    <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded" checked={newProduct.requires_input} onChange={e => setNewProduct({...newProduct, requires_input: e.target.checked})} />
                    <label className="text-xs text-gray-600 font-bold">يتطلب بيانات إضافية (ID)</label>
                  </div>
                  <button onClick={handleAddProduct} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-50">إضافة</button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">إضافة طريقة دفع</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="اسم الطريقة" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newPaymentMethod.name} onChange={e => setNewPaymentMethod({...newPaymentMethod, name: e.target.value})} />
                  <input type="text" placeholder="رابط الصورة" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newPaymentMethod.image_url} onChange={e => setNewPaymentMethod({...newPaymentMethod, image_url: e.target.value})} />
                  <input type="text" placeholder="رقم المحفظة / العنوان" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newPaymentMethod.wallet_address} onChange={e => setNewPaymentMethod({...newPaymentMethod, wallet_address: e.target.value})} />
                  <input type="number" placeholder="أقل مبلغ للدفع" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newPaymentMethod.min_amount} onChange={e => setNewPaymentMethod({...newPaymentMethod, min_amount: e.target.value})} />
                  <textarea placeholder="تعليمات إضافية" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={newPaymentMethod.instructions} onChange={e => setNewPaymentMethod({...newPaymentMethod, instructions: e.target.value})} />
                  <button onClick={handleAddPaymentMethod} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-50">حفظ</button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">المزامنة السحابية (Supabase)</h3>
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">رفع كافة البيانات المحلية إلى Supabase لضمان بقائها حتى لو تم مسح السيرفر.</p>
                  <button 
                    onClick={handleCloudSync} 
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-50"
                  >
                    بدء المزامنة السحابية
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">إدارة قاعدة البيانات</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400">تصدير كافة بيانات الموقع (مستخدمين، طلبات، منتجات) إلى ملف JSON.</p>
                    <button onClick={handleExportDB} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-50">تصدير البيانات (JSON)</button>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400">استيراد البيانات من ملف JSON (سيتم مسح البيانات الحالية).</p>
                    <label className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm text-center cursor-pointer shadow-lg shadow-blue-50">
                      استيراد البيانات (JSON)
                      <input type="file" accept=".json" onChange={handleImportDB} className="hidden" />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400">تحميل ملف قاعدة البيانات الأصلي (.db).</p>
                    <button onClick={() => window.open("/api/admin/backup-db")} className="w-full bg-slate-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-slate-50">تحميل نسخة احتياطية (.db)</button>
                  </div>

                  <div className="pt-4 border-t border-gray-50">
                    <button onClick={handleClearDB} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm border border-red-100">مسح كافة البيانات نهائياً</button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2">إدارة البيانات</h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">العروض</p>
                    <div className="space-y-2">
                      {offers.map(o => (
                        <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-sm font-bold text-gray-700">{o.title}</span>
                          <button onClick={() => handleDelete('offers', o.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><XCircle size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">الأقسام</p>
                    <div className="space-y-2">
                      {categories.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-sm font-bold text-gray-700">{c.name}</span>
                          <button onClick={() => handleDelete('categories', c.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><XCircle size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">طرق الدفع</p>
                    <div className="space-y-2">
                      {paymentMethods.map(pm => (
                        <div key={pm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-sm font-bold text-gray-700">{pm.name}</span>
                          <button onClick={() => handleDelete('payment-methods', pm.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><XCircle size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isAdmin) return <AdminPanel />;

  return (
    <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
      <Header />
      <Drawer />
      <NotificationPanel />
      
      <main className="pt-20 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={view.type + activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "home" && (
              <>
                {view.type === "main" && <HomeView />}
                {view.type === "subcategories" && <SubcategoriesView />}
                {view.type === "products" && <ProductsView />}
                {view.type === "checkout" && <CheckoutView />}
                {view.type === "quick_order" && <QuickOrderView />}
                {view.type === "success" && <SuccessView />}
                {view.type === "login" && <LoginView />}
              </>
            )}
            {activeTab === "wallet" && (user ? <WalletView /> : <LoginView />)}
            {activeTab === "orders" && (user ? <OrdersView /> : <LoginView />)}
            {activeTab === "profile" && (
              <>
                {view.type === "main" && <ProfileView />}
                {view.type === "payments" && <PaymentsView />}
                {view.type === "edit_profile" && <EditProfileView />}
                {view.type === "referral" && <ReferralView />}
                {view.type === "privacy_policy" && <PrivacyPolicyView />}
                {view.type === "settings" && <SettingsView />}
                {view.type === "success" && <SuccessView />}
                {view.type === "login" && <LoginView />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
