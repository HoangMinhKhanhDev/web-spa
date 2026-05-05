/**
 * Thảnh Thơi Farm – Shared JavaScript
 * API integration, Cart state, header/footer renderer, exit-intent popup
 * 
 * PHASE 4: Intentional & Behavioral UI (CRO Optimized)
 */

/* ═══════════════════════════════════════
   INTENTIONAL DESIGN TOKENS
   Inject vào <head> NGAY LẬP TỨC để tránh FOUC
   ═══════════════════════════════════════ */
const DESIGN_TOKENS = `
  @font-face { font-display: swap; }
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');
  
  :root {
    --clr-mint: hsl(158, 39%, 52%);
    --clr-mint-dark: hsl(158, 39%, 38%);
    --clr-sage: hsl(158, 25%, 18%);
    --clr-gold: hsl(45, 35%, 60%);
    --clr-cream: hsl(45, 40%, 97%);
    --clr-canvas: var(--clr-cream);
    --clr-ink: hsl(158, 25%, 12%);
    
    --font-serif: 'Playfair Display', serif;
    --font-sans: 'Outfit', sans-serif;
    
    --glass-bg: rgba(255, 255, 255, 0.4);
    --glass-border: rgba(255, 255, 255, 0.4);
    --glass-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.05);
    
    --shadow-premium: 0 40px 80px -15px rgba(0, 0, 0, 0.08);
    --shadow-soft: 0 10px 40px rgba(0, 0, 0, 0.02);
  }

  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { font-family: var(--font-sans); background: var(--clr-canvas); color: var(--clr-ink); line-height: 1.7; font-weight: 300; }
  
  /* Premium CTA */
  .btn-cta { 
    background: var(--clr-ink); color: #fff; font-weight: 600; border-radius: 100px; padding: 20px 40px;
    transition: all .5s cubic-bezier(0.16, 1, 0.3, 1); text-transform: uppercase; letter-spacing: 0.2em; font-size: 11px;
    display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 54px;
    position: relative; overflow: hidden;
  }
  .btn-cta::before { content: ''; position: absolute; inset: 0; background: var(--clr-mint); transform: translateX(-101%); transition: transform .5s cubic-bezier(0.16, 1, 0.3, 1); z-index: -1; }
  .btn-cta:hover { color: #fff; letter-spacing: 0.25em; box-shadow: var(--shadow-premium); }
  .btn-cta:hover::before { transform: translateX(0); }
  .btn-cta:active { transform: scale(0.98); }

  .glass-card { background: var(--glass-bg); backdrop-filter: blur(24px) saturate(180%); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); }
  
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fadeUp { animation: fadeUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
  
  /* SKELETON UI */
  .skeleton { background: #eee; background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%); border-radius: 5px; background-size: 200% 100%; animation: 1.5s shine linear infinite; }
  @keyframes shine { to { background-position-x: -200%; } }
  
  /* TOAST SYSTEM */
  #toast-container { position: fixed; top: 2rem; right: 2rem; z-index: 9999; display: flex; flex-direction: column; gap: 1rem; pointer-events: none; }
  .toast { 
    pointer-events: auto; padding: 1rem 2rem; border-radius: 1rem; background: var(--clr-ink); color: white; 
    font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 1rem; 
    box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: toastIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes toastIn { from { transform: translateX(100%) scale(0.9); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
  .toast-success { border-left: 4px solid var(--clr-mint); }
  .toast-error { border-left: 4px solid #ef4444; }
  
  /* LOADING BAR */
  #loading-bar { position: fixed; top: 0; left: 0; height: 3px; background: var(--clr-mint); z-index: 10000; transition: width 0.3s ease; width: 0; }
`;

