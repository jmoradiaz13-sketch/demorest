import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mesas',
  template: `
    <div class="page-header">
      <div>
        <h1>🪑 Mesas</h1>
        <p style="color:var(--text-muted);margin:0.25rem 0 0">
          {{ libres }} libres · {{ ocupadas }} ocupadas · {{ reservadas }} reservadas
        </p>
      </div>
      <div *ngIf="paraLlevar" class="takeout-top" [class.busy]="paraLlevar.status === 'ocupada'" (click)="onTableClick(paraLlevar)" title="Pedido para llevar">
        <span class="takeout-emoji">🛍️</span>
        <span class="takeout-label">Para llevar</span>
      </div>
    </div>

    <div class="filter-bar">
      <button class="filter-chip" [class.active]="filtro === ''" (click)="filtro = ''">Todas</button>
      <button class="filter-chip" [class.active]="filtro === 'libre'" (click)="filtro = 'libre'">🟢 Libres</button>
      <button class="filter-chip" [class.active]="filtro === 'ocupada'" (click)="filtro = 'ocupada'">🔴 Ocupadas</button>
      <button class="filter-chip" [class.active]="filtro === 'reservada'" (click)="filtro = 'reservada'">🟠 Reservadas</button>
    </div>

    <div class="neon-card" *ngFor="let g of grupos">
      <h3 class="zona-title">{{ g.icono }} {{ g.nombre }} <span class="zona-count">({{ g.mesas.length }})</span></h3>
      <div class="tables-grid">
        <div *ngFor="let t of g.mesas"
             class="table-item"
             [class.occupied]="t.status === 'ocupada'"
             [class.reserved]="t.status === 'reservada'"
             [class.takeout]="t.number === 0"
             (click)="onTableClick(t)">
          <div class="table-number" *ngIf="t.number !== 0">{{ t.number }}</div>
          <div class="table-number" *ngIf="t.number === 0">🛍️</div>
          <div class="table-status">{{ t.status === 'reservada' ? 'mesa reservada' : (t.number === 0 ? 'Para llevar' : (t.status || 'libre')) }}</div>
          <div class="table-order" *ngIf="t.status === 'ocupada' && t.currentSale?.total">
            &#36;{{ t.currentSale.total | number:'1.0-0' }}
          </div>
          <div class="table-reservation-info" *ngIf="t.status === 'reservada' && t.currentReservation">
            {{ t.currentReservation?.customerName }}
            <br>
            {{ t.currentReservation?.date | date:'shortTime' }}
            <br *ngIf="conteoReservas[t._id] > 1">
            <span *ngIf="conteoReservas[t._id] > 1">+{{ conteoReservas[t._id] - 1 }} reserva(s) más</span>
          </div>
        </div>
      </div>
    </div>
    <div class="neon-card" *ngIf="grupos.length === 0">
      <p style="color:var(--text-muted);text-align:center;padding:2rem">
        Sin mesas en este filtro
      </p>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .page-header h1 { margin: 0; }
    .takeout-top {
      display: flex; align-items: center; gap: 0.5rem;
      border: 1px solid var(--brand-gold); border-radius: 12px;
      background: rgba(212, 175, 55, 0.05); color: var(--brand-gold);
      padding: 0.5rem 0.9rem; cursor: pointer; transition: all 0.2s;
    }
    .takeout-top:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .takeout-top.busy { border-color: #D32F2F; background: rgba(211, 47, 47, 0.05); color: #D32F2F; }
    .takeout-emoji { font-size: 1.4rem; }
    .takeout-label { font-weight: 700; font-size: 0.85rem; }
    .filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .filter-chip {
      padding: 0.4rem 0.9rem; border-radius: 20px; border: 1px solid var(--border);
      background: var(--bg-input); font-size: 0.8rem; cursor: pointer; color: var(--text-secondary);
    }
    .filter-chip.active { background: var(--brand-gold); color: #fff; border-color: var(--brand-gold); }
    .zona-title { margin: 0 0 1rem; font-size: 1.05rem; }
    .zona-count { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }
    .neon-card { margin-bottom: 1.25rem; }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .table-item {
      background: var(--bg-input);
      border: 1px solid #2E8B57;
      border-radius: var(--radius-sm);
      padding: 1rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      color: #2E8B57;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100px;
    }
    .table-item:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .table-item.occupied {
      border-color: #D32F2F;
      background: rgba(211, 47, 47, 0.05);
      color: #D32F2F;
    }
    .table-item.reserved {
      border-color: #FF8F00;
      background: rgba(255, 143, 0, 0.05);
      color: #FF8F00;
    }
    .table-item.takeout {
      border-color: var(--brand-gold);
      background: rgba(212, 175, 55, 0.05);
      color: var(--brand-gold);
    }
    .table-number {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    .table-status {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      line-height: 1.25;
      overflow-wrap: anywhere;
      text-align: center;
      min-width: 0;
      max-width: 100%;
    }
    .table-order {
      font-size: 0.65rem;
      margin-top: 0.2rem;
      opacity: 0.7;
      font-family: monospace;
    }
    .table-reservation-info {
      font-size: 0.65rem;
      margin-top: 0.4rem;
      font-weight: 500;
      line-height: 1.3;
      overflow-wrap: anywhere;
      text-align: center;
      min-width: 0;
      max-width: 100%;
    }
    @media (max-width: 900px) {
      .tables-grid { grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    }
    @media (max-width: 600px) {
      .page-header { flex-direction: column; align-items: stretch; gap: 0.6rem; }
      .takeout-top { justify-content: center; }
      .tables-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
      .table-item { padding: 0.75rem 0.5rem; min-height: 88px; }
      .table-number { font-size: 1.1rem; }
      .table-status { font-size: 0.68rem; }
      .neon-card { padding: 0.9rem 0.6rem; }
    }
    @media (max-width: 360px) {
      .tables-grid { gap: 0.5rem; }
      .table-item { padding: 0.6rem 0.4rem; min-height: 80px; }
    }
  `]
})
export class MesasComponent implements OnInit {
  tables: any[] = [];
  filtro: '' | 'libre' | 'ocupada' | 'reservada' = '';
  conteoReservas: Record<string, number> = {};
  cargando = false;
  cargandoReservaId: string | null = null;

