import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cash',
  template: `
    <div class="page-header"><h1>💰 Arqueo de Caja</h1></div>

    <div class="neon-card mb-3" *ngIf="currentCash">
      <div class="flex-between">
        <div>
          <h3>{{ currentCash.open ? '🟢 Caja Abierta' : '🔴 Caja Cerrada' }}</h3>
          <p style="color:var(--text-secondary);font-size:0.85rem" *ngIf="currentCash.open">
            Abierta desde: {{ currentCash.cashClosing?.openedAt | date:'medium' }}<br>
            Base inicial: {{ fmt(currentCash.cashClosing?.initialAmount) }}<br>
            Ventas acumuladas: {{ fmt(currentCash.currentTotalSales) }} ({{ currentCash.currentTransactions }} transacciones)
          </p>
        </div>
        <div class="cash-actions">
          <button class="btn-primary" (click)="openCash()" *ngIf="!currentCash.open">🔓 Abrir Caja</button>
          <ng-container *ngIf="currentCash.open">
            <button class="btn-secondary" (click)="movimiento('entrada')">🟢 Entrada</button>
            <button class="btn-secondary" (click)="movimiento('salida')">🔴 Salida</button>
            <button class="btn-danger" (click)="closeCash()">🔒 Cerrar Caja</button>
          </ng-container>
        </div>
      </div>

      <!-- Desglose en vivo del turno abierto -->
      <div class="desglose-grid" *ngIf="currentCash.open && currentCash.desglose as d">
        <div class="mini-stat"><span>Efectivo (ventas)</span><strong>{{ fmt(d.ventasPorMetodo?.efectivo) }}</strong></div>
        <div class="mini-stat"><span>Tarjeta / Datáfono</span><strong>{{ fmt(d.ventasPorMetodo?.tarjeta) }}</strong></div>
        <div class="mini-stat"><span>Transferencias</span><strong>{{ fmt(d.ventasPorMetodo?.transferencia) }}</strong></div>
        <div class="mini-stat"><span>Mixto</span><strong>{{ fmt(d.ventasPorMetodo?.mixto) }}</strong></div>
        <div class="mini-stat"><span>Abonos eventos</span><strong>{{ fmt(d.abonosEventos) }}</strong></div>
        <div class="mini-stat"><span>(+) Entradas</span><strong class="pos">{{ fmt(d.entradas) }}</strong></div>
        <div class="mini-stat"><span>(−) Salidas</span><strong class="neg">{{ fmt(d.salidas) }}</strong></div>
        <div class="mini-stat highlight"><span>Efectivo esperado</span><strong>{{ fmt(d.efectivoEsperado) }}</strong></div>
      </div>

      <!-- Movimientos de caja menor del turno -->
      <div *ngIf="currentCash.open && (currentCash.desglose?.movimientos?.length || 0) > 0" style="margin-top:0.75rem">
        <h4 style="margin:0 0 0.4rem;font-size:0.85rem">📝 Movimientos de caja menor</h4>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Hora</th><th>Tipo</th><th>Método</th><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
            <tbody>
              <tr *ngFor="let m of currentCash.desglose.movimientos">
                <td>{{ m.date | date:'HH:mm' }}</td>
                <td>{{ m.tipo === 'entrada' ? '🟢 Entrada' : '🔴 Salida' }}</td>
                <td>{{ metodoLabel(m.method) }}</td>
                <td>{{ m.concept }}</td>
                <td style="text-align:right" [style.color]="m.tipo === 'entrada' ? 'var(--brand-green)' : 'var(--brand-red)'">
                  {{ m.tipo === 'entrada' ? '+' : '−' }}{{ fmt(m.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="neon-card" style="animation:none">
      <h3 style="margin-bottom:1rem">📋 Historial de Arqueos</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Cajero</th><th>Inicial</th><th>Ventas</th><th>Esperado</th><th>Real</th><th>Diferencia</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr *ngFor="let c of closings">
              <td>{{ c.openedAt | date:'dd/MM/yy HH:mm' }}</td>
              <td>{{ c.user?.name || c.reporteZ?.cajero || '-' }}</td>
              <td>{{ fmt(c.initialAmount) }}</td>
              <td>{{ fmt(c.totalSales) }}</td>
              <td>{{ fmt(c.expectedCash) }}</td>
              <td>{{ c.actualCash !== null && c.actualCash !== undefined ? fmt(c.actualCash) : '-' }}</td>
              <td [style.color]="c.difference < 0 ? 'var(--brand-red)' : 'var(--brand-green)'">
                {{ fmt(c.difference || 0) }}
              </td>
              <td><span [class]="c.status === 'abierta' ? 'badge badge-green' : 'badge badge-violet'">{{ c.status }}</span></td>
              <td class="row-actions">
                <button class="icon-btn" title="Ver Reporte Z" (click)="verZ(c)">👁️</button>
                <button class="icon-btn" title="Imprimir (80mm)" (click)="imprimirZ(c)">🖨️</button>
                <button class="icon-btn" title="Descargar PDF" (click)="descargarZpdf(c)">📄</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Reporte Z -->
    <div class="modal-overlay" *ngIf="showZ && zActual" (click)="showZ = false">
      <div class="modal-content" style="max-width:560px" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>📋 Reporte Z — Cierre de Caja</h2>
          <button class="close-btn" (click)="showZ = false">✕</button>
        </div>
        <div class="z-body">
          <p class="z-line"><span>Restaurante</span><strong>La Soupe à l'Oignon</strong></p>
          <p class="z-line"><span>Apertura</span><strong>{{ zActual.apertura | date:'dd/MM/yy HH:mm' }}</strong></p>
          <p class="z-line"><span>Cierre</span><strong>{{ zActual.cierre | date:'dd/MM/yy HH:mm' }}</strong></p>
          <p class="z-line"><span>Cajero</span><strong>{{ zActual.cajero || '-' }}</strong></p>
          <div class="z-sep">Resumen de ingresos</div>
          <p class="z-line"><span>Ventas brutas</span><strong>{{ fmt(zActual.ventasBrutas) }}</strong></p>
          <p class="z-line"><span>Abonos eventos</span><strong>{{ fmt(zActual.abonosEventos) }}</strong></p>
          <p class="z-line"><span>Impuestos discriminados</span><strong>{{ fmt(0) }}</strong></p>
          <p class="z-note">{{ zActual.impuestos?.nota || 'Precios con impuesto incluido sin discriminar.' }}</p>
          <p class="z-line"><span>Propinas</span><strong>{{ fmt(zActual.propinas?.total) }}</strong></p>
          <div class="z-sep">Por medio de pago (ventas)</div>
          <ng-container *ngIf="zActual.ventasPorMetodo; else zSinDesglose">
            <p class="z-line"><span>Efectivo</span><strong>{{ fmt(zActual.ventasPorMetodo.efectivo) }}</strong></p>
            <p class="z-line"><span>Tarjeta / Datáfono</span><strong>{{ fmt(zActual.ventasPorMetodo.tarjeta) }}</strong></p>
            <p class="z-line"><span>Transferencias</span><strong>{{ fmt(zActual.ventasPorMetodo.transferencia) }}</strong></p>
            <p class="z-line"><span>Mixto</span><strong>{{ fmt(zActual.ventasPorMetodo.mixto) }}</strong></p>
          </ng-container>
          <ng-template #zSinDesglose>
            <p class="z-note">Cierre anterior al desglose por método: solo total {{ fmt(zActual.ventasBrutas) }}.</p>
          </ng-template>
          <div class="z-sep">Movimientos de caja</div>
          <p class="z-line"><span>Base inicial</span><strong>{{ fmt(zActual.baseInicial) }}</strong></p>
          <p class="z-line"><span>(+) Entradas</span><strong class="pos">{{ fmt(zActual.entradasTotal) }}</strong></p>
          <p class="z-line"><span>(−) Salidas</span><strong class="neg">{{ fmt(zActual.salidasTotal) }}</strong></p>
          <p class="z-note" *ngFor="let m of zActual.movimientos">{{ m.tipo === 'entrada' ? '🟢' : '🔴' }} {{ fmt(m.amount) }} ({{ metodoLabel(m.method) }}) — {{ m.concept }}</p>
          <div class="z-sep">Arqueo físico</div>
          <p class="z-line"><span>Efectivo esperado</span><strong>{{ fmt(zActual.efectivoEsperado) }}</strong></p>
          <p class="z-line"><span>Efectivo contado</span><strong>{{ fmt(zActual.efectivoReal) }}</strong></p>
          <p class="z-line total"><span>Diferencia</span><strong [style.color]="(zActual.diferencia || 0) < 0 ? 'var(--brand-red)' : 'var(--brand-green)'">{{ fmt(zActual.diferencia) }}{{ (zActual.diferencia || 0) < 0 ? ' (faltante)' : (zActual.diferencia || 0) > 0 ? ' (sobrante)' : '' }}</strong></p>
          <ng-container *ngIf="zActual.conteoPorMetodo as cm">
            <p class="z-line" *ngIf="cm.tarjetaContado !== null && cm.tarjetaContado !== undefined"><span>Tarjeta contada (esp. {{ fmt(cm.tarjetaEsperado) }})</span><strong>{{ fmt(cm.tarjetaContado) }}</strong></p>
            <p class="z-line" *ngIf="cm.tarjetaDiferencia !== null && cm.tarjetaDiferencia !== undefined"><span>Diferencia tarjeta</span><strong>{{ fmt(cm.tarjetaDiferencia) }}</strong></p>
            <p class="z-line" *ngIf="cm.transferenciaContado !== null && cm.transferenciaContado !== undefined"><span>Transferencias (esp. {{ fmt(cm.transferenciaEsperado) }})</span><strong>{{ fmt(cm.transferenciaContado) }}</strong></p>
            <p class="z-line" *ngIf="cm.transferenciaDiferencia !== null && cm.transferenciaDiferencia !== undefined"><span>Diferencia transferencias</span><strong>{{ fmt(cm.transferenciaDiferencia) }}</strong></p>
          </ng-container>
          <p class="z-note" *ngIf="zActual.notas">Notas: {{ zActual.notas }}</p>
        </div>
        <div class="modal-actions" style="justify-content:flex-end">
          <button class="btn-secondary" (click)="imprimirZactual()">🖨️ Imprimir 80mm</button>
          <button class="btn-primary" (click)="descargarZpdfActual()">📄 Descargar PDF</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cash-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .desglose-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; margin-top: 0.9rem; }
    .mini-stat { background: var(--bg-input); border: 1px solid var(--border); border-radius: 10px; padding: 0.5rem 0.7rem; display: flex; flex-direction: column; gap: 0.15rem; }
    .mini-stat span { font-size: 0.68rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; }
    .mini-stat strong { font-size: 0.95rem; }
    .mini-stat.highlight { border-color: var(--brand-gold); }
    .mini-stat .pos { color: var(--brand-green); }
    .mini-stat .neg { color: var(--brand-red); }
    .row-actions { white-space: nowrap; }
    .icon-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 0.25rem 0.45rem; cursor: pointer; font-size: 0.9rem; margin-right: 0.25rem; }
    .icon-btn:hover { border-color: var(--brand-gold); }
    .z-body { padding: 1rem 1.25rem; max-height: 60vh; overflow-y: auto; }
    .z-line { display: flex; justify-content: space-between; gap: 1rem; margin: 0.3rem 0; font-size: 0.88rem; }
    .z-line.total { font-size: 1rem; border-top: 1px solid var(--border); padding-top: 0.4rem; }
    .z-sep { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 0.2rem; margin: 0.8rem 0 0.3rem; }
    .z-note { font-size: 0.75rem; color: var(--text-muted); font-style: italic; margin: 0.2rem 0; }
    .pos { color: var(--brand-green); }
    .neg { color: var(--brand-red); }
    @media (max-width: 700px) { .desglose-grid { grid-template-columns: 1fr 1fr; } }
  `]
})
export class CashComponent implements OnInit {
  currentCash: any = null;
  closings: any[] = [];
  showZ = false;
  zActual: any = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.loadData(); }

  fmt(n: any): string {
    return '$' + (Math.round(Number(n) || 0)).toLocaleString('es-CO');
  }

  metodoLabel(m: any): string {
    const v = m || 'efectivo';
    if (v === 'tarjeta') return '💳 Datáfono';
    if (v === 'transferencia') return '📱 Transf.';
    return '💵 Efectivo';
  }

  private metodoCorto(m: any): string {
    const v = m || 'efectivo';
    if (v === 'tarjeta') return 'datáfono';
    if (v === 'transferencia') return 'transf.';
    return 'efectivo';
  }

  loadData(): void {
    this.api.getCurrentCash().subscribe({ next: (res: any) => this.currentCash = res });
    this.api.getCashClosings().subscribe({ next: (res: any) => this.closings = res.closings || [] });
  }

  async openCash(): Promise<void> {
    const { value } = await Swal.fire({
      title: '🔓 Abrir Caja',
      html: `
        <div style="text-align:left;max-width:100%;overflow:hidden">
          <label style="font-size:0.8rem;font-weight:700">Monto inicial en caja (base COP $)</label>
          <input id="ap-base" type="text" inputmode="numeric" class="swal2-input" placeholder="Ej. 100.000" style="width:100%;max-width:100%;box-sizing:border-box;margin:0.35em 0;padding:0.55em 0.75em;font-size:1rem;">
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Abrir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D4AF37',
      didOpen: () => {
        const base = document.getElementById('ap-base') as HTMLInputElement;
        base.addEventListener('input', () => {
          const n = parseInt(base.value.replace(/\D/g, ''), 10) || 0;
          base.value = n > 0 ? n.toLocaleString('es-CO') : '';
        });
      },
      preConfirm: () => {
        const raw = (document.getElementById('ap-base') as HTMLInputElement).value.replace(/\D/g, '');
        return { base: raw ? parseInt(raw, 10) : 0 };
      }
    });
    if (value !== undefined) {
      this.api.openCash(+value.base || 0).subscribe({
        next: () => { this.loadData(); Swal.fire('✅', 'Caja abierta', 'success'); },
        error: (err: any) => Swal.fire('❌ Error', err.error?.message || 'No se pudo abrir', 'error')
      });
    }
  }

  movimiento(tipo: 'entrada' | 'salida'): void {
    const esEntrada = tipo === 'entrada';
    const campo = 'width:100%;max-width:100%;box-sizing:border-box;margin:0.35em 0;padding:0.55em 0.75em;font-size:1rem;';
    Swal.fire({
      title: esEntrada ? '🟢 Registrar Entrada de Dinero' : '🔴 Registrar Salida de Dinero',
      html: `
        <div style="text-align:left;max-width:100%;overflow:hidden">
          <label style="font-size:0.8rem;font-weight:700">Monto (COP $) *</label>
          <input id="mov-monto" type="text" inputmode="numeric" class="swal2-input" placeholder="Ej. 50.000" style="${campo}">
          <label style="font-size:0.8rem;font-weight:700">Método *</label>
          <select id="mov-metodo" class="swal2-select" style="${campo}">
            <option value="efectivo">💵 Efectivo</option>
            <option value="tarjeta">💳 Tarjeta / Datáfono</option>
            <option value="transferencia">📱 Transferencia</option>
          </select>
          <label style="font-size:0.8rem;font-weight:700">Concepto *</label>
          <input id="mov-concepto" type="text" class="swal2-input" placeholder="${esEntrada ? 'Sencillo adicional' : 'Pago proveedor de hielo'}" style="${campo}">
          <p style="font-size:0.72rem;color:#777;margin:0.3em 0 0">Solo el efectivo mueve el esperado de gaveta.</p>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      confirmButtonColor: esEntrada ? '#2E8B57' : '#D32F2F',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const monto = document.getElementById('mov-monto') as HTMLInputElement;
        monto.addEventListener('input', () => {
          const n = parseInt(monto.value.replace(/\D/g, ''), 10) || 0;
          monto.value = n > 0 ? n.toLocaleString('es-CO') : '';
        });
      },
      preConfirm: () => {
        const monto = parseInt((document.getElementById('mov-monto') as HTMLInputElement).value.replace(/\D/g, ''), 10) || 0;
        const metodo = (document.getElementById('mov-metodo') as HTMLSelectElement).value as 'efectivo' | 'tarjeta' | 'transferencia';
        const concepto = (document.getElementById('mov-concepto') as HTMLInputElement).value.trim();
        if (!(monto > 0)) { Swal.showValidationMessage('El monto debe ser mayor a 0'); return false; }
        if (!concepto) { Swal.showValidationMessage('El concepto es obligatorio'); return false; }
        return { tipo, amount: monto, concept: concepto, method: metodo };
      }
    }).then((res) => {
      if (res.isConfirmed) {
        this.api.addCashMovement(this.currentCash.cashClosing._id, res.value).subscribe({
          next: () => { this.loadData(); Swal.fire({ icon: 'success', title: 'Movimiento registrado', timer: 1500, showConfirmButton: false }); },
          error: (err: any) => Swal.fire('❌ Error', err.error?.message || 'No se pudo registrar', 'error')
        });
      }
    });
  }

  closeCash(): void {
    const d = this.currentCash?.desglose;
    const espTarjeta = (d?.ventasPorMetodo?.tarjeta || 0) + (d?.eventosPorMetodo?.tarjeta || 0);
    const espTransf = (d?.ventasPorMetodo?.transferencia || 0) + (d?.eventosPorMetodo?.transferencia || 0);
    const campo = 'width:100%;max-width:100%;box-sizing:border-box;margin:0.35em 0;padding:0.55em 0.75em;font-size:1rem;';
    const filas = d ? `
      <table style="width:100%;font-size:0.85rem;text-align:left;margin-bottom:0.6rem">
        <tr><td>Efectivo (ventas)</td><td style="text-align:right"><strong>${this.fmt(d.ventasPorMetodo?.efectivo)}</strong></td></tr>
        <tr><td>Tarjeta / Datáfono</td><td style="text-align:right">${this.fmt(d.ventasPorMetodo?.tarjeta)}</td></tr>
        <tr><td>Transferencias</td><td style="text-align:right">${this.fmt(d.ventasPorMetodo?.transferencia)}</td></tr>
        <tr><td>Mixto</td><td style="text-align:right">${this.fmt(d.ventasPorMetodo?.mixto)}</td></tr>
        <tr><td>Abonos eventos</td><td style="text-align:right">${this.fmt(d.abonosEventos)}</td></tr>
        <tr><td>(+) Entradas / (−) Salidas</td><td style="text-align:right">${this.fmt(d.entradas)} / ${this.fmt(d.salidas)}</td></tr>
        <tr><td><strong>Efectivo esperado</strong></td><td style="text-align:right"><strong>${this.fmt(d.efectivoEsperado)}</strong></td></tr>
      </table>` : '';
    Swal.fire({
      title: '🔒 Cerrar Caja',
      html: `${filas}
        <div style="text-align:left;max-width:100%;overflow:hidden">
          <label style="font-size:0.8rem;font-weight:700">Dinero en efectivo (COP $) *</label>
          <input id="swal-actual" class="swal2-input" type="text" inputmode="numeric" placeholder="Cuente la gaveta · Ej. 250.000" style="${campo}">
          <label style="font-size:0.8rem;font-weight:700">Transferencias (COP $) — esperado ${this.fmt(espTransf)}</label>
          <input id="swal-transf" class="swal2-input" type="text" inputmode="numeric" placeholder="Opcional · Ej. 120.000" style="${campo}">
          <label style="font-size:0.8rem;font-weight:700">Tarjeta / Datáfono (COP $) — esperado ${this.fmt(espTarjeta)}</label>
          <input id="swal-tarjeta" class="swal2-input" type="text" inputmode="numeric" placeholder="Opcional · Ej. 300.000" style="${campo}">
          <label style="font-size:0.8rem;font-weight:700">Notas (opcional)</label>
          <textarea id="swal-notes" class="swal2-textarea" style="width:100%;max-width:100%;box-sizing:border-box;margin:0.35em 0;" rows="2"></textarea>
        </div>`,
      showCancelButton: true, confirmButtonText: 'Cerrar Caja', confirmButtonColor: '#FF1744',
      cancelButtonText: 'Volver',
      didOpen: () => {
        ['swal-actual', 'swal-transf', 'swal-tarjeta'].forEach((id) => {
          const el = document.getElementById(id) as HTMLInputElement;
          el.addEventListener('input', () => {
            const n = parseInt(el.value.replace(/\D/g, ''), 10) || 0;
            el.value = n > 0 ? n.toLocaleString('es-CO') : '';
          });
        });
      },
      preConfirm: () => {
        const num = (id: string) => {
          const raw = (document.getElementById(id) as HTMLInputElement).value.replace(/\D/g, '');
          return raw ? parseInt(raw, 10) : null;
        };
        const actualCash = num('swal-actual');
        if (actualCash === null) { Swal.showValidationMessage('Cuenta el dinero en efectivo de la gaveta'); return false; }
        return {
          actualCash,
          actualTransferencia: num('swal-transf'),
          actualTarjeta: num('swal-tarjeta'),
          notes: (document.getElementById('swal-notes') as HTMLTextAreaElement).value
        };
      }
    }).then((res) => {
      if (res.isConfirmed) {
        this.api.closeCash(this.currentCash.cashClosing._id, res.value).subscribe({
          next: (cerrada: any) => {
            this.loadData();
            this.verZ(cerrada);
            Swal.fire({ icon: 'success', title: 'Caja cerrada: Reporte Z generado', timer: 1800, showConfirmButton: false });
          },
          error: (err: any) => Swal.fire('❌ Error', err.error?.message || 'No se pudo cerrar', 'error')
        });
      }
    });
  }

  // —— Reporte Z: ver / imprimir / PDF ————————————————————————————

  // Cierres viejos (sin snapshot) se reconstruyen en modo básico desde los
  // totales planos para no dejar el historial sin comprobante.
  zDe(c: any): any {
    if (c?.reporteZ) return c.reporteZ;
    return {
      titulo: 'Reporte Z - Cierre de Caja',
      apertura: c.openedAt, cierre: c.closedAt,
      cajero: c.user?.name || '',
      baseInicial: c.initialAmount || 0,
      ventasBrutas: c.totalSales || 0,
      abonosEventos: 0,
      ventasPorMetodo: null,
      impuestos: { base: 0, impoconsumo: 0, iva: 0, nota: 'Cierre anterior al desglose por método.' },
      propinas: { total: 0 },
      movimientos: c.movements || [],
      entradasTotal: c.entradas || 0,
      salidasTotal: c.salidas || 0,
      efectivoEsperado: c.expectedCash || 0,
      efectivoReal: c.actualCash,
      diferencia: c.difference || 0,
      conteoPorMetodo: c.reporteZ?.conteoPorMetodo || null,
      notas: c.notes || ''
    };
  }

  verZ(c: any): void {
    this.zActual = this.zDe(c);
    this.showZ = true;
  }

  imprimirZ(c: any): void {
    this.printZ80(this.zDe(c));
  }

  imprimirZactual(): void {
    if (this.zActual) this.printZ80(this.zActual);
  }

  descargarZpdf(c: any): void {
    this.pdfZ(this.zDe(c));
  }

  descargarZpdfActual(): void {
    if (this.zActual) this.pdfZ(this.zActual);
  }

  private printZ80(z: any): void {
    const f = (n: any) => this.fmt(n);
    const fila = (l: string, v: string) =>
      `<div class="r"><span>${l}</span><strong>${v}</strong></div>`;
    const met = z.ventasPorMetodo;
    const cm = z.conteoPorMetodo;
    const linMet = (cond: boolean, l: string, v: any) => cond ? fila(l, f(v)) : '';
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Reporte Z</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;font-size:11px;width:80mm;padding:4mm;color:#000}
      h1{font-size:14px;text-align:center}h2{font-size:11px;text-align:center;margin:2px 0}hr{border:none;border-top:1px dashed #000;margin:6px 0}
      .r{display:flex;justify-content:space-between;margin:1px 0}.c{text-align:center}.big{font-size:13px}.tot{font-size:12px}
      .toolbar{display:none}</style></head><body>
      <h1>La Soupe à l'Oignon</h1>
      <h2>REPORTE Z — CIERRE DE CAJA</h2>
      <div class="c">Apertura: ${new Date(z.apertura).toLocaleString('es-CO')}<br>Cierre: ${z.cierre ? new Date(z.cierre).toLocaleString('es-CO') : '—'}<br>Cajero: ${z.cajero || '—'}</div><hr>
      ${fila('Ventas brutas', f(z.ventasBrutas))}${fila('Abonos eventos', f(z.abonosEventos))}${fila('Impuestos', f(0))}${fila('Propinas', f(z.propinas?.total))}<hr>
      ${met ? fila('Efectivo', f(met.efectivo)) + fila('Tarjeta', f(met.tarjeta)) + fila('Transf.', f(met.transferencia)) + fila('Mixto', f(met.mixto)) : ''}<hr>
      ${fila('Base inicial', f(z.baseInicial))}${fila('(+) Entradas', f(z.entradasTotal))}${fila('(−) Salidas', f(z.salidasTotal))}<hr>
      ${(z.movimientos || []).map((m: any) => fila((m.tipo === 'entrada' ? '+' : '−') + ' ' + m.concept + ' [' + this.metodoCorto(m.method) + ']', f(m.amount))).join('')}
      ${(z.movimientos || []).length ? '<hr>' : ''}
      ${fila('Esperado', f(z.efectivoEsperado))}${fila('Contado', f(z.efectivoReal))}
      <div class="r tot"><span>DIFERENCIA</span><strong>${f(z.diferencia)}</strong></div>
      ${linMet(!!cm && cm.tarjetaContado != null, 'Tarjeta contada (esp. ' + f(cm?.tarjetaEsperado) + ')', cm?.tarjetaContado)}
      ${linMet(!!cm && cm.tarjetaDiferencia != null, 'Dif. tarjeta', cm?.tarjetaDiferencia)}
      ${linMet(!!cm && cm.transferenciaContado != null, 'Transf. (esp. ' + f(cm?.transferenciaEsperado) + ')', cm?.transferenciaContado)}
      ${linMet(!!cm && cm.transferenciaDiferencia != null, 'Dif. transf.', cm?.transferenciaDiferencia)}
      <div class="c">Documento interno — no válido como factura</div>
      <script>window.onload=()=>window.print()<\/script></body></html>`;
    const win = window.open('', '_blank', 'width=320,height=700');
    if (win) { win.document.write(html); win.document.close(); win.focus(); }
  }

  private pdfZ(z: any): void {
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const f = (n: any) => '$' + (Math.round(Number(n) || 0)).toLocaleString('es-CO');
    const L = 15; let y = 18;
    const titulo = (t: string) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(t, L, y); y += 3; doc.setDrawColor(180); doc.line(L, y, 200, y); y += 6; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); };
    const fila = (l: string, v: string, negrita = false) => { doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.text(l, L, y); doc.text(v, 200, y, { align: 'right' }); y += 5.5; if (y > 255) { doc.addPage(); y = 18; } };

    doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text("La Soupe à l'Oignon", 108, y, { align: 'center' }); y += 7;
    doc.setFontSize(12); doc.text('Reporte Z — Cierre de Caja', 108, y, { align: 'center' }); y += 9;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    titulo('Encabezado');
    fila('Apertura', z.apertura ? new Date(z.apertura).toLocaleString('es-CO') : '—');
    fila('Cierre', z.cierre ? new Date(z.cierre).toLocaleString('es-CO') : '—');
    fila('Cajero', z.cajero || '—');
    titulo('Resumen de ingresos');
    fila('Ventas brutas totales', f(z.ventasBrutas), true);
    fila('Abonos de eventos', f(z.abonosEventos));
    fila('Impuestos (base / impoconsumo / IVA)', f(0));
    doc.setFontSize(8); doc.text(String(z.impuestos?.nota || ''), L, y, { maxWidth: 185 }); y += 9; doc.setFontSize(10);
    fila('Propinas recaudadas (no suman a venta)', f(z.propinas?.total));
    titulo('Desglose por medios de pago');
    if (z.ventasPorMetodo) {
      fila('Efectivo', f(z.ventasPorMetodo.efectivo));
      fila('Tarjeta / Datáfono', f(z.ventasPorMetodo.tarjeta));
      fila('Transferencias', f(z.ventasPorMetodo.transferencia));
      fila('Mixto', f(z.ventasPorMetodo.mixto));
    } else {
      fila('Total (sin desglose por método)', f(z.ventasBrutas));
    }
    titulo('Movimientos de caja');
    fila('Base inicial', f(z.baseInicial));
    fila('(+) Entradas registradas', f(z.entradasTotal));
    fila('(–) Salidas registradas', f(z.salidasTotal));
    (z.movimientos || []).forEach((m: any) => fila(`${m.tipo === 'entrada' ? '(+)' : '(–)'} ${m.concept} [${this.metodoCorto(m.method)}]`, f(m.amount)));
    titulo('Auditoría física (arqueo)');
    fila('Efectivo esperado en gaveta', f(z.efectivoEsperado), true);
    fila('Efectivo real contado', f(z.efectivoReal), true);
    fila(`Diferencia (${(z.diferencia || 0) < 0 ? 'faltante' : (z.diferencia || 0) > 0 ? 'sobrante' : 'cuadra'})`, f(z.diferencia), true);
    const cm2 = z.conteoPorMetodo;
    if (cm2 && cm2.tarjetaContado != null) fila(`Tarjeta contada (esp. ${f(cm2.tarjetaEsperado)})`, f(cm2.tarjetaContado));
    if (cm2 && cm2.tarjetaDiferencia != null) fila('Diferencia tarjeta', f(cm2.tarjetaDiferencia));
    if (cm2 && cm2.transferenciaContado != null) fila(`Transferencias (esp. ${f(cm2.transferenciaEsperado)})`, f(cm2.transferenciaContado));
    if (cm2 && cm2.transferenciaDiferencia != null) fila('Diferencia transferencias', f(cm2.transferenciaDiferencia));
    if (z.notas) fila('Notas', String(z.notas));
    y += 4;
    doc.setFontSize(8); doc.text('Documento interno — no válido como factura. Generado por el sistema.', L, y);

    const nombre = `reporte-z-${new Date(z.cierre || Date.now()).toISOString().slice(0, 10)}.pdf`;
    doc.save(nombre);
  }
}