function injectGlobalStyles() {
  if (document.getElementById('thanhthoi-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'thanhthoi-global-styles';
  style.textContent = DESIGN_TOKENS;
  (document.head || document.documentElement).appendChild(style);
  
  // Init Toast Container
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  
  // Init Loading Bar
  if (!document.getElementById('loading-bar')) {
    const bar = document.createElement('div');
    bar.id = 'loading-bar';
    document.body.appendChild(bar);
  }
}

injectGlobalStyles();

/**
 * UI UTILS: TOAST & SKELETON
 */
const Toast = {
  show(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-5 h-5 ${type === 'success' ? 'text-mint' : 'text-red-500'}"></i>
      <span>${msg}</span>
    `;
    container.appendChild(t);
    if(window.lucide) lucide.createIcons();
    
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(100%)';
      t.style.transition = 'all 0.5s ease';
      setTimeout(() => t.remove(), 500);
    }, 4000);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); }
};

const Skeleton = {
  rect(w = '100%', h = '20px', r = '8px') {
    return `<div class="skeleton" style="width:${w}; height:${h}; border-radius:${r};"></div>`;
  },
  productCard() {
    return `
      <div class="space-y-6">
        <div class="skeleton aspect-[4/5] rounded-[48px]"></div>
        <div class="space-y-3 px-4">
          <center>${this.rect('40%', '12px')}</center>
          <center>${this.rect('80%', '24px')}</center>
          <center>${this.rect('60%', '16px')}</center>
        </div>
      </div>
    `;
  }
};

const LoadingBar = {
  start() { document.getElementById('loading-bar').style.width = '30%'; },
  done() { 
    document.getElementById('loading-bar').style.width = '100%';
    setTimeout(() => { document.getElementById('loading-bar').style.width = '0'; }, 300);
  }
};

/* ═══════════════════════════════════════
   SHARED HEADER & BOTTOM NAV
   ═══════════════════════════════════════ */
function renderHeader(activePage = '') {
  injectGlobalStyles();
  const user = Auth.user;
  const pages = [
    { href: 'index.html', label: 'Trang Chủ', icon: 'home' },
    { href: 'products.html', label: 'Bộ Sưu Tập', icon: 'book-open' },
    { href: 'blog.html', label: 'Blog Kiến Thức', icon: 'edit-3' },
    { href: 'consultation.html', label: 'Tư Vấn', icon: 'message-circle' },
  ];

   const html = `

  <header id="site-header" class="fixed top-4 md:top-8 left-0 right-0 z-[100] transition-all duration-700">
    <div class="max-w-6xl mx-auto px-4 md:px-6">
      <div class="glass-card floating-pill px-6 md:px-10 py-3 md:py-5 flex items-center justify-between border border-white/50 shadow-premium rounded-full">
        <a href="index.html" class="flex items-center gap-2 md:gap-3 group shrink-0">
          <span class="w-8 h-8 md:w-10 md:h-10 bg-sage text-cream rounded-full flex items-center justify-center font-serif italic text-lg md:text-xl group-hover:bg-mint transition-all duration-500">T</span>
          <span class="font-serif text-xl md:text-2xl font-bold tracking-tight uppercase group-hover:text-mint transition-colors">Thảnh Thơi</span>
        </a>
        
        <nav class="hidden lg:flex items-center gap-12">
          ${pages.map(p => `
            <a href="${p.href}" class="relative group py-2">
              <span class="text-[10px] uppercase tracking-[0.4em] font-bold ${activePage === p.href ? 'text-sage' : 'text-gray-400 hover:text-sage'} transition-colors">${p.label}</span>
              <span class="absolute -bottom-1 left-0 w-full h-0.5 bg-mint scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left ${activePage === p.href ? 'scale-x-100' : ''}"></span>
            </a>
          `).join('')}
        </nav>

        <div class="flex items-center gap-4 md:gap-6">
          <button onclick="toggleSearch()" class="p-1.5 md:p-2 text-sage hover:text-mint transition-colors focus:outline-none"><i data-lucide="search" class="w-5 h-5"></i></button>
          <a href="wishlist.html" class="hidden sm:inline-block p-1.5 md:p-2 text-sage hover:text-rose transition-colors focus:outline-none relative">
            <i data-lucide="heart" class="w-5 h-5"></i>
          </a>
          <button onclick="Cart.toggle()" class="p-1.5 md:p-2 text-sage hover:text-mint transition-colors focus:outline-none relative">
            <i data-lucide="shopping-cart" class="w-5 h-5"></i>
            <span id="cart-badge" class="absolute top-0 right-0 w-4 h-4 bg-mint text-white text-[8px] font-bold flex items-center justify-center rounded-full opacity-0 scale-0 transition-all duration-300">0</span>
          </button>
          ${user?.isAdmin ? `<a href="admin.html" class="hidden sm:inline-block text-[10px] font-bold text-sage bg-cream border border-sage/10 px-4 py-2 rounded-full hover:bg-mint hover:text-white transition-all">ADMIN</a>` : ''}
          <a href="${user ? 'account.html' : 'auth.html'}" class="hidden sm:inline-block p-1.5 md:p-2 text-sage hover:text-mint transition-colors focus:outline-none">${user ? `<span class="w-2 h-2 bg-mint rounded-full block animate-pulse"></span>` : `<i data-lucide="user" class="w-5 h-5"></i>`}</a>
          <a href="consultation.html" class="hidden sm:inline-block text-[10px] font-bold text-cream bg-sage border border-sage/10 px-6 py-2.5 rounded-full hover:bg-mint hover:text-white transition-all tracking-widest uppercase shadow-sm">Tư Vấn Ngay</a>
        </div>
      </div>
    </div>
  </header>

  <!-- Mobile Bottom Nav -->
  <nav class="lg:hidden fixed bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6 glass-card px-4 md:px-8 py-4 flex items-center justify-around z-[200] rounded-full shadow-premium border border-white/50">
    ${pages.concat({href: user ? 'account.html' : 'auth.html', label:'Me', icon:'user'}).map(p => `
        <a href="${p.href}" class="mobile-nav-item flex flex-col items-center ${activePage === p.href ? 'text-mint' : 'text-sage/60'}">
            <i data-lucide="${p.icon}" class="w-5 h-5 md:w-6 md:h-6 mb-1"></i>
            <span class="text-[8px] font-bold uppercase tracking-widest">${p.label}</span>
        </a>
    `).join('')}
  </nav>

  <!-- Cart Drawer -->

  <div id="cart-drawer" class="fixed inset-0 z-[300] invisible">
    <div id="cart-overlay" class="absolute inset-0 bg-sage/20 backdrop-blur-md opacity-0 transition-opacity duration-700" onclick="Cart.toggle()"></div>
    <div id="cart-content" class="absolute lg:top-0 lg:right-0 lg:h-full lg:w-[480px] bottom-0 left-0 w-full h-[85vh] lg:h-full bg-cream lg:translate-x-full translate-y-full lg:translate-y-0 transition-all duration-700 rounded-t-[40px] lg:rounded-none flex flex-col p-12 shadow-2xl">
        <div class="flex justify-between items-center mb-12">
            <div>
              <h2 class="font-serif text-4xl italic text-sage mb-2">Giỏ hàng</h2>
              <p class="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Thảnh Thơi Farm • Zen Shopping</p>
            </div>
            <button onclick="Cart.toggle()" class="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-soft hover:bg-mint hover:text-white transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div id="cart-items-list" class="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar"></div>
        <div id="cart-footer" class="pt-10 border-t border-sage/5 hidden">
            <div class="flex justify-between items-end mb-10">
                <div>
                  <span class="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-bold block mb-1">Tổng cộng</span>
                  <span class="text-xs text-mint font-bold italic">Bao gồm VAT & 1 quà tặng bất kỳ</span>
                </div>
                <span id="cart-total" class="font-serif text-4xl italic text-sage">0₫</span>
            </div>
            <a href="checkout.html" class="btn-cta w-full py-6 text-sm">THANH TOÁN AN YÊN</a>
        </div>
    </div>
  </div>

  <!-- Search Modal -->
  <div id="search-modal" class="fixed inset-0 z-[400] hidden items-center justify-center p-6 backdrop-blur-3xl bg-sage/30">
    <div class="w-full max-w-3xl bg-cream rounded-[48px] p-16 shadow-premium animate-fadeUp border border-white/50">
      <div class="flex items-center gap-6 border-b-2 border-sage/10 pb-6 mb-10 focus-within:border-mint transition-colors">
        <i data-lucide="search" class="w-8 h-8 text-gray-300"></i>
        <input type="text" id="global-search" placeholder="Hôm nay bạn muốn tìm thảo mộc gì?..." class="w-full bg-transparent border-none text-3xl font-serif italic outline-none text-sage placeholder:text-gray-300" />
      </div>
      <div class="flex flex-wrap gap-4">
        <span class="text-[9px] uppercase font-bold tracking-widest text-gray-400 w-full mb-2">Gợi ý tìm kiếm:</span>
        <button class="px-5 py-2 rounded-full border border-sage/10 text-[10px] font-bold uppercase tracking-widest hover:bg-mint hover:text-white transition-all">Sữa tắm tía tô</button>
        <button class="px-5 py-2 rounded-full border border-sage/10 text-[10px] font-bold uppercase tracking-widest hover:bg-mint hover:text-white transition-all">Dầu gội bồ kết</button>
        <button class="px-5 py-2 rounded-full border border-sage/10 text-[10px] font-bold uppercase tracking-widest hover:bg-mint hover:text-white transition-all">Serum sáng da</button>
      </div>
      <button onclick="toggleSearch()" class="mt-12 text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em] hover:text-sage transition-colors flex items-center gap-2">ĐÓNG CỬA SỔ <i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('afterbegin', html);
  updateCartBadge();
  document.addEventListener('cart:updated', updateCartBadge);
  
  const header = document.getElementById('site-header');
  const innerPill = header.querySelector('.floating-pill');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      innerPill.classList.add('scrolled', 'shadow-2xl');
      innerPill.classList.remove('md:px-10', 'md:py-5');
      innerPill.classList.add('md:px-8', 'md:py-3');
      header.classList.remove('md:top-8');
      header.classList.add('md:top-4');
    } else {
      innerPill.classList.remove('scrolled', 'shadow-2xl');
      innerPill.classList.add('md:px-10', 'md:py-5');
      innerPill.classList.remove('md:px-8', 'md:py-3');
      header.classList.add('md:top-8');
      header.classList.remove('md:top-4');
    }
  });


  if(window.lucide) lucide.createIcons();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = Cart.count();
  badge.textContent = count;
  if (count > 0) {
    badge.classList.remove('opacity-0', 'scale-0');
    badge.classList.add('opacity-100', 'scale-100');
  } else {
    badge.classList.add('opacity-0', 'scale-0');
    badge.classList.remove('opacity-100', 'scale-100');
  }
}


