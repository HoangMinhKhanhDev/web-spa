/* ═══════════════════════════════════════
   CART STATE
   ═══════════════════════════════════════ */
const Cart = {
  _key: 'thanhthoi_cart',
  get items() { try { return JSON.parse(localStorage.getItem(this._key)) || []; } catch { return []; } },
  save(items) { 
    localStorage.setItem(this._key, JSON.stringify(items));
    this._notify();
  },
  count() { return this.items.reduce((s, i) => s + i.qty, 0); },
  add(product) {
    const items = this.items;
    const ex = items.find(i => i.id === product.id);
    if (ex) ex.qty++; else items.push({ ...product, qty: 1 });
    this.save(items);
    if(typeof Toast !== 'undefined') Toast.success(`Đã thêm ${product.name} vào giỏ.`);
  },
  remove(id) { this.save(this.items.filter(i => i.id !== id)); },
  update(id, qty) {
    const items = this.items;
    const item = items.find(i => i.id === id);
    if (item) { item.qty = Math.max(1, qty); this.save(items); }
  },
  total() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); },
  _notify() { document.dispatchEvent(new CustomEvent('cart:updated')); },
  
  toggle() {
    const drawer = document.getElementById('cart-drawer');
    if(drawer) {
        drawer.classList.toggle('invisible');
        const overlay = document.getElementById('cart-overlay');
        const content = document.getElementById('cart-content');
        if(overlay) { overlay.classList.toggle('opacity-0'); overlay.classList.toggle('opacity-100'); }
        if(content) {
            // Mobile-first bottom sheet logic
            if(window.innerWidth < 1024) {
                content.classList.toggle('translate-y-full'); content.classList.toggle('translate-y-0');
            } else {
                content.classList.toggle('translate-x-full'); content.classList.toggle('translate-x-0');
            }
        }
        if(!drawer.classList.contains('invisible')) this.render();
    }
  },

  render() {
    const container = document.getElementById('cart-items-list');
    if(!container) return;
    if(!this.items.length) {
        container.innerHTML = '<div class="py-20 text-center opacity-30 italic">Giỏ hàng trống...</div>';
        const footer = document.getElementById('cart-footer');
        if(footer) footer.classList.add('hidden');
        return;
    }
    const footer = document.getElementById('cart-footer');
    if(footer) footer.classList.remove('hidden');
    container.innerHTML = this.items.map(i => `
        <div class="flex gap-6 py-6 border-b border-black/5 animate-fadeUp">
            <div class="w-20 h-24 rounded-xl bg-canvas overflow-hidden">
                <img src="${i.image || 'assets/product_bottle_minimalist_1773483664308.png'}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 space-y-1">
                <h4 class="font-bold text-sm line-clamp-1">${i.name}</h4>
                <p class="text-xs text-rose font-bold">${i.price.toLocaleString()}₫</p>
                <div class="flex items-center gap-4 pt-2">
                    <button onclick="Cart.update(${i.id}, ${i.qty-1})" class="p-1 hover:text-rose"><i data-lucide="minus" class="w-3 h-3"></i></button>
                    <span class="text-xs font-bold">${i.qty}</span>
                    <button onclick="Cart.update(${i.id}, ${i.qty+1})" class="p-1 hover:text-rose"><i data-lucide="plus" class="w-3 h-3"></i></button>
                </div>
            </div>
            <button onclick="Cart.remove(${i.id})" class="p-2 text-gray-300 hover:text-rose"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    `).join('');
    const totalEl = document.getElementById('cart-total');
    if(totalEl) totalEl.textContent = this.total().toLocaleString() + '₫';
    if(window.lucide) window.lucide.createIcons();
  }
};
