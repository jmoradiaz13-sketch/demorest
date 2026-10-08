import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pos',
  template: `
    <div class="pos-toolbar">
      <button class="btn-mesas" (click)="volverMesas()">← Mesas</button>
      <span class="pos-context" *ngIf="selectedTable !== null">
        {{ selectedTable === 0 ? '🛍️ Para llevar' : '🪑 Mesa ' + selectedTable }}
        <span *ngIf="isTableOccupied()" class="badge badge-cyan">Ocupada</span>
        <span *ngIf="borradorActual() > 0" class="badge badge-gold">{{ borradorActual() }} sin comandar</span>
      </span>
    </div>
    <div class="pos-layout">
      <!-- Panel Productos -->
      <div class="pos-products">
        <div class="pos-search" style="display: flex; gap: 0.5rem; align-items: center; position: relative;">
          <input class="form-input" placeholder="🔍 Buscar producto o escanear código..."
                 [(ngModel)]="searchTerm" (input)="filterProducts()" #searchInput style="flex: 1;">

        </div>
        <div class="pos-categories">
          <button class="cat-btn" [class.active]="!selectedCategory" (click)="selectedCategory='';filterProducts()">Todos</button>
          <button class="cat-btn" *ngFor="let c of categories" [class.active]="selectedCategory === c._id"
                  (click)="selectedCategory = c._id; filterProducts()">{{ c.icon }} {{ c.name }}</button>
        </div>
        <div class="product-grid">
          <div class="product-tile neon-card" *ngFor="let p of filteredProducts" (click)="addToCart(p)"
               style="padding:0.75rem;cursor:pointer;animation:none">
            <div class="product-tile-name">{{ p.name }}</div>
            <div class="flex-between">
              <span class="product-tile-price">\${{ p.price | number:'1.0-0' }}</span>
              <span class="badge" [class]="p.isAvailable ? 'badge-green' : 'badge-red'">{{ p.isAvailable ? 'Disp' : 'Agot' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel Carrito -->
      <div class="pos-cart neon-card-violet" style="animation:none">
        <h3 style="margin-bottom:1rem">
          🛒 Venta Actual
          <span *ngIf="selectedTable === 0" class="badge badge-gold" style="float: right;">🛍️ Para llevar</span>
          <span *ngIf="selectedTable !== null && selectedTable !== 0" class="badge badge-cyan" style="float: right;">Mesa {{ selectedTable }}</span>
        </h3>
        <!-- Mesa ocupada: venta actual donde se agregan productos para comandar -->
        <div class="cart-items" *ngIf="isTableOccupied()">
          <div class="cart-item" *ngFor="let item of ventaItems">
            <div class="cart-item-info">
              <span class="cart-item-name">{{ item.productName }}</span>
              <span class="cart-item-price">\${{ item.unitPrice | number:'1.0-0' }} c/u</span>
            </div>
            <div class="cart-item-controls">
              <span class="qty-display">× {{ item.quantity }}</span>
              <span class="cart-item-subtotal">\${{ item.subtotal | number:'1.0-0' }}</span>
            </div>
          </div>
          <div class="cart-item" *ngFor="let item of cart; let i = index">
            <div class="cart-item-info">
              <span class="cart-item-name">{{ item.productName }}</span>
              <span class="cart-item-price">\${{ item.unitPrice | number:'1.0-0' }} c/u</span>
            </div>
            <div class="cart-item-controls">
              <button class="qty-btn" (click)="changeQty(i, -1)" aria-label="Reducir cantidad">−</button>
              <span class="qty-display">{{ item.quantity }}</span>
              <button class="qty-btn" (click)="changeQty(i, 1)" aria-label="Aumentar cantidad">+</button>
              <span class="cart-item-subtotal">\${{ item.subtotal | number:'1.0-0' }}</span>
              <button class="btn-ghost btn-sm" (click)="removeItem(i)">✕</button>
            </div>
          </div>
          <div *ngIf="ventaItems.length === 0 && cart.length === 0" style="text-align:center;padding:2rem;color:var(--text-muted)">
            {{ cargandoVenta ? '⏳ Cargando pedido de la mesa...' : 'Agregue productos para comandar' }}
          </div>
        </div>
        <!-- Venta nueva: carrito editable -->
        <div class="cart-items" *ngIf="!isTableOccupied()">
          <div class="cart-item" *ngFor="let item of cart; let i = index">
            <div class="cart-item-info">
              <span class="cart-item-name">{{ item.productName }}</span>
              <span class="cart-item-price">\${{ item.unitPrice | number:'1.0-0' }} c/u</span>
            </div>
            <div class="cart-item-controls">
              <button class="qty-btn" (click)="changeQty(i, -1)" aria-label="Reducir cantidad">−</button>
              <span class="qty-display">{{ item.quantity }}</span>
              <button class="qty-btn" (click)="changeQty(i, 1)" aria-label="Aumentar cantidad">+</button>
              <span class="cart-item-subtotal">\${{ item.subtotal | number:'1.0-0' }}</span>
              <button class="btn-ghost btn-sm" (click)="removeItem(i)">✕</button>
            </div>
          </div>
          <div *ngIf="cart.length === 0" style="text-align:center;padding:2rem;color:var(--text-muted)">
            Agregue productos para empezar
          </div>
        </div>
        <div class="cart-footer">
          <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
            <select class="form-input" [(ngModel)]="selectedTable" (ngModelChange)="onTableChange()" style="flex:1">
              <option [ngValue]="null">🪑 Sin mesa</option>
              <option *ngFor="let t of tables" [ngValue]="t.number">
                {{ t.number === 0 ? '🛍️ Para llevar' : 'Mesa ' + t.number }} {{ (t.status === 'ocupada' || t.isOccupied) ? '(Ocupada)' : '' }}
              </option>
            </select>
          </div>
          <div class="cart-total" style="flex-direction: column; align-items: stretch; gap: 0.25rem;">
            <div style="display:flex; justify-content: space-between; align-items: center;" *ngIf="isTableOccupied()">
              <span>TOTAL ACUMULADO</span>
              <span class="total-amount">\${{ (ventaTotal + total) | number:'1.0-0' }}</span>
            </div>
            <div style="display:flex; justify-content: space-between; align-items: center;" *ngIf="!isTableOccupied()">
              <span>TOTAL</span>
              <span class="total-amount">\${{ total | number:'1.0-0' }}</span>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
            <select class="form-input" [(ngModel)]="paymentMethod" style="flex:1">
              <option value="efectivo">💵 Efectivo</option>
              <option value="tarjeta">💳 Tarjeta / Datáfono</option>
              <option value="transferencia">📱 Transferencia</option>
              <option value="mixto">🔄 Mixto</option>
            </select>
          </div>
          <div class="cart-actions" style="display:flex;gap:0.5rem;margin-top:0.75rem">
            <button class="btn-danger" style="flex:1 1 0;min-width:0" (click)="clearCart()" [disabled]="cart.length === 0">🗑️ Limpiar</button>
            <button class="btn-info" style="flex:1 1 0;min-width:0" (click)="comandar()" [disabled]="comandando || cobrando || cart.length === 0" title="Envía a cocina lo nuevo del carrito">
              {{ comandando ? '⏳' : '🖨️ Comandar' }}
            </button>
            <button class="btn-success" style="flex:1 1 0;min-width:0" (click)="cobrar()" [disabled]="cobrarDisabled()" title="Cobra la cuenta">
              {{ cobrando ? '⏳' : '💵 Cobrar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pos-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; min-width: 0; }
    .pos-toolbar .pos-context { min-width: 0; overflow-wrap: anywhere; }
    .btn-mesas {
      background: linear-gradient(135deg, var(--brand-gold), var(--brand-bronze));
      color: #fff; border: none; border-radius: 8px;
      padding: 0.45rem 1rem; font-size: 0.85rem; font-weight: 700; cursor: pointer;
      box-shadow: 0 2px 8px rgba(212, 175, 55, 0.35); transition: all 0.15s;
    }
    .btn-mesas:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212, 175, 55, 0.5); }
    .pos-context { font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
    .pos-layout { display: grid; grid-template-columns: 1fr 360px; gap: 1rem; min-height: calc(100vh - 100px); }
    .pos-search { margin-bottom: 0.75rem; }
    .pos-categories {
      display: flex; gap: 0.375rem; flex-wrap: wrap; padding-bottom: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .cat-btn {
      padding: 0.375rem 0.75rem; border-radius: 20px; border: 1px solid var(--bg-input);
      background: #fff; font-size: 0.75rem; white-space: nowrap; cursor: pointer;
      transition: all 0.15s;
    }
    .cat-btn.active { background: var(--brand-gold); color: #fff; border-color: var(--brand-gold); }
    .product-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem;
      max-height: calc(100vh - 240px); overflow-y: auto;
    }
    .product-tile:hover { transform: translateY(-2px); border-color: var(--brand-gold); }
    .product-tile { min-width: 0; }
    .product-tile-name { font-size: 0.82rem; font-weight: 600; margin-bottom: 0.375rem; line-height: 1.3; min-width: 0; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .product-tile-price { font-family: 'Outfit'; font-weight: 700; color: var(--brand-bronze); }
    .pos-cart { display: flex; flex-direction: column; position: sticky; top: 76px; max-height: calc(100vh - 100px); }
    .cart-items { flex: 1; overflow-y: auto; }
    .cart-item {
      padding: 0.6rem 0; border-bottom: 1px solid var(--bg-input);
    }
    .cart-item-info { display: flex; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; min-width: 0; }
    .cart-item-name { font-size: 0.82rem; font-weight: 600; flex: 1; min-width: 0; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
    .cart-item-price { font-size: 0.75rem; color: var(--text-secondary); flex-shrink: 0; }
    .cart-item-controls { display: flex; align-items: center; gap: 0.5rem; }
    .qty-btn {
      width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--bg-input);
      background: #fff; font-weight: 700; cursor: pointer; font-size: 1rem;
      display: flex; align-items: center; justify-content: center;
    }
    .qty-display { font-weight: 700; min-width: 20px; text-align: center; }
    .cart-item-subtotal { font-family: 'Outfit'; font-weight: 700; margin-left: auto; }
    .cart-total {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 0.75rem; border-top: 2px solid var(--brand-bronze);
      font-weight: 700;
    }
    .total-amount {
      font-family: 'Outfit'; font-size: 1.5rem;
      color: var(--brand-gold);
    }
    .badge-gold { background: rgba(212, 175, 55, 0.2); color: var(--brand-gold); border: 1px solid var(--brand-gold); }
    .cart-actions .btn-danger, .cart-actions .btn-info, .cart-actions .btn-success {
      min-width: 0; padding: 0.55rem 0.35rem; font-size: 0.8rem;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    @media (max-width: 768px) {
      .pos-layout { grid-template-columns: 1fr; min-width: 0; }
      .pos-cart { position: relative; top: 0; max-height: none; }
      .product-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); max-height: 50vh; }
      .pos-toolbar { gap: 0.5rem; }
      .pos-context { font-size: 0.82rem; width: 100%; }
      .cart-item-controls { flex-wrap: wrap; row-gap: 0.35rem; }
      .cart-item-info { min-width: 0; gap: 0.5rem; }
      .cart-item-name { min-width: 0; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
    }
    @media (max-width: 480px) {
      .product-grid { grid-template-columns: repeat(2, 1fr); }
      .product-tile-name { font-size: 0.78rem; }
      .cart-footer > div[style] { flex-wrap: wrap !important; }
      .total-amount { font-size: 1.25rem; }
    }
  `]
})
export class PosComponent implements OnInit, OnDestroy {
  products: any[] = [];
  filteredProducts: any[] = [];
  cart: any[] = [];
  categories = [
    { _id: 'Entradas', name: 'Entradas', icon: '🥗' },
    { _id: 'Sopas', name: 'Sopas', icon: '🥣' },
    { _id: 'Platos fuertes', name: 'Platos fuertes', icon: '🍲' },
    { _id: 'Platos a la carta', name: 'Platos a la carta', icon: '🍽️' },
    { _id: 'Postres', name: 'Postres', icon: '🍰' },
    { _id: 'Bebidas', name: 'Bebidas', icon: '🥤' },
    { _id: 'Cócteles', name: 'Cócteles', icon: '🍹' }
  ];
  searchTerm = '';
  selectedCategory = '';
  paymentMethod = 'efectivo';
  comandando = false;
  cobrando = false;
  // Compat: antes un solo flag; ahora el reloj va solo en el botón de la acción en curso.
  get processing(): boolean { return this.comandando || this.cobrando; }
  tables: any[] = [];
  selectedTable: number | null = null;
  reservaId: string | null = null;
  settings: any = null;
  ventaActual: any = null;
  cargandoVenta = false;
  private subParams: Subscription | null = null;

