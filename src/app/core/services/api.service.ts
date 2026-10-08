/**
 * api.service.ts  — cache-aware + módulos financieros
 *
 * Incluye: productos, categorías, ventas, caja, alertas, reportes,
 * storefront, settings, usuarios  +  proveedores, compras, gastos, finanzas.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PreloadService } from './preload.service';

const TTL = {
  products:          5  * 60 * 1000,
  categories:        10 * 60 * 1000,
  alerts:            2  * 60 * 1000,
  sales:             5  * 60 * 1000,
  reports:           5  * 60 * 1000,
  currentCash:       3  * 60 * 1000,
  settings:          30 * 60 * 1000,
  storefront:        5  * 60 * 1000,
  suppliers:         5  * 60 * 1000,
  expenseCategories: 60 * 60 * 1000,
  finance:           3  * 60 * 1000,
  tables:            30 * 1000,
  reservations:      30 * 1000,
} as const;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private preload: PreloadService
  ) {}

  // ── Cache helpers ─────────────────────────────────────────────────────────

  private key(endpoint: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) return endpoint;
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, k) => ({ ...acc, [k]: params[k] }), {});
    return `${endpoint}:${JSON.stringify(sorted)}`;
  }

  private cachedGet<T>(cacheKey: string, request: Observable<T>, ttl: number): Observable<T> {
    const cached = this.preload.get<T>(cacheKey);
    if (cached !== null) return of(cached);
    return request.pipe(tap(data => this.preload.set(cacheKey, data, ttl)));
  }

  // ── Products ──────────────────────────────────────────────────────────────

  /**
   * Returns ALL active products from cache or /products/all.
   * Both POS and Inventory use this for local-first search.
   */
  getAllProducts(): Observable<any> {
    return this.cachedGet(
      'all-products',
      this.http.get(`${this.baseUrl}/products/all`),
      TTL.products
    );
  }

  getProducts(params?: any): Observable<any> {
    const k = this.key('products', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/products`, { params }), TTL.products);
  }

  getProduct(id: string): Observable<any> {
    return this.cachedGet(`product:${id}`, this.http.get(`${this.baseUrl}/products/${id}`), TTL.products);
  }

  createProduct(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/products`, data).pipe(
      tap(() => { this.preload.invalidatePrefix('products'); this.preload.invalidate('all-products'); })
    );
  }

  updateProduct(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/products/${id}`, data).pipe(
      tap(() => { this.preload.invalidatePrefix('products'); this.preload.invalidate(`product:${id}`); this.preload.invalidate('all-products'); })
    );
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/${id}`).pipe(
      tap(() => { this.preload.invalidatePrefix('products'); this.preload.invalidate(`product:${id}`); this.preload.invalidate('all-products'); })
    );
  }

  updateStock(id: string, data: { quantity: number; type: 'entrada' | 'salida' }): Observable<any> {
    return this.http.patch(`${this.baseUrl}/products/${id}/stock`, data).pipe(
      tap(() => {
        this.preload.invalidatePrefix('products');
        this.preload.invalidate(`product:${id}`);
        this.preload.invalidate('all-products');
        this.preload.invalidatePrefix('alerts');
        this.preload.invalidatePrefix('sales-summary');
      })
    );
  }

  getNextBarcode(categoryId: string, supplierId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/products/next-barcode`, { params: { categoryId, supplierId } });
  }

  // ── Categories ────────────────────────────────────────────────────────────

  getCategories(): Observable<any> {
    return this.cachedGet('categories', this.http.get(`${this.baseUrl}/categories`), TTL.categories);
  }

  createCategory(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/categories`, data).pipe(
      tap(() => this.preload.invalidate('categories'))
    );
  }

  updateCategory(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/categories/${id}`, data).pipe(
      tap(() => this.preload.invalidate('categories'))
    );
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/categories/${id}`).pipe(
      tap(() => this.preload.invalidate('categories'))
    );
  }

  // ── Sales ─────────────────────────────────────────────────────────────────

  createSale(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/sales`, data).pipe(
      tap(() => {
        this.preload.invalidatePrefix('products');
        this.preload.invalidatePrefix('sales-summary');
        this.preload.invalidatePrefix('top-products');
        this.preload.invalidatePrefix('alerts');
        this.preload.invalidate('current-cash');
        this.preload.invalidatePrefix('finance');
        this.preload.invalidate('tables');
        this.preload.invalidatePrefix('reservations');
      })
    );
  }

  addItemsToSale(id: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/sales/${id}/add-items`, data).pipe(
      tap(() => {
        this.preload.invalidatePrefix('products');
        this.preload.invalidatePrefix('sales-summary');
        this.preload.invalidatePrefix('top-products');
        this.preload.invalidatePrefix('alerts');
        this.preload.invalidate('current-cash');
        this.preload.invalidatePrefix('finance');
        this.preload.invalidate(`sale:${id}`);
        this.preload.invalidatePrefix('sales');
      })
    );
  }

  paySale(id: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/sales/${id}/pay`, data).pipe(
      tap(() => {
        this.preload.invalidatePrefix('products');
        this.preload.invalidatePrefix('ingredients');
        this.preload.invalidatePrefix('sales-summary');
        this.preload.invalidate('current-cash');
        this.preload.invalidatePrefix('finance');
        this.preload.invalidate(`sale:${id}`);
        this.preload.invalidatePrefix('sales');
        this.preload.invalidate('tables');
      })
    );
  }

  cancelSale(id: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/sales/${id}/cancel`, data).pipe(
      tap(() => {
        this.preload.invalidatePrefix('sales-summary');
        this.preload.invalidatePrefix('top-products');
        this.preload.invalidate('current-cash');
        this.preload.invalidatePrefix('finance');
        this.preload.invalidate(`sale:${id}`);
        this.preload.invalidatePrefix('sales');
        this.preload.invalidate('tables');
      })
    );
  }

  getSales(params?: any): Observable<any> {
    const k = this.key('sales', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/sales`, { params }), TTL.sales);
  }

  getSale(id: string): Observable<any> {
    return this.cachedGet(`sale:${id}`, this.http.get(`${this.baseUrl}/sales/${id}`), TTL.sales);
  }

  // ── Cash Closings ─────────────────────────────────────────────────────────

  openCash(initialAmount: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/cash-closings/open`, { initialAmount }).pipe(
      tap(() => this.preload.invalidate('current-cash'))
    );
  }

  closeCash(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/cash-closings/${id}/close`, data).pipe(
      tap(() => this.preload.invalidate('current-cash'))
    );
  }

  addCashMovement(id: string, data: { tipo: 'entrada' | 'salida'; amount: number; concept: string; method?: 'efectivo' | 'tarjeta' | 'transferencia' }): Observable<any> {
    return this.http.post(`${this.baseUrl}/cash-closings/${id}/movements`, data).pipe(
      tap(() => this.preload.invalidate('current-cash'))
    );
  }

  getCashClosings(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/cash-closings`, { params });
  }

  getCurrentCash(): Observable<any> {
    return this.cachedGet('current-cash', this.http.get(`${this.baseUrl}/cash-closings/current`), TTL.currentCash);
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  getAlerts(params?: any): Observable<any> {
    const k = this.key('alerts', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/alerts`, { params }), TTL.alerts);
  }

  markAlertRead(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/alerts/${id}/read`, {}).pipe(
      tap(() => this.preload.invalidatePrefix('alerts'))
    );
  }

  markAllAlertsRead(): Observable<any> {
    return this.http.patch(`${this.baseUrl}/alerts/read-all`, {}).pipe(
      tap(() => this.preload.invalidatePrefix('alerts'))
    );
  }

  checkStockAlerts(): Observable<any> {
    return this.http.post(`${this.baseUrl}/alerts/check-stock`, {}).pipe(
      tap(() => this.preload.invalidatePrefix('alerts'))
    );
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  getSalesSummary(period?: string): Observable<any> {
    const k = period ? `sales-summary:${period}` : 'sales-summary:month';
    const params: any = period ? { period } : undefined;
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/reports/sales-summary`, { params }), TTL.reports);
  }

  getTopProducts(limit?: number): Observable<any> {
    const k = `top-products:${limit ?? 10}`;
    const params: any = limit ? { limit: limit.toString() } : undefined;
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/reports/top-products`, { params }), TTL.reports);
  }

  getLowRotation(): Observable<any> {
    return this.cachedGet('low-rotation', this.http.get(`${this.baseUrl}/reports/low-rotation`), TTL.reports);
  }

  getSalesByCategory(period?: string): Observable<any> {
    const k = `sales-by-category:${period ?? 'month'}`;
    const params: any = period ? { period } : undefined;
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/reports/sales-by-category`, { params }), TTL.reports);
  }

  getSalesByPayment(period?: string): Observable<any> {
    const k = `sales-by-payment:${period ?? 'month'}`;
    const params: any = period ? { period } : undefined;
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/reports/sales-by-payment`, { params }), TTL.reports);
  }

  getSalesByHour(period?: string): Observable<any> {
    const k = `sales-by-hour:${period ?? 'month'}`;
    const params: any = period ? { period } : undefined;
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/reports/sales-by-hour`, { params }), TTL.reports);
  }

  getInventoryValuation(): Observable<any> {
    return this.cachedGet('inventory-valuation', this.http.get(`${this.baseUrl}/reports/inventory-valuation`), TTL.reports);
  }

  getProfitMargins(): Observable<any> {
    return this.cachedGet('profit-margins', this.http.get(`${this.baseUrl}/reports/profit-margins`), TTL.reports);
  }

  getPreparationTimes(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/reports/preparation-times`, { params });
  }

  exportSalesSummaryCSV(period?: string): Observable<Blob> {
    const params: any = period ? { period } : {};
    return this.http.get(`${this.baseUrl}/reports/export/sales-summary`, { params, responseType: 'blob' });
  }

  exportTopProductsCSV(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/reports/export/top-products`, { responseType: 'blob' });
  }

  exportInventoryCSV(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/reports/export/inventory`, { responseType: 'blob' });
  }

  // ── Storefront (Public) ───────────────────────────────────────────────────

  getStorefrontProducts(params?: any): Observable<any> {
    const k = this.key('storefront-products', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/storefront/products`, { params }), TTL.storefront);
  }

  getStorefrontCategories(): Observable<any> {
    return this.cachedGet('storefront-categories', this.http.get(`${this.baseUrl}/storefront/categories`), TTL.storefront);
  }

  checkAvailability(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/storefront/products/${id}/availability`);
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  getSettings(): Observable<any> {
    return this.cachedGet('settings', this.http.get(`${this.baseUrl}/settings`), TTL.settings);
  }

  updateSettings(data: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/settings`, data).pipe(
      tap(() => this.preload.invalidate('settings'))
    );
  }

  uploadManual(data: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/settings/manual`, data).pipe(
      tap(() => this.preload.invalidate('settings'))
    );
  }

  // ── Users (admin) ─────────────────────────────────────────────────────────

  registerUser(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, data);
  }

  getAllUsers(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/users`, { params });
  }

  updateUser(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/auth/users/${id}`, data);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/auth/users/${id}`);
  }

  changePassword(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/auth/change-password`, data);
  }

  // ── Suppliers ────────────────────────────────────────────────────────────

  getSuppliers(params?: any): Observable<any> {
    const k = this.key('suppliers', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/suppliers`, { params }), TTL.suppliers);
  }

  getSupplier(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/suppliers/${id}`);
  }

  createSupplier(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/suppliers`, data).pipe(
      tap(() => this.preload.invalidatePrefix('suppliers'))
    );
  }

  updateSupplier(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/suppliers/${id}`, data).pipe(
      tap(() => this.preload.invalidatePrefix('suppliers'))
    );
  }

  deleteSupplier(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/suppliers/${id}`).pipe(
      tap(() => this.preload.invalidatePrefix('suppliers'))
    );
  }

  // ── Purchases ─────────────────────────────────────────────────────────────

  getPurchases(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/purchases`, { params });
  }

  getPurchase(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/purchases/${id}`);
  }

  createPurchase(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/purchases`, data).pipe(
      tap(() => {
        this.preload.invalidatePrefix('products');
        this.preload.invalidatePrefix('ingredients');
        this.preload.invalidatePrefix('finance');
        this.preload.invalidatePrefix('inventory-valuation');
      })
    );
  }

  updatePurchaseStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/purchases/${id}/status`, { status }).pipe(
      tap(() => {
        this.preload.invalidatePrefix('products');
        this.preload.invalidatePrefix('ingredients');
      })
    );
  }

  // ── Expenses ──────────────────────────────────────────────────────────────

  getExpenseCategories(): Observable<any> {
    return this.cachedGet(
      'expense-categories',
      this.http.get(`${this.baseUrl}/expenses/categories`),
      TTL.expenseCategories
    );
  }

  getExpenses(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/expenses`, { params });
  }

  createExpense(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/expenses`, data).pipe(
      tap(() => this.preload.invalidatePrefix('finance'))
    );
  }

  updateExpense(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/expenses/${id}`, data).pipe(
      tap(() => this.preload.invalidatePrefix('finance'))
    );
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/expenses/${id}`).pipe(
      tap(() => this.preload.invalidatePrefix('finance'))
    );
  }

  // ── Finance / Centro de Inteligencia Financiera ───────────────────────────

  getFinancialSummary(period?: string): Observable<any> {
    const k = `finance-summary:${period ?? 'month'}`;
    const params: any = period ? { period } : undefined;
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/finance/summary`, { params }), TTL.finance);
  }

  getCashFlow(period?: string): Observable<any> {
    const k = `finance-cashflow:${period ?? 'month'}`;
    const params: any = period ? { period } : undefined;
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/finance/cashflow`, { params }), TTL.finance);
  }

  getMonthlyPL(months?: number): Observable<any> {
    const k = `finance-monthly-pl:${months ?? 6}`;
    const params: any = months ? { months: months.toString() } : undefined;
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/finance/monthly-pl`, { params }), TTL.finance);
  }

  getIncomeHistory(params?: any): Observable<any> {
    const k = this.key('finance-income-history', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/finance/income-history`, { params }), TTL.finance);
  }

  // ── Ingredients ─────────────────────────────────────────────────────────

  getIngredients(params?: any): Observable<any> {
    const k = this.key('ingredients', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/ingredients`, { params }), TTL.products);
  }

  getIngredient(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ingredients/${id}`);
  }

  createIngredient(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ingredients`, data).pipe(
      tap(() => this.preload.invalidatePrefix('ingredients'))
    );
  }

  updateIngredient(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/ingredients/${id}`, data).pipe(
      tap(() => this.preload.invalidatePrefix('ingredients'))
    );
  }

  deleteIngredient(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ingredients/${id}`).pipe(
      tap(() => this.preload.invalidatePrefix('ingredients'))
    );
  }

  // ── Dishes ──────────────────────────────────────────────────────────────

  getDishes(params?: any): Observable<any> {
    // v2: invalida la carta cacheada (el seed de carta 15 cambió el menú en servidor
    // sin pasar por la API, así que la caché anterior quedaba con platos viejos).
    const k = this.key('dishes-v2', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/dishes`, { params }), TTL.products);
  }

  getDish(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/dishes/${id}`);
  }

  createDish(data: FormData | any): Observable<any> {
    return this.http.post(`${this.baseUrl}/dishes`, data).pipe(
      tap(() => this.preload.invalidatePrefix('dishes'))
    );
  }

  updateDish(id: string, data: FormData | any): Observable<any> {
    return this.http.put(`${this.baseUrl}/dishes/${id}`, data).pipe(
      tap(() => this.preload.invalidatePrefix('dishes'))
    );
  }

  deleteDish(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/dishes/${id}`).pipe(
      tap(() => this.preload.invalidatePrefix('dishes'))
    );
  }

  getRecipeCost(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/dishes/${id}/recipe-cost`);
  }

  checkDishAvailability(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/dishes/${id}/availability`);
  }

  batchCheckAvailability(dishIds: string[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/dishes/batch-availability`, { dishIds });
  }

  // ── Staff ───────────────────────────────────────────────────────────────

  getStaff(params?: any): Observable<any> {
    const k = this.key('staff', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/staff`, { params }), TTL.suppliers);
  }

  getStaffMember(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/staff/${id}`);
  }

  createStaffMember(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/staff`, data).pipe(
      tap(() => this.preload.invalidatePrefix('staff'))
    );
  }

  updateStaffMember(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/staff/${id}`, data).pipe(
      tap(() => this.preload.invalidatePrefix('staff'))
    );
  }

  deleteStaffMember(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/staff/${id}`).pipe(
      tap(() => this.preload.invalidatePrefix('staff'))
    );
  }

  // ── TicketBooks ─────────────────────────────────────────────────────────

  getTicketBooks(params?: any): Observable<any> {
    const k = this.key('ticketbooks', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/ticketbooks`, { params }), TTL.sales);
  }

  getTicketBook(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticketbooks/${id}`);
  }

  createTicketBook(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticketbooks`, data).pipe(
      tap(() => this.preload.invalidatePrefix('ticketbooks'))
    );
  }

  updateTicketBook(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/ticketbooks/${id}`, data).pipe(
      tap(() => this.preload.invalidatePrefix('ticketbooks'))
    );
  }

  consumeTicketBook(id: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticketbooks/${id}/consume`, data).pipe(
      tap(() => this.preload.invalidatePrefix('ticketbooks'))
    );
  }

  deleteTicketBook(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ticketbooks/${id}`).pipe(
      tap(() => this.preload.invalidatePrefix('ticketbooks'))
    );
  }

  // ── Kitchen Orders ────────────────────────────────────────────────────

  getKitchenOrders(): Observable<any> {
    return this.http.get(`${this.baseUrl}/kitchen-orders`);
  }

  getPendingKitchenOrders(): Observable<any> {
    return this.http.get(`${this.baseUrl}/kitchen-orders/pending`);
  }

  acceptKitchenOrder(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/kitchen-orders/${id}/accept`, {});
  }

  deliverKitchenOrder(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/kitchen-orders/${id}/deliver`, {});
  }

  markKitchenOrderPaid(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/kitchen-orders/${id}/paid`, {});
  }

  printKitchenOrder(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/kitchen-orders/${id}/print`, { responseType: 'blob' });
  }

  // ── Tables ────────────────────────────────────────────────────────────

  getTables(): Observable<any> {
    return this.cachedGet('tables', this.http.get(`${this.baseUrl}/tables`), TTL.tables);
  }

  occupyTable(id: string, saleId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/tables/${id}/occupy`, { saleId }).pipe(
      tap(() => this.preload.invalidate('tables'))
    );
  }

  freeTable(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/tables/${id}/free`, {}).pipe(
      tap(() => {
        this.preload.invalidate('tables');
        this.preload.invalidatePrefix('reservations');
      })
    );
  }

  // ── Deliveries ─────────────────────────────────────────────────────────

  getAllDeliveries(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/delivery`, { params });
  }

  acceptDelivery(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/delivery/${id}/accept`, {});
  }

  dispatchDelivery(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/delivery/${id}/dispatch`, {});
  }

  deliverDelivery(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/delivery/${id}/deliver`, {});
  }

  cancelDelivery(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/delivery/${id}/cancel`, {});
  }

  // ── Reservations ───────────────────────────────────────────────────────

  createReservation(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/reservations`, data).pipe(
      tap(() => {
        this.preload.invalidate('tables');
        this.preload.invalidatePrefix('reservations');
      })
    );
  }

  getReservations(params?: any): Observable<any> {
    const k = this.key('reservations', params);
    return this.cachedGet(k, this.http.get(`${this.baseUrl}/reservations`, { params }), TTL.reservations);
  }

  cancelReservation(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/reservations/${id}/cancel`, {}).pipe(
      tap(() => {
        this.preload.invalidate('tables');
        this.preload.invalidatePrefix('reservations');
      })
    );
  }

  completeReservation(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/reservations/${id}/complete`, {}).pipe(
      tap(() => {
        this.preload.invalidate('tables');
        this.preload.invalidatePrefix('reservations');
      })
    );
  }

  // ── Events & Catering ──────────────────────────────────────────────────

  getEvents(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/events`, { params });
  }

  getEvent(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/events/${id}`);
  }

  createEvent(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/events`, data);
  }

  updateEvent(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/events/${id}`, data);
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/events/${id}`);
  }

  addEventPayment(id: string, data: { amount: number; method: string; milestone?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/events/${id}/payment`, data).pipe(
      tap(() => this.preload.invalidate('current-cash'))
    );
  }

  addEventMilestone(id: string, data: { etiqueta: string; monto: number; vencimiento?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/events/${id}/milestones`, data);
  }

  removeEventMilestone(id: string, mid: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/events/${id}/milestones/${mid}`);
  }

  clearCache(): void {
    this.preload.clear();
    localStorage.clear();
  }
}