function toggleSearch() {
  const modal = document.getElementById('search-modal');
  modal.classList.toggle('hidden'); modal.classList.toggle('flex');
  if(!modal.classList.contains('hidden')) {
    const input = document.getElementById('global-search');
    input.focus();
    input.onkeypress = (e) => {
      if(e.key === 'Enter' && input.value.trim()) {
        window.location.href = `products.html?search=${encodeURIComponent(input.value.trim())}`;
      }
    };
  }
}

/* ═══════════════════════════════════════
   SHARED FOOTER
   ═══════════════════════════════════════ */
function renderFooter() {
  const html = `
  <footer class="bg-ink text-gray-400 pt-32 pb-40 lg:pb-16 mt-auto">
    <div class="max-w-7xl mx-auto px-8 text-center space-y-6">
      <div class="flex flex-wrap justify-center gap-x-12 gap-y-4 mb-8">
        <a href="index.html" class="text-[10px] font-bold uppercase tracking-widest hover:text-mint transition-colors">Trang Chủ</a>
        <a href="products.html" class="text-[10px] font-bold uppercase tracking-widest hover:text-mint transition-colors">Bộ Sưu Tập</a>
        <a href="consultation.html" class="text-[10px] font-bold uppercase tracking-widest hover:text-mint transition-colors">Tư Vấn</a>
        <a href="admin.html" class="text-[10px] font-bold uppercase tracking-widest text-gold hover:text-white transition-colors">Quản trị viên (Admin)</a>
      </div>
      <div class="space-y-3">
        <p class="text-[10px] uppercase font-bold tracking-[0.4em]">© 2026 Thảnh Thơi Farm • Hóa Mỹ Phẩm Thiên Nhiên</p>
        <p class="text-[9px] tracking-widest text-gray-600">300+ Sản phẩm • 100% Thiên Nhiên • Không Paraben • Không Hóa Chất Độc Hại</p>
      </div>
    </div>
  </footer>`;
  document.body.insertAdjacentHTML('beforeend', html);
}


function initExitIntent() { /* Simplified or hidden for professional UX */ }
