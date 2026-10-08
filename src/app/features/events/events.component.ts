import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-events',
  template: `
    <div class="page-header">
      <h1>📅 Eventos y Catering</h1>
      <div class="header-actions">
        <div class="view-toggle" title="Vista del calendario">
          <button [class.active]="viewMode === 'mes'" (click)="setView('mes')">Mes</button>
          <button [class.active]="viewMode === 'semana'" (click)="setView('semana')">Semana</button>
          <button [class.active]="viewMode === 'dia'" (click)="setView('dia')">Día</button>
        </div>
        <button class="btn btn-primary" (click)="openForm()">+ Nuevo</button>
      </div>
    </div>

    <div class="tabs-inline" style="margin-bottom:1rem">
      <button class="tab-btn" [class.active]="vista === 'evento'" (click)="vista = 'evento'">
        🎉 Evento ({{ contar('evento_local') }})
      </button>
      <button class="tab-btn" [class.active]="vista === 'catering'" (click)="vista = 'catering'">
        🍱 Catering ({{ contar('catering_externo') }})
      </button>
    </div>

    <div class="ev-layout">
      <aside class="ev-side">
        <div class="mini-cal">
          <div class="mini-head">
            <button class="cal-nav" (click)="mesAnterior()" title="Mes anterior">‹</button>
            <strong>{{ nombreMes() }}</strong>
            <button class="cal-nav" (click)="mesSiguiente()" title="Mes siguiente">›</button>
          </div>
          <div class="mini-grid mini-weekdays">
            <div *ngFor="let d of ['L','M','X','J','V','S','D']">{{ d }}</div>
          </div>
          <div class="mini-grid">
            <button *ngFor="let dia of diasCalendario"
                    class="mini-day"
                    [class.other]="!dia.inMonth"
                    [class.today]="dia.key === hoyKey"
                    [class.selected]="dia.key === anchorKey"
                    [class.pasado]="dia.pasado && dia.eventos.length === 0"
                    [class.dot]="dia.eventos.length > 0"
                    (click)="irDia(dia.key)">{{ dia.num }}</button>
          </div>
        </div>
        <div class="legend">
          <div class="legend-title">Estados</div>
          <div class="legend-item"><span class="swatch chip-pendiente"></span> Pendiente</div>
          <div class="legend-item"><span class="swatch chip-confirmado"></span> Confirmado</div>
          <div class="legend-item"><span class="swatch chip-realizado"></span> Realizado</div>
          <div class="legend-item"><span class="swatch chip-cancelado"></span> Cancelado</div>
        </div>
      </aside>

      <div class="ev-main">
        <div class="ev-toolbar">
          <button class="cal-nav" (click)="navegar(-1)" title="Anterior">‹</button>
          <button class="cal-today" (click)="irHoy()">Hoy</button>
          <button class="cal-nav" (click)="navegar(1)" title="Siguiente">›</button>
          <h2 class="cal-title">{{ tituloVista() }}</h2>
          <input class="input-field ev-search" placeholder="🔍 Buscar cliente..." [(ngModel)]="filtroCliente" />
          <select class="input-field ev-filter" [(ngModel)]="filtroEstado" title="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="realizado">Realizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div class="notion-cal" *ngIf="viewMode === 'mes'">
          <div class="cal-grid cal-weekdays">
            <div *ngFor="let d of ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']">{{ d }}</div>
          </div>
          <div class="cal-grid cal-days">
            <div *ngFor="let dia of diasCalendario"
                 class="cal-day"
                 [class.other-month]="!dia.inMonth"
                 [class.today]="dia.key === hoyKey"
                 [class.pasado]="dia.pasado && dia.eventos.length === 0"
                 [class.has-events]="dia.eventos.length > 0"
                 (click)="abrirDia(dia)">
              <div class="cal-daynum" [class.today-badge]="dia.key === hoyKey">{{ dia.num }}</div>
              <div class="cal-events">
                <div *ngFor="let ev of dia.eventos.slice(0, 3)"
                     class="cal-chip"
                     [ngClass]="['chip-' + estadoVisible(ev), 'tipo-' + ev.eventType]"
                     title="{{ ev.customerName }} — {{ estadoLabel(estadoVisible(ev)) }}">
                  <span class="chip-time">{{ horaCorta(ev.eventDate) }}</span>
                  <span class="chip-name">{{ ev.customerName }}</span>
                  <span class="chip-pax" *ngIf="ev.numberOfAttendees > 0">👥{{ ev.numberOfAttendees }}</span>
                </div>
                <div *ngIf="dia.eventos.length > 3" class="cal-more">+{{ dia.eventos.length - 3 }} más</div>
              </div>
            </div>
          </div>
          <div *ngIf="eventosFiltrados.length === 0" class="cal-empty">
            No hay {{ vista === 'evento' ? 'eventos' : 'caterings' }} registrados
          </div>
        </div>

        <div class="week-view" *ngIf="viewMode === 'semana'">
          <div class="week-grid">
            <div *ngFor="let dia of diasSemana" class="week-col" [class.today]="dia.key === hoyKey">
              <div class="week-head" (click)="irDia(dia.key)" title="Ver día">
                <span class="week-dow">{{ nombreDiaCorto(dia.date) }}</span>
                <span class="week-num" [class.today-badge]="dia.key === hoyKey">{{ dia.num }}</span>
              </div>
              <div class="week-events">
                <button *ngFor="let ev of dia.eventos"
                        class="week-ev"
                        [ngClass]="['chip-' + estadoVisible(ev), 'tipo-' + ev.eventType]"
                        [attr.title]="(ev.theme || ev.customerName) + ' — ' + estadoLabel(estadoVisible(ev))"
                        (click)="abrirEvento(ev); $event.stopPropagation()">
                  <strong>{{ horaCorta(ev.eventDate) }}{{ ev.endDate ? ' → ' + horaCorta(ev.endDate) : '' }}</strong>
                  <span>{{ ev.theme || ev.customerName }}</span>
                  <span class="chip-pax" *ngIf="ev.numberOfAttendees > 0">👥 {{ ev.numberOfAttendees }}</span>
                </button>
                <div *ngIf="dia.eventos.length === 0" class="week-vacio" [class.pasado]="dia.pasado" (click)="ofrecerAgendar(dia.date)" title="Agendar"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="day-view" *ngIf="viewMode === 'dia'">
          <h3 class="day-title">{{ nombreDiaLargo() }}</h3>
          <div class="timeline">
            <div *ngFor="let h of horasDia" class="tl-row">
              <div class="tl-hour">{{ h }}:00</div>
              <div class="tl-slot">
                <button *ngFor="let ev of eventosEnHora(h)"
                        class="tl-ev"
                        [ngClass]="['chip-' + estadoVisible(ev), 'tipo-' + ev.eventType]"
                        [attr.title]="(ev.theme || ev.customerName) + ' — ' + estadoLabel(estadoVisible(ev))"
                        (click)="abrirEvento(ev)">
                  <strong>{{ horaCorta(ev.eventDate) }}{{ ev.endDate ? ' → ' + horaCorta(ev.endDate) : '' }}</strong>
                  <span>{{ ev.theme || ev.customerName }}</span>
                  <span class="chip-pax" *ngIf="ev.numberOfAttendees > 0">👥 {{ ev.numberOfAttendees }}</span>
                  <span class="prop-pill" [ngClass]="'pill-' + ev.status">{{ estadoLabel(ev.status) }}</span>
                </button>
              </div>
            </div>
          </div>
          <div *ngIf="eventosDia.length === 0" class="cal-empty">
            No hay eventos este día.
            <button *ngIf="!esDiaPasado(anchorDate)" class="btn btn-primary" style="margin-top:0.5rem" (click)="ofrecerAgendar(anchorDate)">¿Desea agendar evento?</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Drawer lateral de detalle -->
    <div class="drawer-overlay" *ngIf="showDrawer" (click)="cerrarDrawer()">
      <aside class="drawer" (click)="$event.stopPropagation()" *ngIf="selectedEv">
        <div class="drawer-head" [ngClass]="'tipo-' + selectedEv.eventType">
          <div>
            <div class="drawer-kicker">{{ selectedEv.eventType === 'catering_externo' ? '🍱 CATERING' : '🎉 EVENTO' }}</div>
            <h2>{{ selectedEv.theme || selectedEv.customerName }}</h2>
            <span class="prop-pill" [ngClass]="'pill-' + estadoVisible(selectedEv)">{{ estadoLabel(estadoVisible(selectedEv)) }}</span>
          </div>
          <button class="close-btn" (click)="cerrarDrawer()">✕</button>
        </div>
        <div class="drawer-body">
          <div class="drawer-section">👤 Cliente</div>
          <p><strong>{{ selectedEv.customerName }}</strong><br>{{ selectedEv.customerPhone }} {{ selectedEv.customerEmail }}</p>
          <div class="drawer-section">🕐 Fecha y asistentes</div>
          <p>{{ fechaLarga(selectedEv.eventDate) }}<span *ngIf="selectedEv.endDate"> → {{ horaCorta(selectedEv.endDate) }}</span><br>
          <span *ngIf="selectedEv.setupTime">Montaje: {{ fechaLarga(selectedEv.setupTime) }}<br></span>
          <span *ngIf="selectedEv.numberOfAttendees > 0">👥 {{ selectedEv.numberOfAttendees }} asistentes</span></p>
          <div class="drawer-section" *ngIf="selectedEv.kitchenMenu || selectedEv.barMenu || selectedEv.otherMenu">🍽️ Menú</div>
          <p *ngIf="selectedEv.kitchenMenu" style="white-space:pre-wrap"><strong>Cocina:</strong> {{ selectedEv.kitchenMenu }}</p>
          <p *ngIf="selectedEv.barMenu" style="white-space:pre-wrap"><strong>Bebidas:</strong> {{ selectedEv.barMenu }}</p>
          <p *ngIf="selectedEv.otherMenu" style="white-space:pre-wrap"><strong>Otros:</strong> {{ selectedEv.otherMenu }}</p>
          <div class="drawer-section" *ngIf="selectedEv.staffAssigned || selectedEv.rentals">📋 Operación</div>
          <p *ngIf="selectedEv.staffAssigned" style="white-space:pre-wrap"><strong>Personal:</strong> {{ selectedEv.staffAssigned }}</p>
          <p *ngIf="selectedEv.rentals" style="white-space:pre-wrap"><strong>Equipos:</strong> {{ selectedEv.rentals }}</p>
          <div class="drawer-section">💰 Valores</div>
          <p>Total: <strong>$ {{ (selectedEv.totalCost || 0).toLocaleString('es-CO') }}</strong><br>
          Abonado: <strong>$ {{ getTotalPaid(selectedEv).toLocaleString('es-CO') }}</strong><br>
          Resta: <strong>$ {{ ((selectedEv.totalCost || 0) - getTotalPaid(selectedEv)).toLocaleString('es-CO') }}</strong></p>
          <div class="drawer-section">🪜 Plan de pagos (hitos)</div>
          <div *ngIf="!selectedEv.milestones?.length" class="drawer-hint">Sin hitos. Agregue el anticipo acordado con el cliente.</div>
          <div *ngFor="let h of selectedEv.milestones" class="hito-row">
            <div class="hito-info">
              <strong>{{ h.etiqueta }}</strong>
              <span class="prop-pill" [ngClass]="hitoClass(h)">{{ hitoLabel(h) }}</span>
              <div class="hito-sub">$ {{ h.monto.toLocaleString('es-CO') }} · Abonado $ {{ abonadoHito(selectedEv, h).toLocaleString('es-CO') }}<span *ngIf="h.vencimiento"> · Vence {{ h.vencimiento | date:'dd MMM yyyy' }}</span></div>
            </div>
            <div class="hito-actions">
              <button class="btn btn-secondary btn-sm" (click)="addPayment(selectedEv, h._id)">💵 Abonar</button>
              <button class="btn btn-secondary btn-sm" (click)="eliminarHito(selectedEv, h)">✕</button>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top:0.4rem" (click)="agregarHito(selectedEv)">＋ Agregar hito</button>
          <div class="drawer-actions">
            <button class="btn btn-primary" (click)="abrirBEO(selectedEv)">🖨️ BEO</button>
            <button class="btn btn-secondary" (click)="openForm(selectedEv)">✏️ Editar</button>
            <button class="btn btn-secondary" (click)="addPayment(selectedEv)">💵 Pagos</button>
            <button class="btn btn-secondary" (click)="eliminarEvento(selectedEv)">🗑️ Eliminar</button>
          </div>
          <div class="drawer-section">📌 Estado</div>
          <div class="drawer-estados">
            <button *ngFor="let st of ['pendiente','confirmado','realizado','cancelado']"
                    class="prop-pill pill-btn" [ngClass]="'pill-' + st"
                    [class.current]="selectedEv.status === st"
                    (click)="cambiarEstado(selectedEv, st)">{{ estadoLabel(st) }}</button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Modal selector: día con más de un evento -->
    <div class="modal-overlay" *ngIf="showChooser" (click)="cerrarChooser()">
      <div class="modal-content chooser-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>📅 {{ tituloChooser() }}</h2>
          <button class="close-btn" (click)="cerrarChooser()">✕</button>
        </div>
        <div class="chooser-list">
          <p class="chooser-hint">Hay {{ eventosChooser.length }} en este día. ¿Cuál desea ver?</p>
          <button *ngFor="let ev of eventosChooser" class="chooser-item" (click)="abrirEvento(ev)" [attr.title]="ev.theme || ev.customerName">
            <span class="chooser-time">{{ horaCorta(ev.eventDate) }}{{ ev.endDate ? ' → ' + horaCorta(ev.endDate) : '' }}</span>
            <span class="chooser-name">{{ ev.theme || ev.customerName }}</span>
            <span class="prop-pill" [ngClass]="'pill-' + estadoVisible(ev)">{{ estadoLabel(estadoVisible(ev)) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Formulario -->
    <div class="modal-overlay" *ngIf="showForm">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar' : 'Nuevo' }} {{ vista === 'evento' ? 'Evento' : 'Catering' }}</h2>
          <button class="close-btn" (click)="closeForm()">✕</button>
        </div>
        <form (ngSubmit)="saveEvent()" #formCtrl="ngForm">
          <div class="form-group">
            <label>Nombre del Cliente *</label>
            <input type="text" class="input-field" name="customerName" [(ngModel)]="form.customerName" required>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Correo electrónico</label>
              <input type="email" class="input-field" name="customerEmail" [(ngModel)]="form.customerEmail" placeholder="cliente@correo.com">
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input type="text" class="input-field" name="customerPhone" [(ngModel)]="form.customerPhone">
            </div>
          </div>
          <div class="form-section">🕐 Cronograma</div>
          <div class="form-group">
            <label>Fecha del evento *</label>
            <input type="date" class="input-field" name="fechaEvento" [(ngModel)]="form.fechaEvento" required>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>▶️ Inicio *</label>
              <input type="time" class="input-field" name="horaInicio" [(ngModel)]="form.horaInicio" required title="Hora de inicio">
            </div>
            <div class="form-group">
              <label>🏁 Fin</label>
              <input type="time" class="input-field" name="horaFin" [(ngModel)]="form.horaFin" title="Hora de finalización">
            </div>
          </div>
          <div class="grid-2" style="margin-top:1rem">
            <div class="form-group">
              <label>Tema del evento</label>
              <input type="text" class="input-field" name="theme" [(ngModel)]="form.theme" placeholder="Ej. Cumpleaños, Grado">
            </div>
            <div class="form-group">
              <label>Número de Asistentes</label>
              <input type="number" class="input-field" name="numberOfAttendees" [(ngModel)]="form.numberOfAttendees">
            </div>
          </div>
          <div class="form-group">
            <label>Monto del evento (COP $) *</label>
            <div class="price-input-wrap">
              <span class="price-prefix">$</span>
              <input type="text" inputmode="numeric" class="input-field price-input" name="totalCost"
                [value]="totalCostDisplay" (input)="onTotalCostInput($event)"
                required minlength="1" placeholder="Ej. 1.500.000" autocomplete="off">
            </div>
            <small class="field-hint" *ngIf="form.totalCost > 0">$ {{ form.totalCost.toLocaleString('es-CO') }} COP</small>
          </div>
          <div class="form-section">🍽️ Menú</div>
          <div class="form-group">
            <label>Cocina</label>
            <textarea class="input-field" name="kitchenMenu" [(ngModel)]="form.kitchenMenu" rows="2"></textarea>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Bebidas</label>
              <textarea class="input-field" name="barMenu" [(ngModel)]="form.barMenu" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label>Otros</label>
              <textarea class="input-field" name="otherMenu" [(ngModel)]="form.otherMenu" rows="2"></textarea>
            </div>
          </div>
          <div class="form-section">📋 Servicio</div>
          <div class="grid-2">
            <div class="form-group">
              <label>Personal asignado</label>
              <textarea class="input-field" name="staffAssigned" [(ngModel)]="form.staffAssigned" rows="2" placeholder="Ej. 2 meseros, 1 cocinero, capitán"></textarea>
            </div>
            <div class="form-group">
              <label>Montaje y equipos</label>
              <textarea class="input-field" name="rentals" [(ngModel)]="form.rentals" rows="2" placeholder="Ej. decoración, sillas, sonido"></textarea>
            </div>
          </div>
          <div class="form-group">
            <label>⚠️ Alergias y restricciones</label>
            <textarea class="input-field" name="allergies" [(ngModel)]="form.allergies" rows="2" placeholder="Ej. maní, gluten, lactosa"></textarea>
          </div>
          <div class="form-group">
            <label>Anotaciones adicionales</label>
            <textarea class="input-field" name="notes" [(ngModel)]="form.notes" rows="2"></textarea>
          </div>
          
          <div class="modal-actions" style="justify-content: flex-end; margin-top: 1rem;">
            <button type="button" class="btn btn-secondary" (click)="closeForm()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="!formCtrl.form.valid || saving">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .status-select {
      background: var(--bg-input); color: var(--text-main);
      border: 1px solid var(--border); border-radius: 6px; padding: 0.3rem 0.5rem;
      font-size: 0.8rem; cursor: pointer; outline: none;
    }
    .status-select:focus { border-color: var(--brand-gold); }
    .badge-gold { background: rgba(212,175,55,0.15); color: #d4af37; border: 1px solid rgba(212,175,55,0.3); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; min-width: 0; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; min-width: 0; }
    @media (max-width: 640px) {
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
    }
    .price-input-wrap { position: relative; }
    .price-prefix {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      color: var(--brand-gold); font-weight: 700; font-size: 0.9rem;
    }
    .price-input { padding-left: 1.5rem !important; }
    .field-hint { display: block; margin-top: 0.25rem; font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
    /* Modal formulario: encaja en pantalla con desplazamiento interno */
    .modal-content {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
      width: 100%; max-width: 640px; max-height: 88vh;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .modal-header h2 { margin: 0; font-size: 1.1rem; }
    .modal-content form { overflow-y: auto; padding: 1.25rem; }
    .close-btn {
      background: none; border: 1px solid var(--border); border-radius: 8px;
      padding: 0.35rem 0.65rem; cursor: pointer; color: var(--text-muted);
      font-size: 0.9rem; flex-shrink: 0; transition: all 0.2s;
    }
    .close-btn:hover { border-color: #e74c3c; color: #e74c3c; }
    .form-section {
      font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--text-muted); margin: 1rem 0 0.4rem;
      border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;
    }
    .prop-row { display: flex; align-items: center; gap: 0.6rem; }
    .prop-row .prop-icon { width: 22px; text-align: center; flex-shrink: 0; }
    .prop-row .prop-input { flex: 1; }
    .tabs-inline { display: inline-flex; gap: 0.5rem; }
    .tab-btn {
      padding: 0.45rem 1.1rem; border-radius: 20px; border: 1px solid var(--border);
      background: var(--bg-input); color: var(--text-main);
      font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.15s;
    }
    .tab-btn.active { background: var(--brand-gold); color: #fff; border-color: var(--brand-gold); }
    /* Calendario estilo Notion Calendar */
    .notion-cal { background: transparent; max-width: 980px; margin: 0 auto; }
    .cal-header { display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.5rem; }
    .cal-title { flex: 1; margin: 0; font-size: 1.1rem; font-weight: 600; text-transform: capitalize; color: var(--text-main); }
    .cal-nav {
      border: none; background: none; color: var(--text-muted);
      font-size: 1.3rem; line-height: 1; cursor: pointer; padding: 0.2rem 0.55rem; border-radius: 6px;
    }
    .cal-nav:hover { background: rgba(0, 0, 0, 0.05); color: var(--text-main); }
    .cal-today {
      border: 1px solid var(--border); background: none; color: var(--text-main);
      font-size: 0.8rem; cursor: pointer; padding: 0.25rem 0.7rem; border-radius: 6px;
    }
    .cal-today:hover { background: rgba(0, 0, 0, 0.05); }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
    .cal-weekdays { border-bottom: 1px solid var(--border); }
    .cal-weekdays > div {
      text-align: right; font-size: 0.7rem; font-weight: 500; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.04em; padding: 0.3rem 0.5rem 0.3rem 0;
    }
    .cal-days { border-left: 1px solid var(--border); border-top: 1px solid var(--border); }
    .cal-day {
      min-height: 72px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);
      background: transparent; padding: 0.25rem 0.3rem; cursor: pointer; overflow: hidden;
    }
    .cal-day:hover { background: rgba(0, 0, 0, 0.03); }
    .cal-day.other-month { background: rgba(0, 0, 0, 0.015); }
    .cal-day.other-month .cal-daynum { color: #c9c9c9; }
    .cal-day.today { background: rgba(212, 175, 55, 0.05); }
    .cal-day.has-events { background: transparent; }
    .cal-day.pasado { opacity: 0.55; cursor: default; }
    .cal-day.pasado:hover { background: transparent; }
    .mini-day.pasado { opacity: 0.45; }
    .week-vacio.pasado { cursor: default; }
    .week-vacio.pasado:hover { background: transparent; color: #c4c4c4; }
    .cal-daynum { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.2rem; text-align: right; }
    .today-badge {
      display: inline-block; background: #eb5757; color: #fff !important; font-weight: 700;
      border-radius: 4px; padding: 1px 7px;
    }
    .cal-events { display: flex; flex-direction: column; gap: 2px; }
    .cal-chip {
      font-size: 0.7rem; border-radius: 3px; padding: 1px 5px; cursor: pointer;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      display: flex; gap: 4px; align-items: center; line-height: 1.5;
    }
    .chip-pendiente { background: #fbf3db; color: #8a6d00; }
    .chip-confirmado { background: #e3f0fc; color: #2b6cb0; }
    .chip-realizado { background: #dbf3e5; color: #276749; }
    .chip-cancelado { background: #f1f1f1; color: #a0aec0; text-decoration: line-through; }
    .chip-time { font-weight: 600; flex-shrink: 0; font-size: 0.65rem; opacity: 0.8; }
    .chip-name { overflow: hidden; text-overflow: ellipsis; }
    .cal-more { font-size: 0.68rem; color: var(--text-muted); padding-left: 5px; }
    .cal-empty { text-align: center; padding: 2rem; color: var(--text-muted); }
    /* Modal selector de evento */
    .chooser-modal { max-width: 480px; }
    .chooser-list { overflow-y: auto; padding: 1rem 1.25rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .chooser-hint { font-size: 0.85rem; color: var(--text-muted); margin: 0 0 0.25rem; }
    .chooser-item {
      display: flex; align-items: center; gap: 0.6rem; text-align: left;
      border: 1px solid var(--border); background: var(--bg-input); border-radius: 10px;
      padding: 0.6rem 0.8rem; cursor: pointer; font-size: 0.85rem; color: var(--text-main);
    }
    .chooser-item:hover { border-color: var(--brand-gold); }
    .chooser-time { font-weight: 800; flex-shrink: 0; }
    .chooser-name { flex: 1; min-width: 0; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
    .prop-pill {
      font-size: 0.78rem; font-weight: 600; border-radius: 4px; padding: 1px 8px;
      background: #eee; color: #666; flex-shrink: 0;
    }
    .pill-pendiente { background: rgba(255, 200, 0, 0.25); color: #8a6d00; }
    .pill-confirmado { background: rgba(66, 153, 225, 0.18); color: #2b6cb0; }
    .pill-realizado { background: rgba(72, 187, 120, 0.2); color: #276749; }
    .pill-cancelado { background: rgba(160, 174, 192, 0.25); color: #718096; }
    @media (max-width: 768px) {
      .cal-day { min-height: 52px; padding: 0.2rem; }
      .chip-name { display: none; }
    }
    /* —— Layout enriquecido: mini-cal + vistas + drawer ——————— */
    .header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; min-width: 0; }
    .view-toggle { display: inline-flex; border: 1px solid var(--border); border-radius: 20px; overflow: hidden; }
    .view-toggle button {
      border: none; background: var(--bg-input); color: var(--text-main);
      font-size: 0.8rem; font-weight: 700; padding: 0.45rem 1rem; cursor: pointer;
    }
    .view-toggle button.active { background: var(--brand-gold); color: #fff; }
    .ev-layout { display: flex; gap: 1.25rem; align-items: flex-start; }
    .ev-side { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 1rem; }
    .ev-main { flex: 1; min-width: 0; }
    .mini-cal { border: 1px solid var(--border); border-radius: 12px; padding: 0.6rem; background: var(--bg-card); }
    .mini-head { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; text-transform: capitalize; }
    .mini-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
    .mini-weekdays > div { text-align: center; font-size: 0.62rem; color: var(--text-muted); font-weight: 700; padding: 2px 0; }
    .mini-day {
      border: none; background: none; color: var(--text-main); font-size: 0.7rem;
      border-radius: 6px; padding: 3px 0; cursor: pointer; position: relative;
    }
    .mini-day:hover { background: rgba(0, 0, 0, 0.05); }
    .mini-day.other { color: #c9c9c9; }
    .mini-day.today { background: #eb5757; color: #fff; font-weight: 700; }
    .mini-day.selected { outline: 2px solid var(--brand-gold); }
    .mini-day.dot::after {
      content: ''; position: absolute; bottom: 1px; left: 50%; transform: translateX(-50%);
      width: 4px; height: 4px; border-radius: 50%; background: var(--brand-gold);
    }
    .legend { border: 1px solid var(--border); border-radius: 12px; padding: 0.7rem 0.8rem; background: var(--bg-card); font-size: 0.75rem; }
    .legend-title { font-weight: 800; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.35rem; }
    .legend-item { display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.25rem; }
    .swatch { width: 12px; height: 12px; border-radius: 4px; display: inline-block; flex-shrink: 0; }
    .tipo-evento_local { border-left: 3px solid #8b5cf6; }
    .tipo-catering_externo { border-left: 3px solid #0ea5e9; }
    .swatch.tipo-evento_local { background: #8b5cf6; border: none; }
    .swatch.tipo-catering_externo { background: #0ea5e9; border: none; }
    .ev-toolbar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .ev-toolbar .cal-title { font-size: 1.05rem; text-transform: capitalize; }
    .ev-search { max-width: 200px; margin-left: auto; }
    .ev-filter { max-width: 180px; }
    .cal-vacio { font-size: 0.65rem; color: #c4c4c4; font-style: italic; padding-left: 5px; }
    .chip-pax { flex-shrink: 0; font-size: 0.62rem; opacity: 0.85; }
    /* Vista semana */
    .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; }
    .week-col { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; min-height: 220px; background: var(--bg-card); }
    .week-col.today { border-color: var(--brand-gold); }
    .week-head { padding: 0.4rem 0.5rem; background: var(--bg-input); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .week-dow { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; }
    .week-num { font-size: 0.9rem; font-weight: 700; }
    .week-events { padding: 0.4rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .week-ev {
      border: none; border-radius: 6px; padding: 0.35rem 0.45rem; font-size: 0.7rem;
      cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 2px; color: inherit;
      min-width: 0; overflow-wrap: anywhere; line-height: 1.3;
    }
    .week-vacio { font-size: 0.68rem; color: #c4c4c4; font-style: italic; text-align: center; padding: 0.8rem 0.2rem; cursor: pointer; border-radius: 6px; }
    .week-vacio:hover { background: rgba(0, 0, 0, 0.04); color: var(--text-muted); }
    /* Vista día */
    .day-title { margin: 0 0 0.75rem; font-size: 1rem; text-transform: capitalize; }
    .timeline { display: flex; flex-direction: column; }
    .tl-row { display: flex; gap: 0.75rem; border-top: 1px solid var(--border); min-height: 44px; }
    .tl-row:last-child { border-bottom: 1px solid var(--border); }
    .tl-hour { width: 48px; flex-shrink: 0; font-size: 0.7rem; color: var(--text-muted); padding-top: 0.4rem; text-align: right; }
    .tl-slot { flex: 1; padding: 0.25rem 0; display: flex; flex-direction: column; gap: 0.3rem; }
    .tl-ev {
      border: none; border-radius: 8px; padding: 0.45rem 0.7rem; font-size: 0.78rem;
      cursor: pointer; display: flex; align-items: center; gap: 0.6rem; color: inherit; text-align: left;
      min-width: 0; flex-wrap: wrap; overflow-wrap: anywhere; line-height: 1.35;
    }
    /* Drawer lateral */
    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 60;
      display: flex; justify-content: flex-end;
    }
    .drawer {
      width: 380px; max-width: 92vw; height: 100%; overflow-y: auto;
      background: var(--bg-card); border-left: 1px solid var(--border);
      box-shadow: -12px 0 40px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
    .drawer-head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;
      padding: 1rem 1.1rem; border-bottom: 1px solid var(--border);
    }
    .drawer-head h2 { margin: 0.15rem 0 0.4rem; font-size: 1.05rem; }
    .drawer-kicker { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; color: var(--text-muted); }
    .drawer-body { padding: 0.9rem 1.1rem 1.5rem; font-size: 0.85rem; }
    .drawer-body p { margin: 0 0 0.6rem; }
    .drawer-section {
      font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--text-muted); border-bottom: 1px solid var(--border);
      padding-bottom: 0.2rem; margin: 0.9rem 0 0.4rem;
    }
    .drawer-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem; }
    .drawer-estados { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .pill-btn { border: none; cursor: pointer; opacity: 0.55; }
    .pill-btn.current { opacity: 1; outline: 2px solid currentColor; }
    .drawer-hint { font-size: 0.78rem; color: var(--text-muted); font-style: italic; margin-bottom: 0.4rem; }
    .hito-row {
      border: 1px solid var(--border); border-radius: 10px;
      padding: 0.55rem 0.7rem; margin-bottom: 0.45rem;
      display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
    }
    .hito-info { font-size: 0.82rem; display: flex; flex-direction: column; gap: 0.2rem; }
    .hito-sub { font-size: 0.72rem; color: var(--text-muted); }
    .hito-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
    .btn-sm { padding: 0.35rem 0.7rem; font-size: 0.75rem; }
    @media (max-width: 900px) {
      .ev-layout { flex-direction: column; min-width: 0; }
      .ev-side { width: 100%; flex-direction: row; flex-wrap: wrap; }
      .mini-cal, .legend { flex: 1 1 220px; min-width: 0; }
      .week-grid { grid-template-columns: 1fr 1fr; }
      .header-actions { width: 100%; }
      .ev-search, .ev-filter { flex: 1 1 140px; min-width: 0; max-width: 100%; }
      .cal-day { min-height: 52px; }
    }
    @media (max-width: 520px) {
      .ev-side { flex-direction: column; }
      .week-grid { grid-template-columns: 1fr; }
      .view-toggle { width: 100%; }
      .view-toggle button { flex: 1; }
      .modal-content form { padding: 1rem 0.85rem; }
      .cal-weekdays > div { font-size: 0.6rem; padding: 0.25rem 0.1rem; }
    }
  `]
})
export class EventsComponent implements OnInit {
  events: any[] = [];
  vista: 'evento' | 'catering' = 'evento';
  viewMode: 'mes' | 'semana' | 'dia' = 'mes';
  anchorDate: Date = new Date();
  filtroCliente = '';
  filtroEstado = '';
  calYear = 0;
  calMonth = 0;
  hoyKey = '';
  showForm = false;
  saving = false;
  editingId: string | null = null;
  showDrawer = false;
  selectedEv: any = null;
  horasDia: number[] = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  form: any = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    eventType: 'evento_local',
    eventDate: '',
    endDate: '',
    setupTime: '',
    theme: '',
    numberOfAttendees: 0,
    kitchenMenu: '',
    barMenu: '',
    otherMenu: '',
    staffAssigned: '',
    rentals: '',
    allergies: '',
    serviceNotes: '',
    totalCost: 0,
    notes: ''
  };
  showChooser = false;
  eventosChooser: any[] = [];
  chooserKey = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.calYear = hoy.getFullYear();
    this.calMonth = hoy.getMonth();
    this.hoyKey = this.fechaKey(hoy);
    this.load();
  }

  load(): void {
    this.api.getEvents().subscribe({
      next: (res) => this.events = res
    });
  }

  get eventosFiltrados(): any[] {
    const tipo = this.vista === 'evento' ? 'evento_local' : 'catering_externo';
    const cli = (this.filtroCliente || '').toLowerCase().trim();
    return this.events.filter(e => {
      if (e.eventType !== tipo) return false;
      if (this.filtroEstado && e.status !== this.filtroEstado) return false;
      if (cli && !(e.customerName || '').toLowerCase().includes(cli)) return false;
      return true;
    });
  }

  contar(tipo: string): number {
    return this.events.filter(e => e.eventType === tipo).length;
  }

  // —— Calendario ————————————————————————————————————————————
  fechaKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  claveEvento(ev: any): string {
    if (!ev.eventDate) return '';
    const d = new Date(ev.eventDate);
    return this.fechaKey(d);
  }

  nombreMes(): string {
    return new Date(this.calYear, this.calMonth, 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  mesAnterior(): void {
    const d = new Date(this.calYear, this.calMonth - 1, 1);
    this.calYear = d.getFullYear();
    this.calMonth = d.getMonth();
  }

  mesSiguiente(): void {
    const d = new Date(this.calYear, this.calMonth + 1, 1);
    this.calYear = d.getFullYear();
    this.calMonth = d.getMonth();
  }

  mesActual(): void {
    const hoy = new Date();
    this.calYear = hoy.getFullYear();
    this.calMonth = hoy.getMonth();
  }

  get diasCalendario(): any[] {
    // Semana Lun-Dom
    const primero = new Date(this.calYear, this.calMonth, 1);
    const desfase = (primero.getDay() + 6) % 7;
    const inicio = new Date(this.calYear, this.calMonth, 1 - desfase);
    const porDia: Record<string, any[]> = {};
    this.eventosFiltrados.forEach(ev => {
      const k = this.claveEvento(ev);
      if (!k) return;
      (porDia[k] = porDia[k] || []).push(ev);
    });
    Object.values(porDia).forEach(lista =>
      lista.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()));
    const dias: any[] = [];
    for (let i = 0; i < 42; i++) {
      const f = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      const key = this.fechaKey(f);
      dias.push({ date: f, num: f.getDate(), key, inMonth: f.getMonth() === this.calMonth, eventos: porDia[key] || [], pasado: key < this.hoyKey });
    }
    return dias;
  }

  estadoLabel(status: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente', confirmado: 'Confirmado',
      realizado: 'Realizado', cancelado: 'Cancelado'
    };
    return labels[status] || status;
  }

  // —— Días pasados: solo consulta ———————————————————————————————
  // Compara por fecha-calendario (ignora la hora) en hora local.
  esDiaPasado(fecha: Date | string): boolean {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return false;
    const hoy = new Date();
    const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    return dia < base;
  }

  // Estado para mostrar: lo pasado no cancelado cuenta como realizado.
  // Solo visual — no reescribe el estado guardado.
  estadoVisible(ev: any): string {
    if (!ev) return '';
    if ((ev.status === 'pendiente' || ev.status === 'confirmado')
      && ev.eventDate && this.esDiaPasado(ev.eventDate)) {
      return 'realizado';
    }
    return ev.status;
  }

  horaCorta(fecha: any): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // La creación: botón "+ Nuevo evento" abre sin fecha;
  // clic en día vacío pregunta "¿Desea agendar evento?" y pre-llena la fecha.
  // Clic en día con eventos abre el drawer (1 directo, varios vía selector).
  // En días pasados NO se agenda: solo se consultan eventos ya registrados.
  abrirDia(dia: any): void {
    const lista = (dia.eventos || []).slice().sort((a: any, b: any) =>
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    if (lista.length === 0) {
      if (this.esDiaPasado(dia.date)) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'En días pasados no se pueden agendar eventos nuevos', timer: 2200, showConfirmButton: false });
        return;
      }
      this.ofrecerAgendar(dia.date);
      return;
    }
    if (lista.length === 1) {
      this.abrirEvento(lista[0]);
      return;
    }
    this.eventosChooser = lista;
    this.chooserKey = dia.key;
    this.showChooser = true;
  }

  ofrecerAgendar(fecha: Date): void {
    if (this.esDiaPasado(fecha)) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'En días pasados no se pueden agendar eventos nuevos', timer: 2200, showConfirmButton: false });
      return;
    }
    const nombre = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
      .toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    Swal.fire({
      title: this.vista === 'evento' ? '¿Desea agendar evento?' : '¿Desea agendar servicio de catering?',
      text: `${nombre}`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then((res) => {
      if (res.isConfirmed) this.openForm(undefined, fecha);
    });
  }

  abrirEvento(ev: any): void {
    this.cerrarChooser();
    this.selectedEv = ev;
    this.showDrawer = true;
  }

  cerrarDrawer(): void {
    this.showDrawer = false;
    this.selectedEv = null;
  }

  cambiarEstado(ev: any, st: string): void {
    this.updateStatus(ev, st);
  }

  eliminarEvento(ev: any): void {
    Swal.fire({
      title: '¿Eliminar este evento?',
      text: `${ev.customerName} · ${this.fechaLarga(ev.eventDate)}`,
      icon: 'warning',
      html: `
        <div style="text-align:left;font-size:0.9rem;">
          <p style="margin:0 0 0.5rem;">${ev.customerName} · ${this.fechaLarga(ev.eventDate)}</p>
          <div class="form-group" style="margin-top:10px">
            <label style="display:block;font-size:0.8rem;font-weight:700;margin-bottom:0.3rem;">Motivo de la eliminación *</label>
            <select id="del-motivo" class="swal2-select" style="width:100%;box-sizing:border-box;font-size:0.9rem;">
              <option value="">Seleccionar motivo...</option>
              <option value="cancelado-cliente">Cancelado por el cliente</option>
              <option value="duplicado">Registro duplicado</option>
              <option value="fecha-cambiada">Cambio de fecha (se crea de nuevo)</option>
              <option value="error-datos">Error en los datos</option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>
          <div class="form-group" id="del-detalle-box" style="display:none;margin-top:10px">
            <label style="display:block;font-size:0.8rem;font-weight:700;margin-bottom:0.3rem;">Detalle del motivo</label>
            <input type="text" id="del-detalle" class="swal2-input" style="width:100%;box-sizing:border-box;font-size:0.9rem;" placeholder="Describa el motivo">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#e74c3c',
      didOpen: () => {
        const motivo = document.getElementById('del-motivo') as HTMLSelectElement;
        const box = document.getElementById('del-detalle-box') as HTMLElement;
        motivo.addEventListener('change', () => {
          box.style.display = motivo.value === 'otro' ? '' : 'none';
        });
      },
      preConfirm: () => {
        const motivo = (document.getElementById('del-motivo') as HTMLSelectElement).value;
        if (!motivo) {
          Swal.showValidationMessage('Indique el motivo de la eliminación');
          return false;
        }
        if (motivo === 'otro') {
          const detalle = (document.getElementById('del-detalle') as HTMLInputElement).value.trim();
          if (!detalle) {
            Swal.showValidationMessage('Describa el motivo');
            return false;
          }
          return { motivo: 'otro: ' + detalle };
        }
        return { motivo };
      }
    }).then((res) => {
      if (res.isConfirmed) {
        this.api.deleteEvent(ev._id).subscribe({
          next: () => {
            this.cerrarDrawer();
            this.load();
            Swal.fire('Eliminado', `Evento eliminado. Motivo: ${(res.value as any).motivo}`, 'success');
          },
          error: (err) => Swal.fire('Error', err.error?.message, 'error')
        });
      }
    });
  }

  // —— Vistas Mes / Semana / Día ——————————————————————————————
  setView(m: 'mes' | 'semana' | 'dia'): void {
    this.viewMode = m;
  }

  get anchorKey(): string {
    return this.fechaKey(this.anchorDate);
  }

  navegar(dir: -1 | 1): void {
    if (this.viewMode === 'mes') {
      const d = new Date(this.calYear, this.calMonth + dir, 1);
      this.calYear = d.getFullYear();
      this.calMonth = d.getMonth();
    } else if (this.viewMode === 'semana') {
      this.anchorDate = new Date(this.anchorDate.getFullYear(), this.anchorDate.getMonth(), this.anchorDate.getDate() + dir * 7);
    } else {
      this.anchorDate = new Date(this.anchorDate.getFullYear(), this.anchorDate.getMonth(), this.anchorDate.getDate() + dir);
    }
  }

  irHoy(): void {
    const hoy = new Date();
    this.calYear = hoy.getFullYear();
    this.calMonth = hoy.getMonth();
    this.anchorDate = hoy;
  }

  irDia(key: string): void {
    const [y, m, d] = key.split('-').map(Number);
    this.anchorDate = new Date(y, m - 1, d);
    this.calYear = y;
    this.calMonth = m - 1;
    this.viewMode = 'dia';
  }

  tituloVista(): string {
    if (this.viewMode === 'mes') return this.nombreMes();
    if (this.viewMode === 'semana') {
      const dias = this.diasSemana;
      const ini = dias[0].date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      const fin = dias[6].date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
      return `Semana ${ini} → ${fin}`;
    }
    return this.nombreDiaLargo();
  }

  private inicioSemana(ref: Date): Date {
    const desfase = (ref.getDay() + 6) % 7;
    return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - desfase);
  }

  private eventosPorDia(): Record<string, any[]> {
    const porDia: Record<string, any[]> = {};
    this.eventosFiltrados.forEach(ev => {
      const k = this.claveEvento(ev);
      if (!k) return;
      (porDia[k] = porDia[k] || []).push(ev);
    });
    Object.values(porDia).forEach(lista =>
      lista.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()));
    return porDia;
  }

  get diasSemana(): any[] {
    const inicio = this.inicioSemana(this.anchorDate);
    const porDia = this.eventosPorDia();
    const dias: any[] = [];
    for (let i = 0; i < 7; i++) {
      const f = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      const key = this.fechaKey(f);
      dias.push({ date: f, num: f.getDate(), key, eventos: porDia[key] || [], pasado: key < this.hoyKey });
    }
    return dias;
  }

  get eventosDia(): any[] {
    const porDia = this.eventosPorDia();
    return porDia[this.anchorKey] || [];
  }

  eventosEnHora(h: number): any[] {
    return this.eventosDia.filter(ev => ev.eventDate && new Date(ev.eventDate).getHours() === h);
  }

  nombreDiaCorto(d: Date): string {
    return d.toLocaleDateString('es-CO', { weekday: 'short' });
  }

  nombreDiaLargo(): string {
    return this.anchorDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  cerrarChooser(): void {
    this.showChooser = false;
    this.eventosChooser = [];
    this.chooserKey = '';
  }

  tituloChooser(): string {
    if (!this.chooserKey) return '';
    const [y, m, d] = this.chooserKey.split('-').map(Number);
    const nombre = new Date(y, m - 1, d)
      .toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    return `${nombre} · ${this.eventosChooser.length} para elegir`;
  }

  fechaLarga(fecha: any): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  }

  abrirBEO(ev: any): void {
    this.cerrarChooser();
    const pagado = this.getTotalPaid(ev);
    const total = ev.totalCost || 0;
    const resta = total - pagado;
    const porAsistente = ev.numberOfAttendees > 0 ? Math.round(total / ev.numberOfAttendees) : 0;
    const tipo = ev.eventType === 'catering_externo' ? 'CATERING EXTERNO' : 'EVENTO LOCAL';
    const fila = (label: string, valor: string) =>
      valor ? `<tr><td style="padding:5px 8px;color:#555;width:180px;">${label}</td><td style="padding:5px 8px;"><strong>${valor}</strong></td></tr>` : '';
    const bloque = (label: string, valor: string) =>
      valor ? `<div style="margin-top:8px;"><div style="font-size:11px;color:#555;font-weight:bold;">${label}</div><div style="white-space:pre-wrap;">${valor}</div></div>` : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>BEO — ${ev.customerName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #222; padding: 24px; max-width: 760px; margin: 0 auto; }
    .head { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 14px; }
    .head h1 { font-size: 20px; letter-spacing: 2px; }
    .head .sub { font-size: 11px; color: #555; margin-top: 4px; }
    h2 { font-size: 13px; background: #f0f0f0; padding: 5px 8px; margin: 14px 0 4px; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; }
    .alert { border: 2px solid #c00; border-radius: 6px; padding: 8px; margin-top: 8px; }
    .alert-title { color: #c00; font-weight: bold; font-size: 12px; }
    .sign { display: flex; gap: 40px; margin-top: 36px; }
    .sign div { flex: 1; border-top: 1px solid #000; padding-top: 4px; font-size: 11px; text-align: center; }
    .foot { margin-top: 14px; font-size: 10px; color: #777; text-align: center; }
    .toolbar { text-align: right; margin: 16px 0 4px; }
    .toolbar button { font-size: 16px; padding: 6px 12px; cursor: pointer; }
    @media print { body { padding: 0; } .toolbar { display: none; } }
  </style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()" title="Imprimir">🖨️ Imprimir</button> <button onclick="window.close()" title="Cerrar ventana">✕ Cerrar</button></div>
  <div class="head">
    <h1>📋 BEO — ORDEN DE EVENTO</h1>
    <div class="sub">${tipo} · Estado: ${this.estadoLabel(ev.status)} · Emitida: ${new Date().toLocaleString('es-CO')}</div>
  </div>

  <h2>CLIENTE Y FECHA</h2>
  <table>
    ${fila('Cliente', ev.customerName)}
    ${fila('Teléfono', ev.customerPhone || '')}
    ${fila('Correo', ev.customerEmail || '')}
    ${fila('Tema', ev.theme || '')}
    ${fila('Fecha', this.fechaLarga(ev.eventDate))}
    ${fila('Montaje', ev.setupTime ? this.fechaLarga(ev.setupTime) : '')}
    ${fila('Finalización', ev.endDate ? this.fechaLarga(ev.endDate) : '')}
    ${fila('Asistentes', ev.numberOfAttendees ? String(ev.numberOfAttendees) : '')}
  </table>

  <h2>MENÚ</h2>
  <table>
    ${fila('Cocina', (ev.kitchenMenu || '').replace(/\n/g, '<br>'))}
    ${fila('Bar / Bebidas', (ev.barMenu || '').replace(/\n/g, '<br>'))}
    ${fila('Otros', (ev.otherMenu || '').replace(/\n/g, '<br>'))}
    ${fila('Costo por asistente', porAsistente ? '$' + porAsistente.toLocaleString('es-CO') : '')}
  </table>

  <h2>OPERACIÓN</h2>
  <table>
    ${fila('Personal asignado', (ev.staffAssigned || '').replace(/\n/g, '<br>'))}
    ${fila('Montaje y equipos', (ev.rentals || '').replace(/\n/g, '<br>'))}
    ${fila('Notas', (ev.notes || '').replace(/\n/g, '<br>'))}
  </table>
  ${ev.allergies ? `<div class="alert"><div class="alert-title">⚠️ ALERGIAS Y RESTRICCIONES</div><div style="white-space:pre-wrap;">${ev.allergies}</div></div>` : ''}

  <h2>VALORES</h2>
  <table>
    ${fila('Total', '$' + total.toLocaleString('es-CO'))}
    ${fila('Abonado', '$' + pagado.toLocaleString('es-CO'))}
    ${fila('Resta', '$' + resta.toLocaleString('es-CO'))}
  </table>

  <div class="sign">
    <div>Firma cliente<br><br>Nombre y cédula</div>
    <div>Firma responsable<br><br>Nombre y cargo</div>
  </div>
  <div class="foot">Sistema La Soupe · BEO generada automáticamente</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=800,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  }

  getTotalPaid(ev: any): number {
    if (!ev.payments || ev.payments.length === 0) return 0;
    return ev.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  }

  abonadoHito(ev: any, h: any): number {
    if (!ev.payments) return 0;
    return ev.payments
      .filter((p: any) => p.milestone && String(p.milestone) === String(h._id || h))
      .reduce((s: number, p: any) => s + p.amount, 0);
  }

  hitoVencido(h: any): boolean {
    return h.estado !== 'pagado' && !!h.vencimiento && new Date(h.vencimiento).getTime() < Date.now();
  }

  hitoClass(h: any): string {
    if (this.hitoVencido(h)) return 'pill-cancelado';
    return h.estado === 'pagado' ? 'pill-realizado' : (h.estado === 'parcial' ? 'pill-confirmado' : 'pill-pendiente');
  }

  hitoLabel(h: any): string {
    if (this.hitoVencido(h)) return 'Vencido';
    const m: Record<string, string> = { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado' };
    return m[h.estado] || h.estado;
  }

  agregarHito(ev: any): void {
    Swal.fire({
      title: 'Agregar hito de pago',
      html: `
        <div style="text-align:left;font-size:0.9rem;">
          <div class="form-group">
            <label style="display:block;font-size:0.8rem;font-weight:700;margin-bottom:0.3rem;">Etiqueta * (ej. Anticipo acordado)</label>
            <input type="text" id="hito-etiqueta" class="swal2-input" style="width:100%;box-sizing:border-box;" placeholder="Anticipo">
          </div>
          <div class="form-group" style="margin-top:10px">
            <label style="display:block;font-size:0.8rem;font-weight:700;margin-bottom:0.3rem;">Monto (COP $) *</label>
            <input type="number" id="hito-monto" class="swal2-input" style="width:100%;box-sizing:border-box;" min="0" placeholder="0">
          </div>
          <div class="form-group" style="margin-top:10px">
            <label style="display:block;font-size:0.8rem;font-weight:700;margin-bottom:0.3rem;">Vencimiento (opcional)</label>
            <input type="date" id="hito-vence" class="swal2-input" style="width:100%;box-sizing:border-box;">
          </div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D4AF37',
      preConfirm: () => {
        const etiqueta = (document.getElementById('hito-etiqueta') as HTMLInputElement).value.trim();
        const monto = parseFloat((document.getElementById('hito-monto') as HTMLInputElement).value);
        const vencimiento = (document.getElementById('hito-vence') as HTMLInputElement).value;
        if (!etiqueta || !(monto > 0)) {
          Swal.showValidationMessage('Etiqueta y monto mayor a 0 son obligatorios');
          return false;
        }
        return { etiqueta, monto, vencimiento: vencimiento || undefined };
      }
    }).then((res) => {
      if (res.isConfirmed) {
        this.api.addEventMilestone(ev._id, res.value).subscribe({
          next: (actualizado: any) => {
            this.selectedEv = actualizado;
            this.load();
          },
          error: (err) => Swal.fire('Error', err.error?.message, 'error')
        });
      }
    });
  }

  eliminarHito(ev: any, h: any): void {
    Swal.fire({
      title: '¿Eliminar hito?',
      text: `${h.etiqueta} · $${h.monto.toLocaleString('es-CO')}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#e74c3c'
    }).then((res) => {
      if (res.isConfirmed) {
        this.api.removeEventMilestone(ev._id, h._id).subscribe({
          next: (actualizado: any) => {
            this.selectedEv = actualizado;
            this.load();
          },
          error: (err) => Swal.fire('Error', err.error?.message, 'error')
        });
      }
    });
  }

    // —— Monto COP con separadores de miles ————————————————————————
  get totalCostDisplay(): string {
    const n = Number(this.form?.totalCost) || 0;
    return n > 0 ? n.toLocaleString('es-CO') : '';
  }

  onTotalCostInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const digitos = (input.value || '').replace(/\D/g, '').slice(0, 12);
    const n = parseInt(digitos, 10) || 0;
    this.form.totalCost = n;
    input.value = n > 0 ? n.toLocaleString('es-CO') : '';
  }

  openForm(ev?: any, prefillDate?: Date): void {
    const aLocal = (v: any): { fecha: string; hora: string } => {
      if (!v) return { fecha: '', hora: '' };
      const d = new Date(v);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      const iso = d.toISOString();
      return { fecha: iso.slice(0, 10), hora: iso.slice(11, 16) };
    };
    if (ev) {
      this.editingId = ev._id;
      this.form = { ...ev };
      const ini = aLocal(ev.eventDate);
      const fin = aLocal(ev.endDate);
      this.form.fechaEvento = ini.fecha;
      this.form.horaInicio = ini.hora;
      this.form.endDate = '';
      this.form.horaFin = fin.hora;
    } else {
      this.editingId = null;
      this.form = {
        customerName: '', customerPhone: '', customerEmail: '',
        eventType: this.vista === 'evento' ? 'evento_local' : 'catering_externo',
        eventDate: '', endDate: '', setupTime: '', theme: '',
        numberOfAttendees: 0, kitchenMenu: '', barMenu: '', otherMenu: '',
        staffAssigned: '', rentals: '', allergies: '', serviceNotes: '',
        totalCost: 0, notes: ''
      };
      if (prefillDate) {
        const p = (n: number) => String(n).padStart(2, '0');
        this.form.fechaEvento = `${prefillDate.getFullYear()}-${p(prefillDate.getMonth() + 1)}-${p(prefillDate.getDate())}`;
        this.form.horaInicio = '12:00';
      }
    }
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  saveEvent(): void {
    const monto = Number(this.form?.totalCost) || 0;
    if (!(monto > 0)) {
      Swal.fire('Monto requerido', 'Ingresa el monto del evento en COP (mayor a 0).', 'warning');
      return;
    }
    this.form.totalCost = monto;
    this.saving = true;
    const payload = { ...this.form };
    const combinar = (hora: string): string => {
      if (!payload.fechaEvento || !hora) return '';
      return `${payload.fechaEvento}T${hora}`;
    };
    payload.eventDate = combinar(payload.horaInicio);
    payload.endDate = combinar(payload.horaFin);
    delete payload.fechaEvento;
    delete payload.horaInicio;
    delete payload.horaFin;
    const req = this.editingId
      ? this.api.updateEvent(this.editingId, payload)
      : this.api.createEvent(payload);

    req.subscribe({
      next: (guardado) => {
        this.saving = false;
        this.closeForm();
        this.load();
        if (this.showDrawer && guardado) this.selectedEv = guardado;
        Swal.fire({
          title: 'Éxito',
          text: 'Evento guardado',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Ir a pagos',
          cancelButtonText: 'OK',
          cancelButtonColor: '#d4af37'
        }).then((res) => {
          if (res.isConfirmed && guardado) {
            this.addPayment(guardado);
          }
        });
      },
      error: (err) => {
        this.saving = false;
        Swal.fire('Error', err.error?.message || 'Error al guardar', 'error');
      }
    });
  }

  updateStatus(ev: any, newStatus: string): void {
    this.api.updateEvent(ev._id, { status: newStatus }).subscribe({
      next: () => {
        ev.status = newStatus;
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Estado actualizado', timer: 2000, showConfirmButton: false });
      },
      error: (err) => Swal.fire('Error', err.error?.message, 'error')
    });
  }

  addPayment(ev: any, milestoneId?: string): void {
    const remaining = ev.totalCost - this.getTotalPaid(ev);
    if (remaining <= 0) {
      Swal.fire('Atención', 'El evento ya está pagado en su totalidad', 'info');
      return;
    }
    const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

    Swal.fire({
      title: 'Registrar pago',
      width: '46rem',
      html: `
        <div style="text-align:left;font-size:1rem;">
          <div style="display:flex;gap:0.75rem;margin-bottom:1rem;">
            <div style="flex:1;background:#f4f4f5;border-radius:10px;padding:0.6rem 0.8rem;">
              <div style="font-size:0.72rem;color:#777;font-weight:700;">TOTAL</div>
              <div style="font-size:1.15rem;font-weight:800;">${fmt(ev.totalCost || 0)}</div>
            </div>
            <div style="flex:1;background:#f4f4f5;border-radius:10px;padding:0.6rem 0.8rem;">
              <div style="font-size:0.72rem;color:#777;font-weight:700;">ABONADO</div>
              <div style="font-size:1.15rem;font-weight:800;">${fmt(this.getTotalPaid(ev))}</div>
            </div>
            <div style="flex:1;background:#fff8e1;border:1px solid #f0d060;border-radius:10px;padding:0.6rem 0.8rem;">
              <div style="font-size:0.72rem;color:#8a6d00;font-weight:700;">RESTANTE</div>
              <div style="font-size:1.15rem;font-weight:800;">${fmt(remaining)}</div>
            </div>
          </div>
          <div style="display:flex;gap:1.5rem;margin-bottom:0.75rem;font-size:0.95rem;">
            <label style="display:flex;align-items:center;gap:0.45rem;cursor:pointer;">
              <input type="checkbox" id="pay-check-total" checked style="width:18px;height:18px;accent-color:#d4af37;"> Pago total
            </label>
            <label style="display:flex;align-items:center;gap:0.45rem;cursor:pointer;">
              <input type="checkbox" id="pay-check-abono" style="width:18px;height:18px;accent-color:#d4af37;"> Abonos
            </label>
          </div>
          <div id="pay-total-box" class="form-group" style="margin-top:6px">
            <label>Monto</label>
            <input type="text" id="pay-amount-total" class="swal2-input" readonly value="${fmt(remaining)}" style="width:100%;box-sizing:border-box;font-size:1.05rem;font-weight:700;">
          </div>
          <div id="pay-abono-box" style="display:none;margin-top:6px">
            <div class="form-group">
              <label>Monto a abonar</label>
              <input type="text" id="pay-amount-abono" class="swal2-input" placeholder="Ej. ${fmt(100000)}" style="width:100%;box-sizing:border-box;font-size:1.05rem;font-weight:700;">
            </div>
            <div class="form-group" style="margin-top:10px">
              <label>Saldo restante</label>
              <input type="text" id="pay-saldo" class="swal2-input" readonly value="${fmt(remaining)}" style="width:100%;box-sizing:border-box;font-size:1.05rem;font-weight:700;">
            </div>
          </div>
          <div class="form-group" style="margin-top:10px">
            <label>Método de Pago</label>
            <select id="pay-method" class="swal2-select" style="width:100%;box-sizing:border-box;">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta / Datáfono</option>
              <option value="transferencia">Transferencia</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const chkTotal = document.getElementById('pay-check-total') as HTMLInputElement;
        const chkAbono = document.getElementById('pay-check-abono') as HTMLInputElement;
        const totalBox = document.getElementById('pay-total-box') as HTMLElement;
        const abonoBox = document.getElementById('pay-abono-box') as HTMLElement;
        const montoAbono = document.getElementById('pay-amount-abono') as HTMLInputElement;
        const saldo = document.getElementById('pay-saldo') as HTMLInputElement;
        const soloDigitos = (v: string) => parseInt(v.replace(/\D/g, ''), 10) || 0;
        const pintar = (input: HTMLInputElement) => {
          const n = soloDigitos(input.value);
          input.value = n > 0 ? '$' + n.toLocaleString('es-CO') : '';
          return n;
        };
        const recalc = () => {
          const abono = pintar(montoAbono);
          saldo.value = fmt(remaining - abono);
        };
        chkTotal.addEventListener('change', () => {
          if (chkTotal.checked) chkAbono.checked = false;
          else chkAbono.checked = true;
          totalBox.style.display = chkTotal.checked ? '' : 'none';
          abonoBox.style.display = chkTotal.checked ? 'none' : '';
        });
        chkAbono.addEventListener('change', () => {
          if (chkAbono.checked) chkTotal.checked = false;
          else chkTotal.checked = true;
          totalBox.style.display = chkAbono.checked ? 'none' : '';
          abonoBox.style.display = chkAbono.checked ? '' : 'none';
        });
        montoAbono.addEventListener('input', recalc);
      },
      preConfirm: () => {
        const esTotal = (document.getElementById('pay-check-total') as HTMLInputElement).checked;
        const method = (document.getElementById('pay-method') as HTMLSelectElement).value;
        if (esTotal) return { amount: remaining, method, milestone: milestoneId || null };
        const raw = (document.getElementById('pay-amount-abono') as HTMLInputElement).value;
        const amount = parseInt(raw.replace(/\D/g, ''), 10) || 0;
        if (!amount || amount <= 0 || amount > remaining) {
          Swal.showValidationMessage('Monto a abonar inválido: revise el valor y el saldo');
          return false;
        }
        return { amount, method, milestone: milestoneId || null };
      }
    }).then((res) => {
      if (res.isConfirmed) {
        this.api.addEventPayment(ev._id, res.value).subscribe({
          next: () => {
            Swal.fire('Éxito', 'Pago registrado (integrado a caja)', 'success');
            this.load();
            if (milestoneId && this.selectedEv && this.selectedEv._id === ev._id) {
              // Refresca el drawer para ver el hito actualizado.
              this.api.getEvent(ev._id).subscribe({
                next: (actualizado: any) => { this.selectedEv = actualizado; },
                error: () => this.cerrarDrawer()
              });
            } else if (this.selectedEv && this.selectedEv._id === ev._id) {
              this.cerrarDrawer();
            }
          },
          error: (err) => Swal.fire('Error', err.error?.message, 'error')
        });
      }
    });
  }
}
