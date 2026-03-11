import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Supabase Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  console.log("Supabase integration enabled.");
}

const db = new Database("database.db");
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0,
    role TEXT DEFAULT 'user',
    personal_number TEXT UNIQUE, -- 7 digit random
    is_vip BOOLEAN DEFAULT 0,
    is_banned BOOLEAN DEFAULT 0,
    telegram_chat_id INTEGER UNIQUE,
    referred_by_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- NULL for all users
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, warning, success
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT,
    special_id INTEGER, -- رقم القسم الخاص
    order_index INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    image_url TEXT,
    special_id INTEGER, -- رقم القسم الفرعي الخاص
    parent_subcategory_id INTEGER,
    order_index INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subcategory_id INTEGER,
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    requires_input BOOLEAN DEFAULT 0,
    store_type TEXT DEFAULT 'normal', -- نوع المتجر
    available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT,
    wallet_address TEXT,
    instructions TEXT,
    min_amount DECIMAL(10, 2) DEFAULT 0,
    active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    payment_method_id INTEGER,
    amount DECIMAL(10, 2) NOT NULL,
    receipt_image_url TEXT,
    note TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'new',
    meta TEXT, -- JSON string for game_id, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    extra_data TEXT, -- JSON string
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('privacy_policy', 'سياسة الخصوصية الخاصة بنا...');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('support_whatsapp', '+963982559890');
`);

// --- Migrations for existing databases ---
const migrate = (table: string, column: string, type: string) => {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  if (!info.find(col => col.name === column)) {
    console.log(`Migrating: Adding ${column} to ${table}`);
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
};

migrate("users", "personal_number", "TEXT");
migrate("users", "telegram_chat_id", "INTEGER");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_personal_number ON users(personal_number)");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id)");
migrate("categories", "special_id", "INTEGER");
migrate("categories", "active", "BOOLEAN DEFAULT 1");
migrate("subcategories", "special_id", "INTEGER");
migrate("subcategories", "active", "BOOLEAN DEFAULT 1");
migrate("products", "store_type", "TEXT DEFAULT 'normal'");
migrate("payment_methods", "min_amount", "DECIMAL(10, 2) DEFAULT 0");
migrate("users", "referred_by_id", "INTEGER");
migrate("users", "phone", "TEXT");
migrate("users", "is_banned", "BOOLEAN DEFAULT 0");

// Backfill personal_number for existing users
const usersWithoutPN = db.prepare("SELECT id FROM users WHERE personal_number IS NULL").all() as any[];
for (const user of usersWithoutPN) {
  let personalNumber = "";
  while (true) {
    personalNumber = Math.floor(1000000 + Math.random() * 9000000).toString();
    const existing = db.prepare("SELECT id FROM users WHERE personal_number = ?").get(personalNumber);
    if (!existing) break;
  }
  db.prepare("UPDATE users SET personal_number = ? WHERE id = ?").run(personalNumber, user.id);
}
// -----------------------------------------

// Seed initial data if empty
const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (categoryCount.count === 0) {
  // Initial seed if needed
}

// User request: Delete specific categories
db.prepare("DELETE FROM categories WHERE name IN ('ألعاب', 'تطبيقات')").run();

const userStates = new Map<number, { step: string; data: any }>();
let adminBot: any = null;
let userBot: any = null;

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Helper for Telegram
  const sendTelegramMessage = async (text: string) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    } catch (e) {
      console.error("Telegram error", e);
    }
  };

  // Admin Bot Logic
  const adminBotToken = process.env.TELEGRAM_BOT_TOKEN;
  if (adminBotToken) {
    // Add a small delay to avoid 409 conflict during rapid restarts
    setTimeout(() => {
      adminBot = new TelegramBot(adminBotToken, { polling: true });
      const adminChatId = process.env.TELEGRAM_CHAT_ID;

      adminBot.on("polling_error", (error: any) => {
        if (error.message.includes("409 Conflict")) {
          console.log("Admin Telegram bot conflict: Another instance is running.");
        } else {
          console.error("Admin Telegram polling error:", error);
        }
      });

      adminBot.on("message", async (msg: any) => {
      const chatId = msg.chat.id.toString();
      if (chatId !== adminChatId) return;

      const text = msg.text || "";

      if (text === "مستخدمين") {
        const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 20").all() as any[];
        let response = "👥 قائمة آخر 20 مستخدم:\n\n";
        users.forEach(u => {
          response += `ID: ${u.id} | PN: ${u.personal_number}\nالاسم: ${u.name}\nالرصيد: ${u.balance}$\nVIP: ${u.is_vip ? 'نعم' : 'لا'}\n\n`;
        });
        adminBot.sendMessage(chatId, response, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "منح VIP (أدخل ID)", callback_data: "admin_grant_vip" }]
            ]
          }
        });
      } else if (text === "إضافة قسم") {
        userStates.set(parseInt(chatId), { step: "admin_add_cat_name", data: {} });
        adminBot.sendMessage(chatId, "يرجى إدخال اسم القسم الجديد:");
      } else if (text === "إضافة منتج") {
        userStates.set(parseInt(chatId), { step: "admin_add_prod_subid", data: {} });
        adminBot.sendMessage(chatId, "يرجى إدخال ID القسم الفرعي:");
      } else if (text === "إضافة قسم فرعي") {
        userStates.set(parseInt(chatId), { step: "admin_add_sub_catid", data: {} });
        adminBot.sendMessage(chatId, "يرجى إدخال ID القسم الرئيسي:");
      } else if (text === "إضافة بانر") {
        userStates.set(parseInt(chatId), { step: "admin_add_banner_url", data: {} });
        adminBot.sendMessage(chatId, "يرجى إدخال رابط صورة البانر:");
      } else if (text.startsWith("/nall ")) {
        const message = text.replace("/nall ", "");
        db.prepare("INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)").run("إعلان جديد", message, "info");
        const users = db.prepare("SELECT telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL").all() as any[];
        users.forEach(u => {
          userBot?.sendMessage(u.telegram_chat_id, `🔔 إعلان جديد:\n\n${message}`);
        });
        adminBot.sendMessage(chatId, "✅ تم إرسال الإشعار للجميع.");
      } else if (text.startsWith("/nhe ")) {
        const parts = text.split(" ");
        if (parts.length < 3) return adminBot.sendMessage(chatId, "❌ الصيغة: /nhe <رقم_شخصي> <الرسالة>");
        const pn = parts[1];
        const message = parts.slice(2).join(" ");
        const user = db.prepare("SELECT id, telegram_chat_id FROM users WHERE personal_number = ?").get(pn) as any;
        if (!user) return adminBot.sendMessage(chatId, "❌ المستخدم غير موجود.");
        db.prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)").run(user.id, "تنبيه خاص", message, "warning");
        if (user.telegram_chat_id) {
          userBot?.sendMessage(user.telegram_chat_id, `🔔 تنبيه خاص:\n\n${message}`);
        }
        adminBot.sendMessage(chatId, "✅ تم إرسال الإشعار للمستخدم.");
      } else if (text.startsWith("/deli ")) {
        const pn = text.replace("/deli ", "").trim();
        const user = db.prepare("SELECT id FROM users WHERE personal_number = ?").get(pn) as any;
        if (!user) return adminBot.sendMessage(chatId, "❌ المستخدم غير موجود.");
        
        db.transaction(() => {
          db.prepare("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)").run(user.id);
          db.prepare("DELETE FROM orders WHERE user_id = ?").run(user.id);
          db.prepare("DELETE FROM transactions WHERE user_id = ?").run(user.id);
          db.prepare("DELETE FROM notifications WHERE user_id = ?").run(user.id);
          db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
        })();
        
        adminBot.sendMessage(chatId, `✅ تم حذف المستخدم ${pn} وكافة بياناته نهائياً.`);
      } else if (text === "طلبات") {
        const orders = db.prepare(`
          SELECT o.id, u.name, o.total_amount, o.status, o.created_at 
          FROM orders o JOIN users u ON o.user_id = u.id 
          ORDER BY o.created_at DESC LIMIT 10
        `).all() as any[];
        let response = "📦 آخر 10 طلبات:\n\n";
        orders.forEach(o => {
          response += `ID: ${o.id} | ${o.name}\nالمبلغ: ${o.total_amount}$ | الحالة: ${o.status}\n\n`;
        });
        adminBot.sendMessage(chatId, response);
      } else if (text === "دفعات") {
        const txs = db.prepare(`
          SELECT t.id, u.name, t.amount, t.status, t.created_at 
          FROM transactions t JOIN users u ON t.user_id = u.id 
          ORDER BY t.created_at DESC LIMIT 10
        `).all() as any[];
        let response = "💳 آخر 10 عمليات شحن:\n\n";
        txs.forEach(t => {
          response += `ID: ${t.id} | ${t.name}\nالمبلغ: ${t.amount}$ | الحالة: ${t.status}\n\n`;
        });
        adminBot.sendMessage(chatId, response);
      }
    });

    adminBot.on("callback_query", (query: any) => {
      const chatId = query.message?.chat.id;
      if (!chatId) return;
      if (query.data === "admin_grant_vip") {
        adminBot.sendMessage(chatId, "يرجى إرسال ID المستخدم لمنحه VIP (مثال: vip 5):");
      }
    });

    adminBot.on("message", (msg: any) => {
      const text = msg.text || "";
      if (text.startsWith("vip ")) {
        const userId = text.replace("vip ", "").trim();
        db.prepare("UPDATE users SET is_vip = 1 WHERE id = ?").run(userId);
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
        syncToCloud("users", user);
        adminBot.sendMessage(msg.chat.id, `✅ تم منح VIP للمستخدم ${user?.name}`);
      }
    });
    }, 1000);
  }

  // --- Real-time Cloud Sync Helper ---
  const syncToCloud = async (table: string, data: any) => {
    if (!supabase) return;
    try {
      const rows = Array.isArray(data) ? data : [data];
      const { error } = await supabase.from(table).upsert(rows);
      if (error) console.error(`Cloud Sync Error (${table}):`, error.message);
    } catch (e) {
      console.error(`Cloud Sync Exception (${table}):`, e);
    }
  };

  const deleteFromCloud = async (table: string, id: any) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) console.error(`Cloud Delete Error (${table}):`, error.message);
    } catch (e) {
      console.error(`Cloud Delete Exception (${table}):`, e);
    }
  };

  app.get("/api/notifications/:userId", (req, res) => {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE (user_id = ? OR user_id IS NULL) 
      ORDER BY created_at DESC
    `).all(req.params.userId);
    res.json(notifications);
  });

  app.post("/api/notifications/mark-read", (req, res) => {
    const { notificationId } = req.body;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(notificationId);
    res.json({ success: true });
  });

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, phone, referralCode } = req.body;
    try {
      // Generate unique 7-digit personal number
      let personalNumber = "";
      while (true) {
        personalNumber = Math.floor(1000000 + Math.random() * 9000000).toString();
        const existing = db.prepare("SELECT id FROM users WHERE personal_number = ?").get(personalNumber);
        if (!existing) break;
      }

      let referredById = null;
      if (referralCode) {
        const referrer = db.prepare("SELECT id FROM users WHERE personal_number = ?").get(referralCode) as any;
        if (referrer) referredById = referrer.id;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const result = db.prepare("INSERT INTO users (name, email, password_hash, phone, personal_number, referred_by_id) VALUES (?, ?, ?, ?, ?, ?)").run(
        name, email, hashedPassword, phone, personalNumber, referredById
      );
      
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
      
      // Auto Sync to Cloud
      syncToCloud("users", user);

      sendTelegramMessage(`👤 مستخدم جديد\nالاسم: ${name}\nالإيميل: ${email}\nالهاتف: ${phone}\nرقم الدخول: ${user.id}\nالرقم الشخصي: ${personalNumber}${referralCode ? `\nتمت الإحالة بواسطة: ${referralCode}` : ''}`);
      res.json(user);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT id, name, email, password_hash, balance, role, personal_number, phone, is_banned, is_vip, telegram_chat_id FROM users WHERE email = ?").get(email) as any;
    
    if (user) {
      if (user.is_banned) {
        return res.status(403).json({ error: "Your account has been banned." });
      }
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        const { password_hash, ...userWithoutPass } = user;
        sendTelegramMessage(`🔑 تسجيل دخول\nالاسم: ${user.name}\nالإيميل: ${user.email}\nالهاتف: ${user.phone}\nرقم الدخول: ${user.id}\nالرقم الشخصي: ${user.personal_number}`);
        res.json(userWithoutPass);
        return;
      }
    }
    res.status(401).json({ error: "Invalid credentials" });
  });

  // Data Routes
  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories WHERE active = 1 ORDER BY order_index ASC").all();
    res.json(categories);
  });

  app.get("/api/categories/:id/subcategories", (req, res) => {
    const subcategories = db.prepare("SELECT * FROM subcategories WHERE category_id = ? AND active = 1 ORDER BY order_index ASC").all(req.params.id);
    res.json(subcategories);
  });

  app.get("/api/subcategories/:id/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products WHERE subcategory_id = ? AND available = 1").all(req.params.id);
    res.json(products);
  });

  app.get("/api/payment-methods", (req, res) => {
    const methods = db.prepare("SELECT * FROM payment_methods WHERE active = 1").all();
    res.json(methods);
  });

  app.get("/api/banners", (req, res) => {
    const banners = db.prepare("SELECT * FROM banners ORDER BY order_index ASC").all();
    res.json(banners);
  });

  app.get("/api/offers", (req, res) => {
    const offers = db.prepare("SELECT * FROM offers WHERE active = 1 ORDER BY created_at DESC").all();
    res.json(offers);
  });

  // User Routes (Protected in a real app, simplified here)
  app.get("/api/user/:id", (req, res) => {
    const user = db.prepare("SELECT id, name, email, balance, role, phone, personal_number, is_vip FROM users WHERE id = ?").get(req.params.id);
    res.json(user || null);
  });

  app.post("/api/user/update", async (req, res) => {
    const { id, name, email, phone, password } = req.body;
    try {
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        db.prepare("UPDATE users SET name = ?, email = ?, phone = ?, password_hash = ? WHERE id = ?").run(name, email, phone, hashedPassword, id);
      } else {
        db.prepare("UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?").run(name, email, phone, id);
      }
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      
      // Auto Sync to Cloud
      syncToCloud("users", user);

      res.json(user);
    } catch (e) {
      res.status(400).json({ error: "Update failed" });
    }
  });

  app.post("/api/user/unlink-telegram", (req, res) => {
    const { userId } = req.body;
    try {
      db.prepare("UPDATE users SET telegram_chat_id = NULL WHERE id = ?").run(userId);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      syncToCloud("users", user);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Unlink failed" });
    }
  });

  app.get("/api/referrals/stats/:userId", (req, res) => {
    const count = db.prepare("SELECT COUNT(*) as count FROM users WHERE referred_by_id = ?").get(req.params.userId) as { count: number };
    res.json({ count: count.count });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    res.json(settings);
  });

  app.post("/api/admin/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    
    // Auto Sync to Cloud
    syncToCloud("settings", { key, value });

    res.json({ success: true });
  });

  app.post("/api/orders", (req, res) => {
    const { userId, productId, quantity, extraData } = req.body;
    const user = db.prepare("SELECT id, balance, name, email, phone, personal_number, is_vip FROM users WHERE id = ?").get(userId) as any;
    const product = db.prepare("SELECT price, name FROM products WHERE id = ?").get(productId) as any;

    if (!user || !product) return res.status(404).json({ error: "Not found" });

    let total = product.price * quantity;
    if (user.is_vip) {
      total = total * 0.95; // 5% discount
    }

    if (user.balance < total) return res.status(400).json({ error: "Insufficient balance" });

    const transaction = db.transaction(() => {
      db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(total, userId);
      const orderResult = db.prepare("INSERT INTO orders (user_id, total_amount, meta) VALUES (?, ?, ?)").run(userId, total, JSON.stringify(extraData));
      db.prepare("INSERT INTO order_items (order_id, product_id, price_at_purchase, quantity, extra_data) VALUES (?, ?, ?, ?, ?)").run(
        orderResult.lastInsertRowid, productId, product.price, quantity, JSON.stringify(extraData)
      );

      // Referral Commission (5%)
      const currentUser = db.prepare("SELECT referred_by_id FROM users WHERE id = ?").get(userId) as any;
      if (currentUser && currentUser.referred_by_id) {
        const commission = total * 0.05;
        db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(commission, currentUser.referred_by_id);
        sendTelegramMessage(`🎁 عمولة إحالة!\nالمبلغ: ${commission.toFixed(2)} $\nتمت الإضافة للمستخدم ID: ${currentUser.referred_by_id}`);
      }

      return orderResult.lastInsertRowid;
    });

      const orderId = transaction();
      
      // Auto Sync to Cloud
      const newOrder = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
      const newOrderItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId);
      const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      
      syncToCloud("orders", newOrder);
      syncToCloud("order_items", newOrderItems);
      syncToCloud("users", updatedUser);

      sendTelegramMessage(`🔔 طلب جديد\nID: ${orderId}\nالاسم: ${user.name}\nالإيميل: ${user.email}\nالهاتف: ${user.phone}\nرقم الدخول: ${user.id}\nالرقم الشخصي: ${user.personal_number}\nProduct: ${product.name}\nTotal: ${total}\nData: ${JSON.stringify(extraData)}`);
    res.json({ success: true, orderId });
  });

  app.get("/api/orders/user/:userId", (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, p.name as product_name 
      FROM orders o 
      JOIN order_items oi ON o.id = oi.order_id 
      JOIN products p ON oi.product_id = p.id 
      WHERE o.user_id = ? 
      ORDER BY o.created_at DESC
    `).all(req.params.userId);
    res.json(orders);
  });

  app.post("/api/transactions/upload", (req, res) => {
    const { userId, paymentMethodId, amount, note, receiptImageUrl } = req.body;
    const user = db.prepare("SELECT id, name, email, phone, personal_number FROM users WHERE id = ?").get(userId) as any;
    const method = db.prepare("SELECT name FROM payment_methods WHERE id = ?").get(paymentMethodId) as any;

    const result = db.prepare("INSERT INTO transactions (user_id, payment_method_id, amount, note, receipt_image_url) VALUES (?, ?, ?, ?, ?)").run(
      userId, paymentMethodId, amount, note, receiptImageUrl
    );

    // Auto Sync to Cloud
    const newTransaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(result.lastInsertRowid);
    syncToCloud("transactions", newTransaction);

    sendTelegramMessage(`💳 شحن رصيد جديد\nالاسم: ${user?.name}\nالإيميل: ${user?.email}\nالهاتف: ${user?.phone}\nرقم الدخول: ${user?.id}\nالرقم الشخصي: ${user?.personal_number}\nAmount: ${amount}\nMethod: ${method?.name}\nNote: ${note}\nReceipt: ${receiptImageUrl}`);
    res.json({ success: true, transactionId: result.lastInsertRowid });
  });

  app.get("/api/transactions/user/:userId", (req, res) => {
    const transactions = db.prepare("SELECT t.*, pm.name as method_name FROM transactions t JOIN payment_methods pm ON t.payment_method_id = pm.id WHERE t.user_id = ? ORDER BY t.created_at DESC").all(req.params.userId);
    res.json(transactions);
  });

  // Admin Routes
  app.get("/api/admin/orders", (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, u.name as user_name, u.email as user_email, p.name as product_name 
      FROM orders o 
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id 
      JOIN products p ON oi.product_id = p.id 
      ORDER BY o.created_at DESC
    `).all();
    res.json(orders);
  });

  app.post("/api/admin/orders/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/transactions", (req, res) => {
    const transactions = db.prepare(`
      SELECT t.*, u.name as user_name, pm.name as method_name 
      FROM transactions t 
      JOIN users u ON t.user_id = u.id 
      JOIN payment_methods pm ON t.payment_method_id = pm.id 
      ORDER BY t.created_at DESC
    `).all();
    res.json(transactions);
  });

  app.post("/api/admin/transactions/:id/approve", (req, res) => {
    const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id) as any;
    if (transaction && transaction.status === 'pending') {
      db.transaction(() => {
        db.prepare("UPDATE transactions SET status = 'approved' WHERE id = ?").run(req.params.id);
        db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(transaction.amount, transaction.user_id);
      })();
      
      // Auto Sync to Cloud
      const updatedTransaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
      const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(transaction.user_id);
      syncToCloud("transactions", updatedTransaction);
      syncToCloud("users", updatedUser);

      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid transaction" });
    }
  });

  app.post("/api/admin/transactions/:id/reject", (req, res) => {
    db.prepare("UPDATE transactions SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/manual-topup", (req, res) => {
    const { personalNumber, amount } = req.body;
    const user = db.prepare("SELECT id, name FROM users WHERE personal_number = ?").get(personalNumber) as any;
    if (!user) return res.status(404).json({ error: "User not found" });

    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(amount, user.id);
    
    // Auto Sync to Cloud
    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    syncToCloud("users", updatedUser);

    sendTelegramMessage(`💰 شحن يدوي\nالاسم: ${user.name}\nالرقم الشخصي: ${personalNumber}\nالمبلغ: ${amount}`);
    res.json({ success: true });
  });

  // Admin CRUD for Categories/Products
  app.post("/api/admin/categories", (req, res) => {
    const { name, image_url, special_id } = req.body;
    const result = db.prepare("INSERT INTO categories (name, image_url, special_id) VALUES (?, ?, ?)").run(name, image_url, special_id);
    
    // Auto Sync to Cloud
    const newCategory = db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
    syncToCloud("categories", newCategory);

    res.json({ success: true });
  });

  app.post("/api/admin/subcategories", (req, res) => {
    const { category_special_id, name, image_url, special_id } = req.body;
    const category = db.prepare("SELECT id FROM categories WHERE special_id = ?").get(category_special_id) as any;
    if (!category) return res.status(404).json({ error: "Main category not found" });

    const result = db.prepare("INSERT INTO subcategories (category_id, name, image_url, special_id) VALUES (?, ?, ?, ?)").run(
      category.id, name, image_url, special_id
    );

    // Auto Sync to Cloud
    const newSubcategory = db.prepare("SELECT * FROM subcategories WHERE id = ?").get(result.lastInsertRowid);
    syncToCloud("subcategories", newSubcategory);

    res.json({ success: true });
  });

  app.post("/api/admin/products", (req, res) => {
    const { category_special_id, subcategory_special_id, name, price, description, image_url, requires_input, store_type } = req.body;
    
    const subcategory = db.prepare(`
      SELECT s.id FROM subcategories s 
      JOIN categories c ON s.category_id = c.id 
      WHERE c.special_id = ? AND s.special_id = ?
    `).get(category_special_id, subcategory_special_id) as any;

    if (!subcategory) return res.status(404).json({ error: "Subcategory not found" });

    const result = db.prepare("INSERT INTO products (subcategory_id, name, price, description, image_url, requires_input, store_type) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      subcategory.id, name, price, description, image_url, requires_input ? 1 : 0, store_type
    );

    // Auto Sync to Cloud
    const newProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid);
    syncToCloud("products", newProduct);

    res.json({ success: true });
  });

  app.post("/api/admin/payment-methods", (req, res) => {
    const { name, image_url, wallet_address, min_amount, instructions } = req.body;
    const result = db.prepare("INSERT INTO payment_methods (name, image_url, wallet_address, min_amount, instructions) VALUES (?, ?, ?, ?, ?)").run(
      name, image_url, wallet_address, min_amount, instructions || ""
    );

    // Auto Sync to Cloud
    const newMethod = db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(result.lastInsertRowid);
    syncToCloud("payment_methods", newMethod);

    res.json({ success: true });
  });

  app.delete("/api/admin/categories/:id", (req, res) => {
    try {
      const transaction = db.transaction(() => {
        const subcategories = db.prepare("SELECT id FROM subcategories WHERE category_id = ?").all(req.params.id) as any[];
        for (const sub of subcategories) {
          const products = db.prepare("SELECT id FROM products WHERE subcategory_id = ?").all(sub.id) as any[];
          for (const prod of products) {
            const orderCount = db.prepare("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?").get(prod.id) as { count: number };
            if (orderCount.count > 0) {
              db.prepare("UPDATE products SET available = 0 WHERE id = ?").run(prod.id);
            } else {
              db.prepare("DELETE FROM products WHERE id = ?").run(prod.id);
            }
          }
          
          const prodCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE subcategory_id = ?").get(sub.id) as { count: number };
          if (prodCount.count > 0) {
            db.prepare("UPDATE subcategories SET active = 0 WHERE id = ?").run(sub.id);
            syncToCloud("subcategories", db.prepare("SELECT * FROM subcategories WHERE id = ?").get(sub.id));
          } else {
            db.prepare("DELETE FROM subcategories WHERE id = ?").run(sub.id);
            deleteFromCloud("subcategories", sub.id);
          }
        }
        
        const subCount = db.prepare("SELECT COUNT(*) as count FROM subcategories WHERE category_id = ?").get(req.params.id) as { count: number };
        if (subCount.count > 0) {
          db.prepare("UPDATE categories SET active = 0 WHERE id = ?").run(req.params.id);
          syncToCloud("categories", db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id));
        } else {
          db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
          deleteFromCloud("categories", req.params.id);
        }
      });
      transaction();
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  app.delete("/api/admin/subcategories/:id", (req, res) => {
    try {
      const transaction = db.transaction(() => {
        const products = db.prepare("SELECT id FROM products WHERE subcategory_id = ?").all(req.params.id) as any[];
        for (const prod of products) {
          const orderCount = db.prepare("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?").get(prod.id) as { count: number };
          if (orderCount.count > 0) {
            db.prepare("UPDATE products SET available = 0 WHERE id = ?").run(prod.id);
            syncToCloud("products", db.prepare("SELECT * FROM products WHERE id = ?").get(prod.id));
          } else {
            db.prepare("DELETE FROM products WHERE id = ?").run(prod.id);
            deleteFromCloud("products", prod.id);
          }
        }
        
        const prodCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE subcategory_id = ?").get(req.params.id) as { count: number };
        if (prodCount.count > 0) {
          db.prepare("UPDATE subcategories SET active = 0 WHERE id = ?").run(req.params.id);
        } else {
          db.prepare("DELETE FROM subcategories WHERE id = ?").run(req.params.id);
        }
      });
      transaction();
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete subcategory" });
    }
  });

  app.delete("/api/admin/products/:id", (req, res) => {
    // Check if product has orders
    const orderCount = db.prepare("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?").get(req.params.id) as { count: number };
    if (orderCount.count > 0) {
      // If it has orders, just mark as unavailable to preserve history
      db.prepare("UPDATE products SET available = 0 WHERE id = ?").run(req.params.id);
      syncToCloud("products", db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id));
    } else {
      // If no orders, hard delete
      db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
      deleteFromCloud("products", req.params.id);
    }
    res.json({ success: true });
  });

  app.delete("/api/admin/payment-methods/:id", (req, res) => {
    // Check if payment method has transactions
    const transactionCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE payment_method_id = ?").get(req.params.id) as { count: number };
    if (transactionCount.count > 0) {
      // If it has transactions, just mark as inactive
      db.prepare("UPDATE payment_methods SET active = 0 WHERE id = ?").run(req.params.id);
      syncToCloud("payment_methods", db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(req.params.id));
    } else {
      // If no transactions, hard delete
      db.prepare("DELETE FROM payment_methods WHERE id = ?").run(req.params.id);
      deleteFromCloud("payment_methods", req.params.id);
    }
    res.json({ success: true });
  });

  app.post("/api/admin/banners", (req, res) => {
    const { image_url } = req.body;
    const result = db.prepare("INSERT INTO banners (image_url) VALUES (?)").run(image_url);
    
    // Auto Sync to Cloud
    const newBanner = db.prepare("SELECT * FROM banners WHERE id = ?").get(result.lastInsertRowid);
    syncToCloud("banners", newBanner);

    res.json({ success: true });
  });

  app.delete("/api/admin/banners/:id", (req, res) => {
    db.prepare("DELETE FROM banners WHERE id = ?").run(req.params.id);
    deleteFromCloud("banners", req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT id, name, email, phone, balance, role, personal_number, is_vip, created_at FROM users ORDER BY created_at DESC").all();
    res.json(users);
  });

  app.post("/api/admin/users/:id/vip", (req, res) => {
    const { isVip } = req.body;
    db.prepare("UPDATE users SET is_vip = ? WHERE id = ?").run(isVip ? 1 : 0, req.params.id);
    
    // Auto Sync to Cloud
    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    syncToCloud("users", updatedUser);

    res.json({ success: true });
  });

  app.post("/api/admin/offers", (req, res) => {
    const { title, description, image_url } = req.body;
    const result = db.prepare("INSERT INTO offers (title, description, image_url) VALUES (?, ?, ?)").run(title, description, image_url);
    
    // Auto Sync to Cloud
    const newOffer = db.prepare("SELECT * FROM offers WHERE id = ?").get(result.lastInsertRowid);
    syncToCloud("offers", newOffer);

    res.json({ success: true });
  });

  app.delete("/api/admin/offers/:id", (req, res) => {
    db.prepare("DELETE FROM offers WHERE id = ?").run(req.params.id);
    deleteFromCloud("offers", req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/export-db", (req, res) => {
    const tables = ["users", "categories", "subcategories", "products", "orders", "order_items", "transactions", "settings", "banners", "offers"];
    const data: any = {};
    tables.forEach(table => {
      data[table] = db.prepare(`SELECT * FROM ${table}`).all();
    });
    res.json(data);
  });

  app.post("/api/admin/import-db", express.json({ limit: '50mb' }), (req, res) => {
    const data = req.body;
    const tables = ["users", "categories", "subcategories", "products", "orders", "order_items", "transactions", "settings", "banners", "offers"];
    
    try {
      const importTransaction = db.transaction(() => {
        tables.forEach(table => {
          if (data[table]) {
            db.prepare(`DELETE FROM ${table}`).run();
            const rows = data[table];
            if (rows.length > 0) {
              const columns = Object.keys(rows[0]);
              const placeholders = columns.map(() => "?").join(",");
              const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`);
              rows.forEach((row: any) => {
                const values = columns.map(col => row[col]);
                stmt.run(...values);
              });
            }
          }
        });
      });
      importTransaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/clear-db", (req, res) => {
    const tables = ["users", "categories", "subcategories", "products", "orders", "order_items", "transactions", "settings", "banners", "offers"];
    try {
      const clearTransaction = db.transaction(() => {
        tables.forEach(table => {
          db.prepare(`DELETE FROM ${table}`).run();
        });
        // Re-insert default settings if needed
        db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('privacy_policy', 'سياسة الخصوصية الافتراضية');
        db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('support_whatsapp', '9640000000000');
      });
      clearTransaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/sync-to-cloud", async (req, res) => {
    if (!supabase) return res.status(400).json({ error: "Supabase not configured" });

    try {
      const tables = ["users", "categories", "subcategories", "products", "orders", "order_items", "transactions", "settings", "banners", "offers", "payment_methods"];
      
      for (const table of tables) {
        const rows = db.prepare(`SELECT * FROM ${table}`).all();
        if (rows.length > 0) {
          const { error } = await supabase.from(table).upsert(rows);
          if (error) throw error;
        }
      }
      
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/backup-db", (req, res) => {
    const dbPath = path.join(__dirname, "database.db");
    if (fs.existsSync(dbPath)) {
      res.download(dbPath);
    } else {
      res.status(404).json({ error: "Database file not found" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // --- Secondary Telegram Bot for Users ---
  const userBotToken = process.env.TELEGRAM_USER_BOT_TOKEN || "7971005794:AAF8kIyk1CmLrzItMOsHRb5QG3PRcyOHk5M";
  
  // Graceful shutdown for Telegram bots
  const shutdownBot = () => {
    if (userBot) {
      console.log("Stopping User Telegram bot polling...");
      userBot.stopPolling();
    }
    if (adminBot) {
      console.log("Stopping Admin Telegram bot polling...");
      adminBot.stopPolling();
    }
  };

  process.on('SIGINT', () => {
    shutdownBot();
    process.exit();
  });
  process.on('SIGTERM', () => {
    shutdownBot();
    process.exit();
  });

  // Add a small delay to avoid 409 conflict during rapid restarts
  setTimeout(() => {
    userBot = new TelegramBot(userBotToken, { 
      polling: {
        autoStart: true,
        params: {
          timeout: 10
        }
      } 
    });

    // Handle polling errors to avoid crashing or flooding logs
    userBot.on("polling_error", (error: any) => {
      if (error.message.includes("409 Conflict")) {
        console.log("Telegram bot conflict: Another instance is running. This is common during rapid restarts.");
      } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.includes('ECONNRESET')) {
        // These are common network issues, log as info instead of error
        console.log(`Telegram bot network issue (${error.code || 'ECONNRESET'}). Reconnecting...`);
      } else {
        console.error("Telegram polling error:", error);
      }
    });

    userBot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
      const chatId = msg.chat.id;
      const referralCode = match?.[1];
      userStates.delete(chatId);
      
      const user = db.prepare("SELECT * FROM users WHERE telegram_chat_id = ?").get(chatId) as any;
      
      if (user) {
        sendMainMenu(chatId, user, userBot);
      } else {
        if (referralCode) {
          userStates.set(chatId, { step: "register_name", data: { referralCode } });
          userBot.sendMessage(chatId, `مرحباً بك! لقد تمت دعوتك بواسطة المستخدم ${referralCode}.\nيرجى إدخال اسمك الكامل لإنشاء حساب:`);
        } else {
          userBot.sendMessage(chatId, "مرحباً بك في فيبرو! يرجى تسجيل الدخول أو إنشاء حساب للمتابعة.", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "تسجيل الدخول", callback_data: "login" }],
                [{ text: "إنشاء حساب جديد", callback_data: "register" }]
              ]
            }
          });
        }
      }
    });

    userBot.on("callback_query", async (query) => {
      const chatId = query.message?.chat.id;
      if (!chatId) return;
      const data = query.data;

      if (data === "login") {
        userStates.set(chatId, { step: "login_email", data: {} });
        userBot.sendMessage(chatId, "يرجى إدخال البريد الإلكتروني:");
      } else if (data === "register") {
        userStates.set(chatId, { step: "register_name", data: {} });
        userBot.sendMessage(chatId, "يرجى إدخال اسمك الكامل:");
      } else if (data === "main_menu") {
        const user = db.prepare("SELECT * FROM users WHERE telegram_chat_id = ?").get(chatId) as any;
        if (user) sendMainMenu(chatId, user, userBot);
      } else if (data === "my_balance") {
        const user = db.prepare("SELECT balance FROM users WHERE telegram_chat_id = ?").get(chatId) as any;
        userBot.sendMessage(chatId, `💰 رصيدك الحالي هو: ${user.balance.toFixed(2)} $`);
      } else if (data === "my_info") {
        const user = db.prepare("SELECT * FROM users WHERE telegram_chat_id = ?").get(chatId) as any;
        userBot.sendMessage(chatId, `👤 معلوماتي:\nالاسم: ${user.name}\nالإيميل: ${user.email}\nرقم الدخول: ${user.id}\nالرقم الشخصي: ${user.personal_number}\nالحالة: ${user.is_vip ? 'VIP 💎' : 'عادي'}`);
      } else if (data === "my_orders") {
        const orders = db.prepare(`
          SELECT o.id, p.name, o.total_amount, o.status 
          FROM orders o 
          JOIN order_items oi ON o.id = oi.order_id 
          JOIN products p ON oi.product_id = p.id 
          WHERE o.user_id = (SELECT id FROM users WHERE telegram_chat_id = ?) 
          ORDER BY o.created_at DESC LIMIT 5
        `).all(chatId) as any[];
        if (orders.length === 0) return userBot.sendMessage(chatId, "ليس لديك طلبات سابقة.");
        let text = "📦 آخر 5 طلبات لك:\n\n";
        orders.forEach(o => {
          text += `🔹 طلب #${o.id}\nالمنتج: ${o.name}\nالمبلغ: ${o.total_amount}$\nالحالة: ${o.status}\n\n`;
        });
        userBot.sendMessage(chatId, text);
      } else if (data === "my_payments") {
        const txs = db.prepare(`
          SELECT t.id, t.amount, t.status, pm.name as method 
          FROM transactions t 
          JOIN payment_methods pm ON t.payment_method_id = pm.id 
          WHERE t.user_id = (SELECT id FROM users WHERE telegram_chat_id = ?) 
          ORDER BY t.created_at DESC LIMIT 5
        `).all(chatId) as any[];
        if (txs.length === 0) return userBot.sendMessage(chatId, "ليس لديك عمليات شحن سابقة.");
        let text = "💳 آخر 5 عمليات شحن لك:\n\n";
        txs.forEach(t => {
          text += `🔹 شحن #${t.id}\nالمبلغ: ${t.amount}$\nالطريقة: ${t.method}\nالحالة: ${t.status}\n\n`;
        });
        userBot.sendMessage(chatId, text);
      } else if (data === "referral") {
        const user = db.prepare("SELECT personal_number FROM users WHERE telegram_chat_id = ?").get(chatId) as any;
        const count = db.prepare("SELECT COUNT(*) as count FROM users WHERE referred_by_id = (SELECT id FROM users WHERE telegram_chat_id = ?)").get(chatId) as { count: number };
        const referralLink = `https://t.me/${(await userBot.getMe()).username}?start=${user.personal_number}`;
        userBot.sendMessage(chatId, `🔗 نظام الإحالة:\n\nرابط الإحالة الخاص بك:\n${referralLink}\n\nعدد المستخدمين المسجلين عبر رابطك: ${count.count}\n\nتحصل على عمولة 5% عن كل عملية شراء يقوم بها أصدقاؤك!`);
      } else if (data === "share") {
        const user = db.prepare("SELECT personal_number FROM users WHERE telegram_chat_id = ?").get(chatId) as any;
        const referralLink = `https://t.me/${(await userBot.getMe()).username}?start=${user.personal_number}`;
        userBot.sendMessage(chatId, `شارك البوت مع أصدقائك واحصل على عمولات!`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "مشاركة الرابط", url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('اشحن ألعابك وتطبيقاتك المفضلة عبر بوت فيبرو!')}` }]
            ]
          }
        });
      } else if (data === "topup_balance") {
        const methods = db.prepare("SELECT * FROM payment_methods WHERE active = 1").all() as any[];
        let text = "💳 طرق الدفع المتاحة:\n\n";
        methods.forEach(m => {
          text += `🔹 ${m.name}\nالعنوان: ${m.wallet_address}\nالحد الأدنى: ${m.min_amount} $\n${m.instructions || ""}\n\n`;
        });
        userBot.sendMessage(chatId, text);
      } else if (data === "charge_apps") {
        const categories = db.prepare("SELECT * FROM categories WHERE active = 1").all() as any[];
        const keyboard = categories.map(c => [{ text: c.name, callback_data: `cat_${c.id}` }]);
        userBot.sendMessage(chatId, "اختر القسم:", {
          reply_markup: { inline_keyboard: keyboard }
        });
      } else if (data?.startsWith("cat_")) {
        const catId = data.split("_")[1];
        const subs = db.prepare("SELECT * FROM subcategories WHERE category_id = ? AND active = 1").all(catId) as any[];
        const keyboard = subs.map(s => [{ text: s.name, callback_data: `sub_${s.id}` }]);
        userBot.sendMessage(chatId, "اختر القسم الفرعي:", {
          reply_markup: { inline_keyboard: keyboard }
        });
      } else if (data?.startsWith("sub_")) {
        const subId = data.split("_")[1];
        const products = db.prepare("SELECT * FROM products WHERE subcategory_id = ? AND available = 1").all(subId) as any[];
        const keyboard = products.map(p => [{ text: `${p.name} - ${p.price}$`, callback_data: `buy_${p.id}` }]);
        userBot.sendMessage(chatId, "اختر المنتج للشراء:", {
          reply_markup: { inline_keyboard: keyboard }
        });
      } else if (data?.startsWith("buy_")) {
        const prodId = data.split("_")[1];
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(prodId) as any;
        const user = db.prepare("SELECT * FROM users WHERE telegram_chat_id = ?").get(chatId) as any;
        
        if (!user) return userBot.sendMessage(chatId, "يرجى تسجيل الدخول أولاً.");
        
        const price = user.is_vip ? product.price * 0.95 : product.price;
        
        if (user.balance < price) {
          return userBot.sendMessage(chatId, `❌ رصيدك غير كافٍ. السعر: ${price.toFixed(2)}$ ورصيدك: ${user.balance.toFixed(2)}$`);
        }

        if (product.requires_input || product.store_type === 'quick_order') {
          const prompt = product.store_type === 'quick_order' ? "يرجى إدخال معرف اللاعب (ID):" : "يرجى إدخال البيانات المطلوبة للمنتج:";
          userStates.set(chatId, { step: "purchase_input", data: { productId: prodId, price } });
          userBot.sendMessage(chatId, prompt);
        } else {
          // Direct purchase
          processBotOrder(chatId, user, product, price, {});
        }
      }
    });

    async function processBotOrder(chatId: number, user: any, product: any, price: number, extraData: any) {
      try {
        const transaction = db.transaction(() => {
          db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(price, user.id);
          const orderResult = db.prepare("INSERT INTO orders (user_id, total_amount, meta) VALUES (?, ?, ?)").run(user.id, price, JSON.stringify(extraData));
          db.prepare("INSERT INTO order_items (order_id, product_id, price_at_purchase, quantity, extra_data) VALUES (?, ?, ?, ?, ?)").run(
            orderResult.lastInsertRowid, product.id, product.price, 1, JSON.stringify(extraData)
          );
          return orderResult.lastInsertRowid;
        });

        const orderId = transaction();
        
        // Sync
        syncToCloud("orders", db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId));
        syncToCloud("users", db.prepare("SELECT * FROM users WHERE id = ?").get(user.id));

        userBot.sendMessage(chatId, `✅ تمت عملية الشراء بنجاح!\nرقم الطلب: ${orderId}\nالمنتج: ${product.name}\nالمبلغ المخصوم: ${price.toFixed(2)}$`);
        sendTelegramMessage(`🔔 طلب جديد من البوت\nID: ${orderId}\nالاسم: ${user.name}\nProduct: ${product.name}\nTotal: ${price}`);
      } catch (e) {
        console.error(e);
        userBot.sendMessage(chatId, "❌ حدث خطأ أثناء معالجة الطلب.");
      }
    }

    adminBot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      if (!text || text.startsWith("/")) return;

      const state = userStates.get(chatId);
      if (!state) return;

      if (state.step === "admin_add_cat_name") {
        state.data.name = text;
        state.step = "admin_add_cat_url";
        adminBot.sendMessage(chatId, "يرجى إدخال رابط صورة القسم:");
      } else if (state.step === "admin_add_cat_url") {
        const result = db.prepare("INSERT INTO categories (name, image_url) VALUES (?, ?)").run(state.data.name, text);
        syncToCloud("categories", db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid));
        userStates.delete(chatId);
        adminBot.sendMessage(chatId, "✅ تم إضافة القسم بنجاح!");
      } else if (state.step === "admin_add_sub_catid") {
        state.data.catId = text;
        state.step = "admin_add_sub_name";
        adminBot.sendMessage(chatId, "يرجى إدخال اسم القسم الفرعي:");
      } else if (state.step === "admin_add_sub_name") {
        const result = db.prepare("INSERT INTO subcategories (category_id, name) VALUES (?, ?)").run(state.data.catId, text);
        syncToCloud("subcategories", db.prepare("SELECT * FROM subcategories WHERE id = ?").get(result.lastInsertRowid));
        userStates.delete(chatId);
        adminBot.sendMessage(chatId, "✅ تم إضافة القسم الفرعي بنجاح!");
      } else if (state.step === "admin_add_prod_subid") {
        state.data.subId = text;
        state.step = "admin_add_prod_name";
        adminBot.sendMessage(chatId, "يرجى إدخال اسم المنتج:");
      } else if (state.step === "admin_add_prod_name") {
        state.data.name = text;
        state.step = "admin_add_prod_price";
        adminBot.sendMessage(chatId, "يرجى إدخال سعر المنتج:");
      } else if (state.step === "admin_add_prod_price") {
        state.data.price = text;
        state.step = "admin_add_prod_url";
        adminBot.sendMessage(chatId, "يرجى إدخال رابط صورة المنتج:");
      } else if (state.step === "admin_add_prod_url") {
        const result = db.prepare("INSERT INTO products (subcategory_id, name, price, image_url) VALUES (?, ?, ?, ?)").run(
          state.data.subId, state.data.name, state.data.price, text
        );
        syncToCloud("products", db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid));
        userStates.delete(chatId);
        adminBot.sendMessage(chatId, "✅ تم إضافة المنتج بنجاح!");
      } else if (state.step === "admin_add_banner_url") {
        const result = db.prepare("INSERT INTO banners (image_url) VALUES (?)").run(text);
        syncToCloud("banners", db.prepare("SELECT * FROM banners WHERE id = ?").get(result.lastInsertRowid));
        userStates.delete(chatId);
        adminBot.sendMessage(chatId, "✅ تم إضافة البانر بنجاح!");
      }
    });

    userBot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      if (!text || text.startsWith("/")) return;

      const state = userStates.get(chatId);
      if (!state) return;

      if (state.step === "purchase_input") {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(state.data.productId) as any;
        const user = db.prepare("SELECT * FROM users WHERE telegram_chat_id = ?").get(chatId) as any;
        const extraData = product.store_type === 'quick_order' ? { playerId: text, storeType: 'quick_order' } : { input: text };
        
        userStates.delete(chatId);
        processBotOrder(chatId, user, product, state.data.price, extraData);
      } else if (state.step === "login_email") {
        state.data.email = text;
        state.step = "login_password";
        userBot.sendMessage(chatId, "يرجى إدخال كلمة المرور:");
      } else if (state.step === "login_password") {
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(state.data.email) as any;
        if (user) {
          const isMatch = await bcrypt.compare(text, user.password_hash);
          if (isMatch) {
            db.prepare("UPDATE users SET telegram_chat_id = ? WHERE id = ?").run(chatId, user.id);
            userStates.delete(chatId);
            userBot.sendMessage(chatId, "✅ تم تسجيل الدخول بنجاح!");
            sendMainMenu(chatId, user, userBot);
            return;
          }
        }
        userBot.sendMessage(chatId, "❌ البريد الإلكتروني أو كلمة المرور غير صحيحة. حاول مرة أخرى /start");
        userStates.delete(chatId);
      } else if (state.step === "register_name") {
        state.data.name = text;
        state.step = "register_email";
        userBot.sendMessage(chatId, "يرجى إدخال البريد الإلكتروني:");
      } else if (state.step === "register_email") {
        state.data.email = text;
        state.step = "register_phone";
        userBot.sendMessage(chatId, "يرجى إدخال رقم الهاتف:");
      } else if (state.step === "register_phone") {
        state.data.phone = text;
        state.step = "register_password";
        userBot.sendMessage(chatId, "يرجى إدخال كلمة المرور:");
      } else if (state.step === "register_password") {
        state.data.password = text;
        try {
          let personalNumber = "";
          while (true) {
            personalNumber = Math.floor(1000000 + Math.random() * 9000000).toString();
            const existing = db.prepare("SELECT id FROM users WHERE personal_number = ?").get(personalNumber);
            if (!existing) break;
          }

          let referredById = null;
          if (state.data.referralCode) {
            const referrer = db.prepare("SELECT id FROM users WHERE personal_number = ?").get(state.data.referralCode) as any;
            if (referrer) referredById = referrer.id;
          }

          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(state.data.password, salt);

          const result = db.prepare("INSERT INTO users (name, email, password_hash, phone, personal_number, telegram_chat_id, referred_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
            state.data.name, state.data.email, hashedPassword, state.data.phone, personalNumber, chatId, referredById
          );
          const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
          userStates.delete(chatId);
          userBot.sendMessage(chatId, "✅ تم إنشاء الحساب بنجاح!");
          sendMainMenu(chatId, user, userBot);
        } catch (e) {
          console.error(e);
          userBot.sendMessage(chatId, "❌ حدث خطأ (ربما البريد مستخدم مسبقاً). حاول مرة أخرى /start");
          userStates.delete(chatId);
        }
      }
    });

    // Graceful shutdown for Telegram bot
    process.on('SIGINT', () => {
      if (userBot) userBot.stopPolling();
      process.exit();
    });
    process.on('SIGTERM', () => {
      if (userBot) userBot.stopPolling();
      process.exit();
    });

  }, 2000);

  function sendMainMenu(chatId: number, user: any, bot: TelegramBot) {
    const settings = db.prepare("SELECT value FROM settings WHERE key = 'support_whatsapp'").get() as { value: string };
    const whatsappLink = settings ? `https://wa.me/${settings.value.replace('+', '')}` : "https://t.me/your_support_username";

    bot.sendMessage(chatId, `أهلاً بك ${user.name} في القائمة الرئيسية:`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💰 رصيدي", callback_data: "my_balance" }, { text: "👤 معلوماتي", callback_data: "my_info" }],
          [{ text: "📦 طلباتي", callback_data: "my_orders" }, { text: "💳 دفعاتي", callback_data: "my_payments" }],
          [{ text: "💳 شحن رصيد", callback_data: "topup_balance" }],
          [{ text: "📱 شحن تطبيقات", callback_data: "charge_apps" }],
          [{ text: "🔗 الإحالة", callback_data: "referral" }, { text: "📤 مشاركة", callback_data: "share" }],
          [{ text: "📞 الدعم الفني", url: whatsappLink }],
          [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
  }
}

startServer();