  get total(): number {
    return this.cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  get ventaTotal(): number {
    return this.ventaActual?.total ?? this.getSelectedTableObj()?.currentSale?.total ?? 0;
  }

  get ventaItems(): any[] {
    const items: any[] = [];
    if (this.ventaActual?.items) {
      this.ventaActual.items.forEach((i: any) => items.push({
        productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice,
        subtotal: i.subtotal
      }));
    }
    if (this.ventaActual?.dishItems) {
      this.ventaActual.dishItems.forEach((i: any) => items.push({
        productName: i.dishName, quantity: i.quantity, unitPrice: i.unitPrice,
        subtotal: i.subtotal
      }));
    }
    return items;
  }

  nombreMesa(n: number | null): string {
    return n === 0 ? 'Para llevar' : n !== null && n !== undefined ? `Mesa ${n}` : 'Mostrador';
  }

  getSelectedTableObj(): any {
    return this.tables.find(t => t.number === this.selectedTable);
  }

  isTableOccupied(): boolean {
    const t = this.getSelectedTableObj();
    if (!t) return false;
    // La mesa reservada actúa como cualquier otra: acepta pedidos igual.
    // Ocupada por estado o por venta abierta (respaldo ante todo backend)
    return t.status === 'ocupada' || t.status === 'reservada' || t.isOccupied || !!t.currentSale;
  }

  // Todo pedido con mesa (incluido Para llevar) trabaja post-pago:
  // la primera comandada abre la venta pendiente.
  get esAperturaMesa(): boolean {
    return !this.isTableOccupied() && this.selectedTable !== null;
  }

  // —— Tandas: cada línea recuerda cuánto ya se comandó (impreso) ————————
  // Cada impresión solo saca lo nuevo (cantidad actual − cantidad impresa).
  // Así ninguna impresión repite un producto ya comandado.
  pendienteQty(item: any): number {
    return item.quantity - (item.impresoQty || 0);
  }

  get pendientesComanda(): any[] {
    return this.cart.filter(i => this.pendienteQty(i) > 0);
  }

  // Convierte líneas del carrito a líneas imprimibles (solo el delta no comandado)
  soloNuevos(items: any[]): any[] {
    return items
      .filter(i => this.pendienteQty(i) > 0)
      .map(i => ({ ...i, quantity: this.pendienteQty(i), subtotal: this.pendienteQty(i) * i.unitPrice }));
  }

  marcarComandado(items: any[]): void {
    items.forEach(i => { i.impresoQty = i.quantity; });
    this.persistirBorradores();
  }

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  // —— Borradores independientes por mesa (trabajo en paralelo) ——————————
  // Cada mesa conserva sus productos sin comandar al cambiar de mesa o recargar.
  // Se limpian al cobrar, anular o liberar la mesa.
  private readonly DRAFTS_KEY = 'pos-borradores';
  borradores: Record<string, any[]> = {};
  private claveActual = 'mostrador';

  private mesaKey(n: number | null): string {
    return n === null || n === undefined ? 'mostrador' : String(n);
  }

  private cargarBorradores(): void {
    try {
      const raw = localStorage.getItem(this.DRAFTS_KEY);
      if (raw) this.borradores = JSON.parse(raw) || {};
    } catch { this.borradores = {}; }
  }

  private persistirBorradores(): void {
    try {
      localStorage.setItem(this.DRAFTS_KEY, JSON.stringify(this.borradores));
    } catch { /* almacenamiento no disponible */ }
  }

  private limpiarBorradorMesa(): void {
    delete this.borradores[this.claveActual];
    this.persistirBorradores();
  }

  aplicarMesa(): void {
    // Guarda el borrador de la mesa anterior
    this.borradores[this.claveActual] = this.cart;
    this.persistirBorradores();
    // Carga el borrador de la mesa nueva
    this.claveActual = this.mesaKey(this.selectedTable);
    this.cart = this.borradores[this.claveActual] || [];
    this.borradores[this.claveActual] = this.cart;
    this.loadVentaActual();
  }

  borradorActual(): number {
    return this.pendientesComanda.length;
  }

  volverMesas(): void {
    this.borradores[this.claveActual] = this.cart;
    this.persistirBorradores();
    this.router.navigate(['/mesas']);
  }

  ngOnInit(): void {
    this.cargarBorradores();
    this.api.getDishes().subscribe({
      next: (res: any) => { 
        this.products = res.filter((p: any) => p.isAvailable !== false); 
        this.filteredProducts = [...this.products]; 
      }
    });
    this.api.getTables().subscribe({
      next: (res: any) => { this.tables = res; this.loadVentaActual(); }
    });
    this.api.getSettings().subscribe({
      next: (res: any) => this.settings = res
    });

    // Una sola suscripción aunque ngOnInit se llame manual (evita duplicar aplicarMesa).
    this.suscribirParams();
  }

  private suscribirParams(): void {
    if (this.subParams) return;
    this.subParams = this.route.queryParams.subscribe(params => {
      if (params['table'] !== undefined) {
        this.selectedTable = parseInt(params['table'], 10);
      }
      this.reservaId = params['reserva'] || null;
      this.aplicarMesa();
    });
  }

  ngOnDestroy(): void {
    this.subParams?.unsubscribe();
    this.subParams = null;
  }

  onTableChange(): void {
    // Cambio manual de mesa: la reserva de la URL ya no aplica.
    this.reservaId = null;
    this.aplicarMesa();
  }

  loadVentaActual(reintentar = true): void {
    const t = this.getSelectedTableObj();
    // Mesas aún sin cargar: no borrar lo que haya, solo esperar a getTables.
    if (!t) return;
    const saleRef = t?.currentSale;
    const saleId = saleRef?._id || saleRef;
    if ((t.status === 'ocupada' || t.status === 'reservada' || t.isOccupied) && saleId && typeof saleId === 'string') {
      this.cargandoVenta = true;
      this.api.getSale(saleId).subscribe({
        next: (res: any) => { this.ventaActual = res; this.cargandoVenta = false; },
        error: () => {
          // Render puede fallar/tardar al despertar: un reintento antes de rendirse.
          if (reintentar) {
            setTimeout(() => this.loadVentaActual(false), 2000);
          } else {
            this.ventaActual = null;
            this.cargandoVenta = false;
          }
        }
      });
    } else {
      this.ventaActual = null;
      this.cargandoVenta = false;
    }
  }

  @HostListener('document:click')
  onDocumentClick() {}

  normalizeString(str: string): string {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
  }

  filterProducts(): void {
    const searchTerms = this.normalizeString(this.searchTerm).split(' ').filter(t => t.length > 0);
    
    this.filteredProducts = this.products.filter(p => {
      const pName = this.normalizeString(p.name);
      
      const matchSearch = searchTerms.length === 0 || searchTerms.every(term => 
        pName.includes(term)
      );

      const matchCat = !this.selectedCategory || p.category === this.selectedCategory;

      return matchSearch && matchCat;
    });
  }

  addToCart(product: any): void {
    if (!product.isAvailable) return;
    const existing = this.cart.find(i => i.product === product._id);
    if (existing) {
      existing.quantity++;
      existing.subtotal = existing.quantity * existing.unitPrice;
    } else {
      this.cart.push({
        product: product._id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        subtotal: product.price,
        impresoQty: 0
      });
    }
    this.persistirBorradores();
  }

  changeQty(index: number, delta: number): void {
    const item = this.cart[index];
    item.quantity += delta;
    if (item.quantity <= 0) { this.cart.splice(index, 1); }
    else { item.subtotal = item.quantity * item.unitPrice; }
    this.persistirBorradores();
  }

  removeItem(index: number): void { this.cart.splice(index, 1); this.persistirBorradores(); }
  clearCart(): void { this.cart = []; this.borradores[this.claveActual] = this.cart; this.persistirBorradores(); }

  printCurrentComanda(): void {
    const nuevos = this.soloNuevos(this.cart);
    if (nuevos.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'ℹ️ Sin nada nuevo',
        text: 'Todo lo del carrito ya fue comandado. Agregue productos nuevos para otra tanda.',
        confirmButtonColor: '#D4AF37'
      });
      return;
    }
    this.printComanda(nuevos, this.selectedTable, 'cocina');
    this.marcarComandado(this.cart);
  }

  // Botonera única: misma fila, tamaño y color en todo momento.
  // Cada botón despacha según el estado (ocupada / apertura / mostrador).
  comandar(): void {
    if (this.isTableOccupied()) {
      this.finalizeSale();
    } else if (this.esAperturaMesa) {
      this.finalizeSale('abrir');
    } else {
      this.printCurrentComanda();
    }
  }

  cobrarDisabled(): boolean {
    if (this.comandando || this.cobrando) return true;
    if (this.isTableOccupied()) return this.cart.length > 0;
    return this.cart.length === 0;
  }

  cobrar(): void {
    if (this.isTableOccupied()) {
      this.payTableSale();
    } else if (this.esAperturaMesa) {
      this.finalizeSale('cobrar', 'cobrar');
    } else {
      this.finalizeSale('abrir', 'cobrar');
    }
  }

  finalizeSale(modo: 'abrir' | 'cobrar' = 'abrir', accion: 'comandar' | 'cobrar' = 'comandar'): void {
    if (accion === 'cobrar') this.cobrando = true;
    else this.comandando = true;
    const payload: any = {
      items: this.cart.map(i => ({ product: i.product, quantity: i.quantity })),
      paymentMethod: this.paymentMethod
    };
    if (this.selectedTable !== null) {
      payload.tableNumber = this.selectedTable;
    }
    if (modo === 'cobrar') {
      payload.pagoInmediato = true;
    }
    
    const t = this.getSelectedTableObj();
    if (t && (t.status === 'ocupada' || t.status === 'reservada' || t.isOccupied) && t.currentSale) {
      // Snapshot del carrito para la comanda antes de limpiarlo (solo productos nuevos)
      const commandaItems = [...this.cart];
      const tableNum = this.selectedTable;
      const saleId = (t.currentSale as any)?._id || t.currentSale;
      this.api.addItemsToSale(saleId, payload).subscribe({
        next: () => {
          this.comandando = false; this.cobrando = false;
          this.cart = [];
          this.completarReservaSiHay();
          this.ngOnInit();
          this.loadVentaActual();
          const nuevos = this.soloNuevos(commandaItems);
          if (nuevos.length > 0) this.printComanda(nuevos, tableNum, 'adicional');
        },
        error: (err: any) => {
          this.comandando = false; this.cobrando = false;
          Swal.fire('❌ Error', err.error?.message || 'Error al agregar ítems', 'error');
        }
      });
    } else {
      const commandaItems = [...this.cart];
      const tableNum = this.selectedTable;
      this.api.createSale(payload).subscribe({
        next: (vendida: any) => {
          this.comandando = false; this.cobrando = false;
          const abreMesa = this.selectedTable !== null && modo === 'abrir';
          this.cart = [];
          // La reserva se completa DESPUÉS de crear la venta para que quede enlazada a la mesa.
          this.completarReservaSiHay();
          this.ngOnInit();
          // Apertura (cocina): solo lo nuevo de la tanda. Factura: todo lo cobrado.
          // Impresión directa, sin diálogos intermedios.
          if (abreMesa) {
            const nuevos = this.soloNuevos(commandaItems);
            if (nuevos.length > 0) this.printComanda(nuevos, tableNum, 'cocina');
          } else {
            this.printComanda(commandaItems, tableNum, 'venta');
          }
        },
        error: (err: any) => {
          this.comandando = false; this.cobrando = false;
          Swal.fire('❌ Error', err.error?.message || 'Error al procesar venta', 'error');
        }
      });
    }
  }

  // Completa la reserva que originó el pedido (si viene ?reserva=) una sola vez.
  // Se llama DESPUÉS de comandar para que la venta quede enlazada a la mesa.
  completarReservaSiHay(): void {
    if (!this.reservaId) return;
    const id = this.reservaId;
    this.reservaId = null;
    this.api.completeReservation(id).subscribe({
      next: () => this.api.getTables().subscribe({
        next: (res: any) => { this.tables = res; this.loadVentaActual(); }
      }),
      error: () => { /* la comandada ya quedó; la reserva se completa manual */ }
    });
  }

  payTableSale(): void {    const t = this.getSelectedTableObj();
    if (!t || !t.currentSale) return;
    const saleId = t.currentSale._id || t.currentSale;
    const items = this.ventaItems;
    const total = this.ventaTotal;
    const filas = items.length > 0
      ? items.map(i => `<tr><td style="padding:3px 4px;">${i.productName}</td><td style="text-align:center;">× ${i.quantity}</td><td style="text-align:right;">$${i.subtotal.toLocaleString('es-CO')}</td></tr>`).join('')
      : '<tr><td colspan="3" style="text-align:center;color:#888;">Sin detalle cargado</td></tr>';

    Swal.fire({
      title: `Cobrar ${this.nombreMesa(t.number)}`,
      html: `
        <div style="text-align:left;font-size:0.85rem">
          <p>Se cobran los productos consumidos por un total de <strong>$${total.toLocaleString('es-CO')}</strong> (${this.paymentMethod}).</p>
          <table style="width:100%;border-collapse:collapse;margin-top:0.5rem">
            <tbody>${filas}</tbody>
          </table>
        </div>`,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: '#D4AF37',
      denyButtonColor: '#2E8B57',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '🖨️ Imprimir factura',
      denyButtonText: '✅ Aceptar y liberar',
      cancelButtonText: 'Volver'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarCobro(t, saleId, true);
      } else if (result.isDenied) {
        this.ejecutarCobro(t, saleId, false);
      }
    });
  }

  private ejecutarCobro(t: any, saleId: string, imprimir: boolean): void {
    this.cobrando = true;
    this.api.paySale(saleId, { paymentMethod: this.paymentMethod }).subscribe({
      next: (res: any) => {
        this.cobrando = false;
        this.selectedTable = null;
        this.ventaActual = null;
        this.limpiarBorradorMesa();
        this.ngOnInit();

        if (!imprimir) return;
        const allItems: any[] = [];
        if (res.items) res.items.forEach((i: any) => allItems.push(i));
        if (res.dishItems) res.dishItems.forEach((i: any) => {
           allItems.push({ productName: i.dishName, quantity: i.quantity, subtotal: i.subtotal });
        });

        if (allItems.length > 0) this.printComanda(allItems, t.number, 'venta');
      },
        error: (err: any) => {
          this.cobrando = false;
          Swal.fire('❌ Error', err.error?.message || 'Error al cobrar la cuenta', 'error');
        }
    });
  }

  printComanda(items: any[], tableNum: number | null, type: string): void {
    const now = new Date();
    const fecha = now.toLocaleDateString('es-CO');
    const hora = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const mesaLabel = tableNum === 0 ? 'Para llevar' : tableNum ? `Mesa ${tableNum}` : 'Mostrador';
    const tipoLabel = type === 'adicional' ? 'COMANDA' : type === 'cocina' ? 'PEDIDO' : 'VENTA';
    const total = items.reduce((s, i) => s + i.subtotal, 0);

    const lineas = items.map(i =>
      `<tr>
        <td style="padding:4px 2px;">${i.productName}</td>
        <td style="text-align:center;padding:4px;">${i.quantity}</td>
        <td style="text-align:right;padding:4px;">$${i.subtotal.toLocaleString('es-CO')}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comanda</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; padding: 8px; }
    .center { text-align: center; }
    .title { font-size: 15px; font-weight: bold; margin: 6px 0; }
    .badge { font-size: 11px; border: 1px solid #000; padding: 2px 8px; border-radius: 4px; display: inline-block; margin: 4px 0; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { border-bottom: 1px solid #000; padding: 3px 2px; font-size: 11px; text-align: left; }
    .total-row td { border-top: 1px dashed #000; font-weight: bold; padding-top: 6px; padding-bottom: 4px; }
    .footer { margin-top: 8px; font-size: 10px; color: #555; }
    @media print { body { width: 100%; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${type === 'venta' ? '🧾 FACTURA' : '🍲 COMANDA'}</div>
    <div class="badge">${tipoLabel}</div>
    ${type === 'adicional' ? '<div style="font-size:10px;margin-top:4px;">Solo lo nuevo de esta tanda — la venta inicial ya fue comandada</div>' : ''}
    <div style="margin-top:4px;"><strong>${mesaLabel}</strong></div>
    <div style="font-size:10px;color:#555;">${fecha} — ${hora}</div>
  </div>
  <div class="divider"></div>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th style="text-align:center;">Cant.</th>
        <th style="text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${lineas}</tbody>
    ${type !== 'cocina' ? `<tfoot><tr class="total-row">
      <td colspan="2">TOTAL</td>
      <td style="text-align:right;">$${total.toLocaleString('es-CO')}</td>
    </tr></tfoot>` : ''}
  </table>
  <div class="divider"></div>
  <div class="footer center">Sistema La Soupe · Generado automáticamente</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=350,height=600');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  }
}
