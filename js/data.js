// ─── HamishaShop Data Layer ───
// All data persisted to localStorage

const DB = {
  KEY: 'hamishaShopDB',

  defaults() {
    return {
      products: [
        { id: 1, name: 'اکانت جاوا استارتر', cat: 'java', price: 95000, oldPrice: 120000, desc: 'مناسب شروع، اورجینال', icon: '☕', badge: 'sale', stock: 15, active: true },
        { id: 2, name: 'اکانت جاوا پرمیوم', cat: 'java', price: 180000, oldPrice: null, desc: 'سابقه بازی بالا', icon: '💎', badge: '', stock: 8, active: true },
        { id: 3, name: 'اکانت جاوا اولتیمیت', cat: 'java', price: 280000, oldPrice: 350000, desc: 'بیشترین امکانات', icon: '👑', badge: 'hot', stock: 3, active: true },
        { id: 4, name: 'اکانت بدراک', cat: 'bedrock', price: 120000, oldPrice: null, desc: 'موبایل، ایکس‌باکس و PS', icon: '📱', badge: 'new', stock: 20, active: true },
        { id: 5, name: 'تغییر یوزرنیم', cat: 'service', price: 50000, oldPrice: null, desc: 'تغییر نام کاربری', icon: '✏️', badge: '', stock: 99, active: true },
        { id: 6, name: 'ریکاوری اکانت', cat: 'service', price: 80000, oldPrice: null, desc: 'بازیابی اکانت', icon: '🔧', badge: '', stock: 99, active: true },
      ],
      orders: [],
      tickets: [],
      users: [],
      settings: {
        adminPass: 'admin123',
        cardNumber: '6037-9975-0000-0000',
        cardOwner: 'حمیدرضا محمدی'
      },
      nextId: { order: 1001, ticket: 2001, user: 3001, product: 100 }
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.reset();
      return JSON.parse(raw);
    } catch {
      return this.reset();
    }
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  reset() {
    const d = this.defaults();
    this.save(d);
    return d;
  }
};

// Initialize global state
let STATE = DB.load();

function saveState() {
  DB.save(STATE);
}

function nextId(type) {
  const id = STATE.nextId[type]++;
  saveState();
  return id;
}