  constructor(
    private api: ApiService,
    private router: Router,
    private auth: AuthService
  ) {}

  puedeAnular(): boolean {
    const role = this.auth?.currentUser?.role;
    return role === 'admin' || role === 'cajero';
  }

  ngOnInit(): void {
    this.loadTables();
    this.cargarConteos();
  }

  cargarConteos(): void {
    this.api.getReservations().subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res.reservations || []);
        const mapa: Record<string, number> = {};
        lista.forEach((r: any) => {
          if (r.status === 'cancelada' || r.status === 'completada') return;
          const tid = r.table?._id || r.table;
          if (tid) mapa[tid] = (mapa[tid] || 0) + 1;
        });
        this.conteoReservas = mapa;
      },
      error: () => { /* sin conteo, la tarjeta usa la reserva actual */ }
    });
  }

  loadTables(): void {
    this.cargando = true;
    this.api.getTables().subscribe({
      next: (res: any) => {
        this.tables = res;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        Swal.fire('❌ Error', 'No se pudieron cargar las mesas. Revisa tu conexión.', 'error');
      }
    });
  }

  get mesasFiltradas(): any[] {
    if (!this.filtro) return this.tables;
    return this.tables.filter(t => t.status === this.filtro);
  }

  get grupos(): { nombre: string; icono: string; mesas: any[] }[] {
    const orden = ['Salón 1', 'Salón 2'];
    const iconos: Record<string, string> = { 'Salón 1': '🛋️', 'Salón 2': '🌿' };
    const mapa = new Map<string, any[]>();
    this.mesasFiltradas
      .filter(t => t.number !== 0)
      .forEach(t => {
        const zona = t.zona || 'Salón 1';
        if (!mapa.has(zona)) mapa.set(zona, []);
        mapa.get(zona)!.push(t);
      });
    const conocidos = orden.filter(z => mapa.has(z)).map(z => ({ nombre: z, icono: iconos[z], mesas: mapa.get(z)! }));
    const extras = [...mapa.keys()].filter(z => !orden.includes(z)).map(z => ({ nombre: z, icono: '🪑', mesas: mapa.get(z)! }));
    return [...conocidos, ...extras];
  }

  get mesas(): any[] {
    return this.tables.filter(t => t.number !== 0);
  }

  get paraLlevar(): any {
    return this.tables.find(t => t.number === 0);
  }

  get libres(): number { return this.mesas.filter(t => t.status === 'libre').length; }
  get ocupadas(): number { return this.mesas.filter(t => t.status === 'ocupada').length; }
  get reservadas(): number { return this.mesas.filter(t => t.status === 'reservada').length; }

  nombreMesa(table: any): string {
    return table.number === 0 ? 'Pedido para llevar' : `Mesa ${table.number}`;
  }

  onTableClick(table: any): void {
    if (table.status === 'libre') {
      Swal.fire({
        title: table.number === 0 ? 'Pedido para llevar' : `Mesa ${table.number} - Libre`,
        text: '¿Qué desea hacer?',
        icon: 'info',
        showCancelButton: true,
        showDenyButton: table.number !== 0,
        confirmButtonColor: '#2E8B57',
        denyButtonColor: '#FF8F00',
        confirmButtonText: '🛒 Venta',
        denyButtonText: '📅 Reservar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/pos'], { queryParams: { table: table.number } });
        } else if (result.isDenied && table.number !== 0) {
          this.showReservationForm(table);
        }
      });
    } else if (table.status === 'ocupada') {
      const saleRef = (table as any).currentSale;
      if (!saleRef) {
        this.verMesaHuerfana(table);
        return;
      }
      const total = table.currentSale?.total;
      const puedoAnular = this.puedeAnular();
      Swal.fire({
        title: `${this.nombreMesa(table)} - Ocupada`,
        html: total ? `<p>Consumo actual: <strong>$${total.toLocaleString('es-CO')}</strong></p><p>¿Qué desea hacer?</p>` : '¿Qué desea hacer?',
        icon: 'info',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonColor: '#2E8B57',
        denyButtonColor: '#D32F2F',
        confirmButtonText: '🧾 Ver pedido',
        denyButtonText: puedoAnular ? '❌ Anular venta' : '✅ Liberar mesa',
        cancelButtonText: 'Cerrar',
        footer: puedoAnular ? '<a id="liberar-mesa-link" style="color:#D4AF37;cursor:pointer;font-size:0.85rem">Liberar mesa sin anular</a>' : undefined,
        didOpen: () => {
          if (!puedoAnular) return;
          document.getElementById('liberar-mesa-link')?.addEventListener('click', () => {
            Swal.close();
            this.confirmFreeTable(table);
          });
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/pos'], { queryParams: { table: table.number } });
        } else if (result.isDenied) {
          if (puedoAnular) this.anularVenta(table);
          else this.confirmFreeTable(table);
        }
      });
    } else if (table.status === 'reservada') {
      this.verReservasMesa(table);
    }
  }

  private fechaReserva(v: any): string {
    if (!v) return 'N/A';
    return new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  }

  verReservasMesa(table: any): void {
    // Evita doble toque mientras ya se está cargando esta mesa
    if (this.cargandoReservaId === table._id) return;
    this.cargandoReservaId = table._id;

    // Feedback inmediato (<100ms): si ya tenemos la reserva en la tarjeta,
    // la mostramos al instante sin esperar al backend (Render puede tardar).
    const local = table.currentReservation && typeof table.currentReservation === 'object'
      ? [table.currentReservation]
      : [];
    if (local.length > 0) {
      this.cargandoReservaId = null;
      this.mostrarDialogoReservas(table, local);
      // Refresca en segundo plano por si hay más reservas (multi-reserva)
      this.api.getReservations({ table: table._id }).subscribe({
        next: (res: any) => {
          const todas = Array.isArray(res) ? res : (res.reservations || []);
          const lista = todas
            .filter((r: any) => r.status !== 'cancelada' && r.status !== 'completada')
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const idsLocal = local.map((r: any) => String(r._id));
          const idsFresh = lista.map((r: any) => String(r._id));
          const cambio = JSON.stringify(idsLocal) !== JSON.stringify(idsFresh);
          if (cambio && lista.length > 0) {
            try { Swal.close(); } catch { /* sin diálogo visible */ }
            this.mostrarDialogoReservas(table, lista);
          }
        },
        error: () => { /* ya se mostró la reserva local, no molestar */ }
      });
      return;
    }

    // Sin dato local: muestra "cargando" de inmediato para que no parezca muerta
    Swal.fire({
      title: `Mesa ${table.number} - Mesa reservada`,
      html: '<p>Buscando reservas…</p>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    this.api.getReservations({ table: table._id }).subscribe({
      next: (res: any) => {
        this.cargandoReservaId = null;
        const todas = Array.isArray(res) ? res : (res.reservations || []);
        const lista = todas
          .filter((r: any) => r.status !== 'cancelada' && r.status !== 'completada')
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (lista.length === 0 && table.currentReservation) lista.push(table.currentReservation);
        if (lista.length === 0) {
          Swal.fire('Mesa reservada', 'No hay reservas activas para esta mesa.', 'info');
          return;
        }
        this.mostrarDialogoReservas(table, lista);
      },
      error: () => {
        this.cargandoReservaId = null;
        Swal.fire('❌ Error', 'No se pudieron cargar las reservas', 'error');
      }
    });
  }

  private mostrarDialogoReservas(table: any, lista: any[]): void {
        const bloques = lista.map((r: any, i: number) => `
          <div style="border:1px solid #e0e0e0;border-radius:10px;padding:0.6rem 0.8rem;margin-bottom:0.6rem;text-align:left;">
            <div style="font-weight:800;margin-bottom:0.25rem;">📌 Reserva ${lista.length > 1 ? (i + 1) + ' de ' + lista.length : ''}</div>
            <p style="margin:0.15rem 0;"><strong>Cliente:</strong> ${r.customerName || 'N/A'}</p>
            <p style="margin:0.15rem 0;"><strong>Personas:</strong> ${r.numberOfPeople || 'N/A'}</p>
            <p style="margin:0.15rem 0;"><strong>Fecha y hora:</strong> ${this.fechaReserva(r.date)}</p>
            ${r.notes ? `<p style="margin:0.15rem 0;"><strong>Notas:</strong> ${r.notes}</p>` : ''}
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
              <button data-iniciar="${i}" style="flex:1;background:#2E8B57;color:#fff;border:none;border-radius:8px;padding:0.45rem;cursor:pointer;font-weight:700;">🛒 Iniciar pedido</button>
              <button data-cancelar="${i}" style="flex:1;background:#D32F2F;color:#fff;border:none;border-radius:8px;padding:0.45rem;cursor:pointer;font-weight:700;">❌ Cancelar</button>
            </div>
          </div>`).join('');
        Swal.fire({
          title: `Mesa ${table.number} - Mesa reservada`,
          html: `<div style="max-height:50vh;overflow-y:auto;">${bloques}</div>`,
          icon: 'info',
          showConfirmButton: false,
          showCancelButton: true,
          showDenyButton: true,
          cancelButtonText: 'Cerrar',
          denyButtonText: '📅 Agregar nueva reserva',
          denyButtonColor: '#FF8F00',
          didOpen: () => {
            lista.forEach((_r: any, i: number) => {
              document.querySelector(`[data-iniciar="${i}"]`)?.addEventListener('click', () => {
                Swal.close();
                this.iniciarPedidoReserva(table, lista[i]);
              });
              document.querySelector(`[data-cancelar="${i}"]`)?.addEventListener('click', () => {
                Swal.close();
                this.pedirCancelarReserva(table, lista[i]);
              });
            });
            // Sin botón agregar: la ventana queda solo con Iniciar pedido y Cancelar.
          }
        }).then((res) => {
          if (res.isDenied) this.showReservationForm(table);
        });
  }

  iniciarPedidoReserva(table: any, resData: any): void {
    // No se completa todavía: se completa tras la primera comandada en POS,
    // para que createSale enlace la venta a la mesa (una mesa ya ocupada no se re-enlaza).
    const qp: any = { table: table.number };
    if (resData?._id) qp['reserva'] = resData._id;
    this.router.navigate(['/pos'], { queryParams: qp });
  }

  pedirCancelarReserva(table: any, resData: any): void {
    if (!resData?._id) return;
    Swal.fire({
      title: '¿Confirmar cancelación?',
      html: `<p><strong>${resData.customerName || ''}</strong> · ${this.fechaReserva(resData.date)}</p>
             <p>La reserva será cancelada y la mesa quedará libre.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D32F2F',
      confirmButtonText: 'Sí, cancelar reserva'
    }).then((cancelResult) => {
      if (cancelResult.isConfirmed) {
        this.api.cancelReservation(resData._id).subscribe({
          next: () => {
            this.loadTables();
            this.cargarConteos();
            Swal.fire({ icon: 'success', title: 'Reserva cancelada', timer: 1500, showConfirmButton: false });
          },
          error: (err: any) => {
            Swal.fire('❌ Error', err.error?.message || 'No se pudo cancelar la reserva', 'error');
          }
        });
      }
    });
  }

  // Mesa ocupada sin venta enlazada (ventas huérfanas): permite cobrar/anular
  // cada venta encontrada en cocina para esa mesa y luego liberarla.
  verMesaHuerfana(table: any): void {
    Swal.fire({ title: 'Buscando pedidos de la mesa...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.api.getPendingKitchenOrders().subscribe({
      next: (res: any) => {
        const ordenes = Array.isArray(res) ? res : (res.orders || res.kitchenOrders || []);
        const mias = ordenes.filter((o: any) => Number(o.tableNumber) === Number(table.number));
        if (mias.length === 0) {
          Swal.fire({
            title: `Mesa ${table.number} - Ocupada sin pedidos`,
            text: 'No hay comandas pendientes en cocina para esta mesa.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#D4AF37',
            confirmButtonText: '✅ Liberar mesa',
            cancelButtonText: 'Cerrar'
          }).then((r) => { if (r.isConfirmed) this.confirmFreeTable(table); });
          return;
        }
        const detalle = async () => {
          const filas: string[] = [];
          for (let i = 0; i < mias.length; i++) {
            const o = mias[i];
            const sid = o.sale?._id || o.sale;
            let info = '—';
            try {
              const v: any = await this.api.getSale(sid).toPromise();
              const n = (v.items?.length || 0) + (v.dishItems?.length || 0);
              info = `${n} ítem(s) · $${(v.total || 0).toLocaleString('es-CO')} · ${v.status}`;
              (o as any).__saleId = v._id;
              (o as any).__total = v.total;
            } catch { (o as any).__saleId = sid; }
            filas.push(`
              <div style="border:1px solid #e0e0e0;border-radius:10px;padding:0.6rem 0.8rem;margin-bottom:0.6rem;text-align:left;">
                <div style="font-weight:800;">🧾 Pedido ${i + 1} — ${o.status || ''}</div>
                <p style="margin:0.2rem 0;">${info}</p>
                <div style="display:flex;gap:0.5rem;margin-top:0.4rem;">
                  <button data-cobrar="${i}" style="flex:1;background:#2E8B57;color:#fff;border:none;border-radius:8px;padding:0.45rem;cursor:pointer;font-weight:700;">💵 Cobrar</button>
                  <button data-anular="${i}" style="flex:1;background:#D32F2F;color:#fff;border:none;border-radius:8px;padding:0.45rem;cursor:pointer;font-weight:700;">❌ Anular</button>
                </div>
              </div>`);
          }
          Swal.fire({
            title: `Mesa ${table.number} - Pedidos sin enlazar (${mias.length})`,
            html: `
              <div style="max-height:50vh;overflow-y:auto;">${filas.join('')}</div>
              <div style="display:flex;gap:0.5rem;margin-top:0.6rem;align-items:center;">
                <select id="huerf-metodo" class="swal2-select" style="flex:1;margin:0;">
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">📱 Transferencia</option>
                  <option value="mixto">🔄 Mixto</option>
                </select>
                <button id="huerf-liberar" style="flex:1;background:#D4AF37;color:#fff;border:none;border-radius:8px;padding:0.55rem;cursor:pointer;font-weight:700;">✅ Liberar mesa</button>
              </div>`,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
            didOpen: () => {
              const metodo = () => (document.getElementById('huerf-metodo') as HTMLSelectElement)?.value || 'efectivo';
              mias.forEach((_o: any, i: number) => {
                document.querySelector(`[data-cobrar="${i}"]`)?.addEventListener('click', () => {
                  const sid = (mias[i] as any).__saleId;
                  if (!sid) return;
                  this.api.paySale(sid, { paymentMethod: metodo() }).subscribe({
                    next: () => { this.verMesaHuerfana(table); },
                    error: (err: any) => Swal.fire('❌ Error', err.error?.message || 'Error al cobrar', 'error')
                  });
                });
                document.querySelector(`[data-anular="${i}"]`)?.addEventListener('click', () => {
                  const sid = (mias[i] as any).__saleId;
                  if (!sid) return;
                  Swal.fire({
                    title: '¿Anular este pedido?', icon: 'warning', input: 'text',
                    inputLabel: 'Motivo *', inputPlaceholder: 'Ej. pedido duplicado',
                    showCancelButton: true, confirmButtonColor: '#D32F2F', confirmButtonText: 'Sí, anular',
                    inputValidator: (v: string) => (!v || !v.trim() ? 'El motivo es obligatorio' : null)
                  }).then((r2) => {
                    if (r2.isConfirmed) {
                      this.api.cancelSale(sid, { reason: r2.value }).subscribe({
                        next: () => { this.verMesaHuerfana(table); },
                        error: (err: any) => Swal.fire('❌ Error', err.error?.message || 'Error al anular', 'error')
                      });
                    } else {
                      this.verMesaHuerfana(table);
                    }
                  });
                });
              });
              document.getElementById('huerf-liberar')?.addEventListener('click', () => this.confirmFreeTable(table));
            }
          });
        };
        detalle();
      },
      error: () => Swal.fire('❌ Error', 'No se pudo consultar cocina', 'error')
    });
  }

  confirmFreeTable(table: any): void {
    Swal.fire({
      title: `¿Liberar ${this.nombreMesa(table)}?`,
      text: 'La mesa será marcada como libre',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#D4AF37',
      confirmButtonText: 'Sí, liberar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.freeTable(table._id).subscribe({
          next: () => {
            this.limpiarBorradorMesa(table.number);
            this.loadTables();
            Swal.fire({ icon: 'success', title: 'Mesa liberada', timer: 1500, showConfirmButton: false });
          }
        });
      }
    });
  }

  // Borra el borrador local del POS de esa mesa para que Venta Actual quede limpia
  private limpiarBorradorMesa(numero: number | null): void {
    try {
      const raw = localStorage.getItem('pos-borradores');
      if (!raw) return;
      const b = JSON.parse(raw) || {};
      delete b[String(numero)];
      localStorage.setItem('pos-borradores', JSON.stringify(b));
    } catch { /* almacenamiento no disponible */ }
  }

  anularVenta(table: any): void {
    const saleRef = table?.currentSale;
    const saleId = saleRef?._id || saleRef;
    if (!saleId || typeof saleId !== 'string') {
      Swal.fire('Atención', 'Esta mesa no tiene venta abierta para anular.', 'info');
      return;
    }
    Swal.fire({
      title: `¿Anular venta de ${this.nombreMesa(table)}?`,
      text: 'La venta quedará anulada y la mesa libre.',
      icon: 'warning',
      input: 'text',
      inputLabel: 'Motivo de anulación *',
      inputPlaceholder: 'Ej. el cliente se retiró',
      showCancelButton: true,
      confirmButtonColor: '#D32F2F',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Volver',
      inputValidator: (v: string) => (!v || !v.trim() ? 'El motivo es obligatorio' : null)
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.cancelSale(saleId, { reason: result.value }).subscribe({
          next: () => {
            this.limpiarBorradorMesa(table.number);
            this.loadTables();
            Swal.fire({ icon: 'success', title: 'Venta anulada, mesa liberada', timer: 1800, showConfirmButton: false });
          },
          error: (err: any) => {
            Swal.fire('❌ Error', err.error?.message || 'Error al anular la venta', 'error');
          }
        });
      }
    });
  }

  showReservationForm(table: any): void {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const minDateTime = now.toISOString().slice(0, 16);

    Swal.fire({
      title: `Reservar Mesa ${table.number}`,
      html: `
        <div style="display:flex; flex-direction:column; gap: 10px; text-align: left;">
          <div>
            <label style="font-weight:600; font-size: 0.85rem;">Nombre del Cliente *</label>
            <input type="text" id="res-name" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" placeholder="Ej. Juan Pérez">
          </div>
          <div>
            <label style="font-weight:600; font-size: 0.85rem;">Número de Personas *</label>
            <input type="number" id="res-people" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" min="1" value="2">
          </div>
          <div>
            <label style="font-weight:600; font-size: 0.85rem;">Fecha y Hora *</label>
            <input type="datetime-local" id="res-date" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" min="${minDateTime}" value="${minDateTime}">
          </div>
          <div>
            <label style="font-weight:600; font-size: 0.85rem;">Anotaciones (Opcional)</label>
            <textarea id="res-notes" class="swal2-textarea" style="margin:0; width:100%; box-sizing:border-box;" rows="2" placeholder="Cumpleaños, alergias, etc."></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Reserva',
      confirmButtonColor: '#FF8F00',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const name = (document.getElementById('res-name') as HTMLInputElement).value;
        const people = parseInt((document.getElementById('res-people') as HTMLInputElement).value, 10);
        const dateStr = (document.getElementById('res-date') as HTMLInputElement).value;
        const notes = (document.getElementById('res-notes') as HTMLTextAreaElement).value;

        if (!name) return Swal.showValidationMessage('El nombre es obligatorio');
        if (!people || people < 1) return Swal.showValidationMessage('El número de personas debe ser mayor a 0');
        if (!dateStr) return Swal.showValidationMessage('La fecha es obligatoria');

        return {
          table: table._id,
          customerName: name,
          numberOfPeople: people,
          date: new Date(dateStr),
          notes: notes
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.createReservation(result.value).subscribe({
          next: () => {
            this.loadTables();
            this.cargarConteos();
            Swal.fire({ icon: 'success', title: 'Mesa reservada', timer: 1500, showConfirmButton: false });
          },
          error: (err: any) => {
            Swal.fire('❌ Error', err.error?.message || 'Error al reservar', 'error');
          }
        });
      }
    });
  }
}
