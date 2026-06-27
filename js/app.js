// ─── HamishaShop App ───

let currentUser = null;   // logged-in user object
let isAdmin = false;      // admin session
let editingProductId = null;
let activeBuyProduct = null;

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // restore session
  const savedUser = sessionStorage.getItem('hsUser');
  if (savedUser) { try { currentUser = JSON.parse(savedUser); } catch {} }
  isAdmin = sessionStorage.getItem('hsAdmin') === '1';

  updateNavAuth();
  renderHomePage();

  // load settings inputs
  document.getElementById('card-number-input').value = STATE.settings.cardNumber || '';
  document.getElementById('card-owner-input').value = STATE.settings.cardOwner || '';
});

// ──────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────
function showPage(name) {
  if (name === 'admin') {
    if (!isAdmin) { showPage('admin-login'); return; }
    renderAdminDashboard();
  }
  if (name === 'tickets' || name === 'profile') {
    if (!currentUser) { showPage('auth'); toast('برای ادامه وارد شوید'); return; }
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  if (name === 'home') renderHomePage();
  if (name === 'shop') renderShop();
  if (name === 'tickets') renderTickets();
  if (name === 'profile') renderProfile();
  if (name === 'admin') { renderAdminDashboard(); renderAdminProducts(); renderAdminOrders(); renderAdminTickets(); renderAdminUsers(); }

  closeMenu();
  window.scrollTo(0, 0);
}

function toggleMenu() {
  document.getElementById('nav-links').classList.toggle('open');
}

function closeMenu() {
  document.getElementById('nav-links').classList.remove('open');
}

// ──────────────────────────────────────────────
// AUTH NAV AREA
// ──────────────────────────────────────────────
function updateNavAuth() {
  const area = document.getElementById('nav-auth-area');
  if (isAdmin) {
    area.innerHTML = `<a class="nav-link" href="#" onclick="showPage('admin')" style="color:var(--accent)">⚙️ ادمین</a>
      <a class="nav-link" href="#" onclick="adminLogout()">خروج</a>`;
  } else if (currentUser) {
    area.innerHTML = `<a class="nav-link" href="#" onclick="showPage('profile')">${currentUser.username}</a>
      <a class="nav-link" href="#" onclick="doLogout()">خروج</a>`;
  } else {
    area.innerHTML = `<a class="nav-link" href="#" onclick="showPage('auth')">ورود / ثبت‌نام</a>
      <a class="nav-link" href="#" onclick="showPage('admin-login')" style="color:var(--muted);font-size:12px">ادمین</a>`;
  }
}

// ──────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────
function switchAuthTab(tab) {
  document.getElementById('form-login').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

function doLogin() {
  const u = val('login-user'), p = val('login-pass');
  if (!u || !p) { showErr('login-err', 'لطفاً همه فیلدها را پر کنید'); return; }
  const user = STATE.users.find(x => x.username === u && x.password === p);
  if (!user) { showErr('login-err', 'نام کاربری یا رمز اشتباه است'); return; }
  currentUser = user;
  sessionStorage.setItem('hsUser', JSON.stringify(user));
  showErr('login-err', '');
  updateNavAuth();
  toast('خوش آمدید ' + user.username);
  showPage('home');
}

function doRegister() {
  const u = val('reg-user'), e = val('reg-email'), p = val('reg-pass');
  if (!u || !e || !p) { showErr('reg-err', 'همه فیلدها الزامی هستند'); return; }
  if (p.length < 6) { showErr('reg-err', 'رمز باید حداقل ۶ کاراکتر باشد'); return; }
  if (STATE.users.find(x => x.username === u)) { showErr('reg-err', 'این نام کاربری قبلاً ثبت شده'); return; }
  const user = { id: nextId('user'), username: u, email: e, password: p, joinDate: today(), orders: [], accounts: [] };
  STATE.users.push(user);
  saveState();
  currentUser = user;
  sessionStorage.setItem('hsUser', JSON.stringify(user));
  showErr('reg-err', '');
  updateNavAuth();
  toast('حساب شما ساخته شد!');
  showPage('home');
}

function doLogout() {
  currentUser = null;
  sessionStorage.removeItem('hsUser');
  updateNavAuth();
  showPage('home');
  toast('از حساب خارج شدید');
}

// ──────────────────────────────────────────────
// ADMIN AUTH
// ──────────────────────────────────────────────
function doAdminLogin() {
  const p = val('admin-pass-input');
  if (p !== STATE.settings.adminPass) { showErr('admin-login-err', 'رمز اشتباه است'); return; }
  isAdmin = true;
  sessionStorage.setItem('hsAdmin', '1');
  showErr('admin-login-err', '');
  updateNavAuth();
  showPage('admin');
}

function adminLogout() {
  isAdmin = false;
  sessionStorage.removeItem('hsAdmin');
  updateNavAuth();
  showPage('home');
}

// ──────────────────────────────────────────────
// HOME
// ──────────────────────────────────────────────
function renderHomePage() {
  const featured = STATE.products.filter(p => p.active && p.badge).slice(0, 4);
  const all = STATE.products.filter(p => p.active);
  renderProductGrid('home-products', featured.length ? featured : all.slice(0, 4));
}

// ──────────────────────────────────────────────
// SHOP
// ──────────────────────────────────────────────
let shopFilter = 'all';

function renderShop() {
  const products = STATE.products.filter(p => p.active && (shopFilter === 'all' || p.cat === shopFilter));
  renderProductGrid('shop-products', products);
}

function filterProducts(btn, filter) {
  shopFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderShop();
}

function renderProductGrid(containerId, products) {
  const c = document.getElementById(containerId);
  if (!c) return;
  if (!products.length) {
    c.innerHTML = '<div class="empty-box"><div class="ei">📦</div>محصولی یافت نشد</div>';
    return;
  }
  c.innerHTML = products.map(p => `
    <div class="product-card">
      ${p.badge ? `<span class="p-badge badge-${p.badge}">${p.badge==='hot'?'🔥 پرفروش':p.badge==='new'?'✨ جدید':'💸 تخفیف'}</span>` : ''}
      <div class="p-icon">${p.icon || '🎮'}</div>
      <span class="p-tag tag-${p.cat}">${p.cat==='java'?'Java':p.cat==='bedrock'?'Bedrock':'خدمات'}</span>
      <div class="p-name">${p.name}</div>
      <div class="p-desc">${p.desc}</div>
      <div class="price-row">
        <span class="p-price">${fmtPrice(p.price)}</span>
        ${p.oldPrice ? `<span class="p-old">${fmtPrice(p.oldPrice)}</span>` : ''}
      </div>
      <button class="btn-primary full" onclick="openBuy(${p.id})" ${p.stock < 1 ? 'disabled' : ''}>
        ${p.stock < 1 ? 'ناموجود' : 'خرید'}
      </button>
    </div>
  `).join('');
}

// ──────────────────────────────────────────────
// BUY FLOW
// ──────────────────────────────────────────────
function openBuy(productId) {
  if (!currentUser) { showPage('auth'); toast('برای خرید وارد شوید'); return; }
  const p = STATE.products.find(x => x.id === productId);
  if (!p) return;
  activeBuyProduct = p;

  document.getElementById('buy-modal-content').innerHTML = `
    <h3>${p.icon} ${p.name}</h3>
    <p class="muted small" style="margin:0.5rem 0 1rem">${p.desc}</p>
    <div class="price-row" style="margin-bottom:1.25rem">
      <span class="p-price">${fmtPrice(p.price)}</span>
      ${p.oldPrice ? `<span class="p-old">${fmtPrice(p.oldPrice)}</span>` : ''}
    </div>
    <p class="muted small" style="margin-bottom:1rem">پس از کلیک روی «ادامه»، شماره کارت برای پرداخت نمایش داده می‌شود. بعد از واریز، ادمین سفارش را تأیید می‌کند.</p>
    <button class="btn-primary full" onclick="goToPayment()">ادامه → پرداخت</button>
  `;
  openModal('buy');
}

function goToPayment() {
  closeAllModals();
  if (!activeBuyProduct) return;
  document.getElementById('payment-card-display').textContent = STATE.settings.cardNumber || '─────────────';
  const ownerLine = STATE.settings.cardOwner ? `<div style="font-size:13px;color:var(--muted);margin-top:6px;font-family:inherit">${STATE.settings.cardOwner}</div>` : '';
  document.getElementById('payment-card-display').innerHTML = `<div dir="ltr">${STATE.settings.cardNumber || '──────────────'}</div>${ownerLine}`;
  document.getElementById('payment-amount').textContent = fmtPrice(activeBuyProduct.price);
  openModal('payment');
}

function submitPayment() {
  const ref = val('payment-ref');
  if (!ref) { toast('لطفاً کد پیگیری یا توضیح واریز را وارد کنید'); return; }
  const order = {
    id: nextId('order'),
    userId: currentUser.id,
    username: currentUser.username,
    productId: activeBuyProduct.id,
    productName: activeBuyProduct.name,
    price: activeBuyProduct.price,
    ref,
    status: 'pending',
    date: today(),
    accountInfo: null
  };
  STATE.orders.push(order);
  // link to user
  const u = STATE.users.find(x => x.id === currentUser.id);
  if (u) { u.orders = u.orders || []; u.orders.push(order.id); }
  saveState();
  closeAllModals();
  document.getElementById('payment-ref').value = '';
  toast('سفارش ثبت شد — منتظر تأیید ادمین بمانید');
}

// ──────────────────────────────────────────────
// TICKETS
// ──────────────────────────────────────────────
function renderTickets() {
  if (!currentUser) return;
  const btn = document.getElementById('new-ticket-btn');
  if (btn) btn.style.display = '';

  const myTickets = STATE.tickets.filter(t => t.userId === currentUser.id);
  const c = document.getElementById('tickets-wrap');

  if (!myTickets.length) {
    c.innerHTML = '<div class="empty-box"><div class="ei">🎫</div>تیکتی ندارید — یک تیکت جدید باز کنید</div>';
    return;
  }

  c.innerHTML = myTickets.map(t => `
    <div class="ticket-card" onclick="openTicketView(${t.id})">
      <div class="ticket-head">
        <span class="ticket-title">${t.subject}</span>
        <span class="pill pill-${t.status === 'open' ? 'open' : 'closed'}">${t.status === 'open' ? 'باز' : 'بسته'}</span>
      </div>
      <div class="ticket-meta">${t.cat} · ${t.date} · ${t.msgs.length} پیام</div>
    </div>
  `).join('');
}

function openNewTicket() {
  openModal('new-ticket');
}

function submitTicket() {
  const subj = val('t-subject'), cat = val('t-cat'), msg = val('t-msg');
  if (!subj || !msg) { toast('موضوع و پیام الزامی هستند'); return; }
  const ticket = {
    id: nextId('ticket'),
    userId: currentUser.id,
    username: currentUser.username,
    subject: subj,
    cat,
    status: 'open',
    date: today(),
    msgs: [{ from: 'user', name: currentUser.username, text: msg, time: timeNow() }]
  };
  STATE.tickets.push(ticket);
  saveState();
  closeAllModals();
  clear('t-subject'); clear('t-msg');
  renderTickets();
  toast('تیکت ثبت شد');
}

function openTicketView(ticketId, adminMode = false) {
  const t = STATE.tickets.find(x => x.id === ticketId);
  if (!t) return;

  const msgsHtml = t.msgs.map(m => `
    <div class="msg-wrap ${m.from === 'admin' ? 'them' : 'me'}">
      <div class="msg-name">${m.name} · ${m.time}</div>
      <div class="msg-bubble">${m.text}</div>
    </div>
  `).join('');

  const replyArea = t.status === 'open' ? `
    <textarea id="reply-input" rows="3" placeholder="پاسخ شما..."></textarea>
    <div style="display:flex;gap:8px;margin-top:0.5rem">
      <button class="btn-primary btn-sm" onclick="sendReply(${t.id},${adminMode})">ارسال</button>
      ${adminMode ? `<button class="btn-outline btn-sm" onclick="changeTicketStatus(${t.id},'closed')">بستن تیکت</button>` : ''}
    </div>
  ` : '<p class="muted small" style="text-align:center;padding:0.5rem">این تیکت بسته شده است</p>';

  document.getElementById('ticket-view-inner').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem">
      <div>
        <div style="font-weight:700;font-size:15px">${t.subject}</div>
        <div class="muted small">${t.cat} · ${t.date}</div>
      </div>
      <span class="pill pill-${t.status === 'open' ? 'open' : 'closed'}">${t.status === 'open' ? 'باز' : 'بسته'}</span>
    </div>
    <div class="chat-area">${msgsHtml}</div>
    ${replyArea}
  `;

  openModal('ticket-view');
  // scroll chat to bottom
  setTimeout(() => {
    const ca = document.querySelector('.chat-area');
    if (ca) ca.scrollTop = ca.scrollHeight;
  }, 50);
}

function sendReply(ticketId, adminMode) {
  const text = val('reply-input');
  if (!text) return;
  const t = STATE.tickets.find(x => x.id === ticketId);
  const name = adminMode ? 'پشتیبانی' : currentUser.username;
  t.msgs.push({ from: adminMode ? 'admin' : 'user', name, text, time: timeNow() });
  saveState();
  openTicketView(ticketId, adminMode);
}

function changeTicketStatus(ticketId, status) {
  const t = STATE.tickets.find(x => x.id === ticketId);
  if (t) { t.status = status; saveState(); }
  closeAllModals();
  renderAdminTickets();
  toast('وضعیت تیکت تغییر کرد');
}

// ──────────────────────────────────────────────
// PROFILE
// ──────────────────────────────────────────────
function renderProfile() {
  if (!currentUser) return;
  const u = STATE.users.find(x => x.id === currentUser.id) || currentUser;

  document.getElementById('profile-card').innerHTML = `
    <div class="avatar-circle">🎮</div>
    <div>
      <div style="font-weight:700;font-size:1rem">${u.username}</div>
      <div class="muted small">${u.email}</div>
      <div class="muted small" style="margin-top:4px">عضو از ${u.joinDate}</div>
    </div>
  `;

  const myOrders = STATE.orders.filter(o => o.userId === u.id);
  const ordersEl = document.getElementById('my-orders');
  if (!myOrders.length) {
    ordersEl.innerHTML = '<div class="empty-box"><div class="ei">🧾</div>هنوز خریدی انجام نداده‌اید</div>';
  } else {
    ordersEl.innerHTML = myOrders.map(o => `
      <div class="order-card">
        <div>
          <div style="font-weight:600;font-size:14px">${o.productName}</div>
          <div class="muted small">${o.date} · ${fmtPrice(o.price)}</div>
        </div>
        <span class="pill pill-${o.status === 'paid' ? 'paid' : o.status === 'rejected' ? 'rejected' : 'pending'}">
          ${o.status === 'paid' ? 'تأیید شده' : o.status === 'rejected' ? 'رد شده' : 'در انتظار'}
        </span>
      </div>
    `).join('');
  }

  const paidOrders = myOrders.filter(o => o.status === 'paid' && o.accountInfo);
  const accountsEl = document.getElementById('my-accounts');
  if (!paidOrders.length) {
    accountsEl.innerHTML = '<div class="empty-box"><div class="ei">🔑</div>اکانتی برای نمایش وجود ندارد</div>';
  } else {
    accountsEl.innerHTML = paidOrders.map(o => `
      <div class="account-row">
        <div>
          <div style="font-weight:600;font-size:14px">${o.productName}</div>
          <div class="muted small" dir="ltr" style="text-align:right">${o.accountInfo}</div>
        </div>
        <button class="copy-btn" onclick="copyText('${o.accountInfo}')">📋 کپی</button>
      </div>
    `).join('');
  }
}

// ──────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────
function adminTab(name, el) {
  document.querySelectorAll('.atab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.anav').forEach(b => b.classList.remove('active'));
  document.getElementById('atab-' + name).classList.add('active');
  el.classList.add('active');
}

function renderAdminDashboard() {
  const pending = STATE.orders.filter(o => o.status === 'pending').length;
  const paid = STATE.orders.filter(o => o.status === 'paid').length;
  const revenue = STATE.orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.price, 0);
  const openTickets = STATE.tickets.filter(t => t.status === 'open').length;

  document.getElementById('admin-stats').innerHTML = `
    <div class="stat-box"><div class="s-num" style="color:var(--accent)">${fmtPrice(revenue)}</div><div class="s-lbl">درآمد تأیید شده</div></div>
    <div class="stat-box"><div class="s-num">${paid}</div><div class="s-lbl">سفارش تأیید شده</div></div>
    <div class="stat-box"><div class="s-num" style="color:var(--warning)">${pending}</div><div class="s-lbl">در انتظار تأیید</div></div>
    <div class="stat-box"><div class="s-num" style="color:var(--info)">${openTickets}</div><div class="s-lbl">تیکت باز</div></div>
    <div class="stat-box"><div class="s-num">${STATE.users.length}</div><div class="s-lbl">کاربر</div></div>
  `;

  const pendingOrders = STATE.orders.filter(o => o.status === 'pending');
  const el = document.getElementById('pending-orders-list');
  if (!pendingOrders.length) {
    el.innerHTML = '<div class="empty-box" style="padding:1.5rem">سفارش در انتظاری وجود ندارد ✓</div>';
    return;
  }

  el.innerHTML = pendingOrders.map(o => `
    <div class="order-card">
      <div>
        <div style="font-weight:600;font-size:14px">${o.productName}</div>
        <div class="muted small">کاربر: ${o.username} · ${fmtPrice(o.price)}</div>
        <div class="muted small">کد پیگیری: ${o.ref}</div>
      </div>
      <div class="order-actions">
        <div>
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px">اطلاعات اکانت (برای ارسال به کاربر)</label>
          <input type="text" placeholder="email:pass" id="acc-info-${o.id}" style="width:200px;font-size:12px;margin-bottom:6px" dir="ltr">
        </div>
        <button class="btn-primary btn-sm" onclick="approveOrder(${o.id})">تأیید</button>
        <button class="btn-danger btn-sm" onclick="rejectOrder(${o.id})">رد</button>
      </div>
    </div>
  `).join('');
}

function approveOrder(orderId) {
  const o = STATE.orders.find(x => x.id === orderId);
  if (!o) return;
  const accInfo = document.getElementById('acc-info-' + orderId)?.value.trim() || '';
  o.status = 'paid';
  o.accountInfo = accInfo;
  // reduce stock
  const p = STATE.products.find(x => x.id === o.productId);
  if (p && p.stock > 0) p.stock--;
  saveState();
  toast('سفارش #' + orderId + ' تأیید شد');
  renderAdminDashboard();
  renderAdminOrders();
}

function rejectOrder(orderId) {
  const o = STATE.orders.find(x => x.id === orderId);
  if (o) { o.status = 'rejected'; saveState(); }
  toast('سفارش رد شد');
  renderAdminDashboard();
  renderAdminOrders();
}

function renderAdminOrders() {
  const el = document.getElementById('all-orders-list');
  if (!el) return;
  const orders = [...STATE.orders].reverse();
  if (!orders.length) { el.innerHTML = '<div class="empty-box">سفارشی وجود ندارد</div>'; return; }
  el.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>#</th><th>کاربر</th><th>محصول</th><th>مبلغ</th><th>کد پیگیری</th><th>تاریخ</th><th>وضعیت</th></tr></thead>
    <tbody>
      ${orders.map(o => `
        <tr>
          <td>${o.id}</td>
          <td>${o.username}</td>
          <td>${o.productName}</td>
          <td style="color:var(--accent)">${fmtPrice(o.price)}</td>
          <td class="muted">${o.ref || '─'}</td>
          <td class="muted">${o.date}</td>
          <td><span class="pill pill-${o.status === 'paid' ? 'paid' : o.status === 'rejected' ? 'rejected' : 'pending'}">
            ${o.status === 'paid' ? 'تأیید' : o.status === 'rejected' ? 'رد' : 'در انتظار'}
          </span></td>
        </tr>
      `).join('')}
    </tbody>
  </table></div>`;
}

function renderAdminProducts() {
  const el = document.getElementById('admin-products-list');
  if (!el) return;
  if (!STATE.products.length) { el.innerHTML = '<div class="empty-box">محصولی وجود ندارد</div>'; return; }
  el.innerHTML = `<table class="data-table">
    <thead><tr><th>محصول</th><th>دسته</th><th>قیمت</th><th>موجودی</th><th>وضعیت</th><th>عملیات</th></tr></thead>
    <tbody>
      ${STATE.products.map(p => `
        <tr>
          <td>${p.icon} ${p.name}</td>
          <td>${p.cat === 'java' ? 'جاوا' : p.cat === 'bedrock' ? 'بدراک' : 'خدمات'}</td>
          <td style="color:var(--accent)">${fmtPrice(p.price)}</td>
          <td>${p.stock}</td>
          <td><span style="color:${p.active ? 'var(--accent)' : 'var(--muted)'}">${p.active ? 'فعال' : 'غیرفعال'}</span></td>
          <td>
            <button class="btn-outline btn-sm" onclick="editProduct(${p.id})" style="margin-left:6px">ویرایش</button>
            <button class="btn-danger btn-sm" onclick="deleteProduct(${p.id})">حذف</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

function renderAdminTickets() {
  const el = document.getElementById('admin-tickets-list');
  if (!el) return;
  const tickets = [...STATE.tickets].reverse();
  if (!tickets.length) { el.innerHTML = '<div class="empty-box">تیکتی وجود ندارد</div>'; return; }
  el.innerHTML = tickets.map(t => `
    <div class="ticket-card" onclick="openTicketView(${t.id}, true)">
      <div class="ticket-head">
        <span class="ticket-title">#${t.id} — ${t.subject}</span>
        <span class="pill pill-${t.status === 'open' ? 'open' : 'closed'}">${t.status === 'open' ? 'باز' : 'بسته'}</span>
      </div>
      <div class="ticket-meta">کاربر: ${t.username} · ${t.cat} · ${t.date} · ${t.msgs.length} پیام</div>
    </div>
  `).join('');
}

function renderAdminUsers() {
  const el = document.getElementById('admin-users-list');
  if (!el) return;
  if (!STATE.users.length) { el.innerHTML = '<div class="empty-box">کاربری وجود ندارد</div>'; return; }
  el.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>نام کاربری</th><th>ایمیل</th><th>تاریخ عضویت</th><th>تعداد سفارش</th></tr></thead>
    <tbody>
      ${STATE.users.map(u => `
        <tr>
          <td>${u.username}</td>
          <td class="muted">${u.email}</td>
          <td class="muted">${u.joinDate}</td>
          <td>${(u.orders || []).length}</td>
        </tr>
      `).join('')}
    </tbody>
  </table></div>`;
}

// ──────────────────────────────────────────────
// PRODUCT MANAGEMENT
// ──────────────────────────────────────────────
function openProductModal(id = null) {
  editingProductId = id;
  document.getElementById('product-modal-title').textContent = id ? 'ویرایش محصول' : 'محصول جدید';

  if (id) {
    const p = STATE.products.find(x => x.id === id);
    if (p) {
      setVal('pm-name', p.name);
      setVal('pm-cat', p.cat);
      setVal('pm-price', p.price);
      setVal('pm-old', p.oldPrice || '');
      setVal('pm-desc', p.desc);
      setVal('pm-icon', p.icon);
      setVal('pm-badge', p.badge);
      setVal('pm-stock', p.stock);
    }
  } else {
    ['pm-name','pm-price','pm-old','pm-desc','pm-icon','pm-badge'].forEach(id => setVal(id, ''));
    setVal('pm-cat', 'java');
    setVal('pm-stock', '10');
  }

  openModal('product');
}

function editProduct(id) { openProductModal(id); }

function saveProduct() {
  const name = val('pm-name'), price = parseInt(val('pm-price'));
  if (!name || !price) { toast('نام و قیمت الزامی هستند'); return; }

  const data = {
    name,
    cat: val('pm-cat'),
    price,
    oldPrice: parseInt(val('pm-old')) || null,
    desc: val('pm-desc'),
    icon: val('pm-icon') || '🎮',
    badge: val('pm-badge'),
    stock: parseInt(val('pm-stock')) || 0,
    active: true
  };

  if (editingProductId) {
    const idx = STATE.products.findIndex(x => x.id === editingProductId);
    if (idx > -1) STATE.products[idx] = { ...STATE.products[idx], ...data };
  } else {
    data.id = nextId('product');
    STATE.products.push(data);
  }

  saveState();
  closeAllModals();
  renderAdminProducts();
  renderHomePage();
  toast(editingProductId ? 'محصول ویرایش شد' : 'محصول اضافه شد');
}

function deleteProduct(id) {
  if (!confirm('حذف این محصول؟')) return;
  STATE.products = STATE.products.filter(x => x.id !== id);
  saveState();
  renderAdminProducts();
  toast('محصول حذف شد');
}

// ──────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────
function saveCardInfo() {
  STATE.settings.cardNumber = val('card-number-input');
  STATE.settings.cardOwner = val('card-owner-input');
  saveState();
  toast('اطلاعات کارت ذخیره شد');
}

function changeAdminPass() {
  const np = val('new-admin-pass');
  if (np.length < 4) { toast('رمز باید حداقل ۴ کاراکتر باشد'); return; }
  STATE.settings.adminPass = np;
  saveState();
  setVal('new-admin-pass', '');
  toast('رمز ادمین تغییر کرد');
}

// ──────────────────────────────────────────────
// MODALS
// ──────────────────────────────────────────────
function openModal(name) {
  document.getElementById('modal-backdrop').classList.add('open');
  document.getElementById('modal-' + name).classList.add('open');
}

function closeAllModals() {
  document.getElementById('modal-backdrop').classList.remove('open');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

// prevent backdrop click from closing ticket view with typed text
document.getElementById('modal-backdrop').addEventListener('click', closeAllModals);

// ──────────────────────────────────────────────
// FOOTER MODALS
// ──────────────────────────────────────────────
function openModal(name) {
  document.getElementById('modal-backdrop').classList.add('open');
  document.getElementById('modal-' + name).classList.add('open');
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function val(id) { return (document.getElementById(id)?.value || '').trim(); }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function clear(id) { setVal(id, ''); }
function showErr(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }

function fmtPrice(n) {
  return new Intl.NumberFormat('fa-IR').format(n) + ' ت';
}

function today() {
  return new Date().toLocaleDateString('fa-IR');
}

function timeNow() {
  return new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function copyText(txt) {
  navigator.clipboard.writeText(txt).then(() => toast('کپی شد')).catch(() => toast('کپی نشد'));
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
