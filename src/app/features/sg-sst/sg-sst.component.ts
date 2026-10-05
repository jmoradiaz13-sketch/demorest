import { Component, OnInit } from '@angular/core';

interface Peligro { _id: string; area: string; peligro: string; riesgo: 'Alto' | 'Medio' | 'Bajo'; controles: string; responsable: string; fecha: string; estado: 'Abierto' | 'Controlado' | 'En seguimiento'; }
interface Capacitacion { _id: string; tema: string; fecha: string; asistentes: number; responsable: string; estado: 'Programada' | 'Realizada' | 'Vencida'; avance: number; }
interface Incidente { _id: string; fecha: string; tipo: 'Accidente' | 'Incidente' | 'Enfermedad'; persona: string; area: string; descripcion: string; dias: number; estado: 'Abierto' | 'En seguimiento' | 'Cerrado'; }
interface Epp { _id: string; trabajador: string; cargo: string; elemento: string; talla: string; entrega: string; estado: 'Al día' | 'Por reponer' | 'Vencido'; }
interface PlanDoc { _id: string; nombre: string; codigo: string; responsable: string; vigencia: string; estado: 'Vigente' | 'En revisión' | 'Vencido'; avance: number; }

const LS_KEY = 'soupe-sgsst-v1';

@Component({
  selector: 'app-sg-sst',
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">🦺 SG-SST</h1>
          <p class="page-subtitle">Sistema de Gestión de Seguridad y Salud en el Trabajo · Dec. 1072 / Res. 0312</p>
        </div>
        <button class="btn-primary" (click)="nuevo()">+ Nuevo registro</button>
      </div>

      <div class="grid-4 mb-3">
        <div class="stat-card"><div class="stat-icon bg-gold">📊</div><div><div class="stat-value">{{ cumplimiento }}%</div><div class="stat-label">Estándares mínimos</div></div></div>
        <div class="stat-card"><div class="stat-icon bg-green">🎓</div><div><div class="stat-value">{{ capRealizadas }}/{{ capacitaciones.length }}</div><div class="stat-label">Capacitaciones al día</div></div></div>
        <div class="stat-card"><div class="stat-icon bg-orange">⚠️</div><div><div class="stat-value">{{ incidentesAbiertos }}</div><div class="stat-label">Casos abiertos</div></div></div>
        <div class="stat-card"><div class="stat-icon bg-bronze">🦺</div><div><div class="stat-value">{{ eppAlDia }}/{{ epp.length }}</div><div class="stat-label">EPP al día</div></div></div>
      </div>

      <div class="neon-card ciclo">
        <div class="ciclo-title">Ciclo PHVA · Plan anual 2026</div>
        <div class="ciclo-grid">
          <div class="ciclo-item"><span class="ciclo-badge p">P</span><div><strong>Planear (25%)</strong><p>Política, matriz, plan anual y COPASST firmados.</p></div></div>
          <div class="ciclo-item"><span class="ciclo-badge h">H</span><div><strong>Hacer (40%)</strong><p>Capacitaciones, entrega EPP y controles en cocina/barra.</p></div></div>
          <div class="ciclo-item"><span class="ciclo-badge v">V</span><div><strong>Verificar (15%)</strong><p>Inspecciones mensuales y seguimiento a incidentes.</p></div></div>
          <div class="ciclo-item"><span class="ciclo-badge a">A</span><div><strong>Actuar (7%)</strong><p>Acciones correctivas y mejora continua.</p></div></div>
        </div>
      </div>

      <div class="tabs-bar">
        <button [class]="tab==='peligros'?'tab active':'tab'" (click)="tab='peligros'">☣️ Matriz ({{ peligros.length }})</button>
        <button [class]="tab==='capacitaciones'?'tab active':'tab'" (click)="tab='capacitaciones'">🎓 Capacitaciones ({{ capacitaciones.length }})</button>
        <button [class]="tab==='incidentes'?'tab active':'tab'" (click)="tab='incidentes'">🚨 Accidentes ({{ incidentes.length }})</button>
        <button [class]="tab==='epp'?'tab active':'tab'" (click)="tab='epp'">🦺 EPP y salud ({{ epp.length }})</button>
        <button [class]="tab==='plan'?'tab active':'tab'" (click)="tab='plan'">📋 Plan y documentos ({{ plan.length }})</button>
      </div>

      <div class="search-bar">
        <input class="form-input" placeholder="🔍 Buscar..." [(ngModel)]="search" />
        <select class="form-input" style="max-width:190px" [(ngModel)]="filtroArea">
          <option value="">Todas las áreas</option>
          <option>Cocina</option><option>Barra</option><option>Servicio</option><option>Domicilios</option><option>Administración</option>
        </select>
      </div>

      <!-- Matriz -->
      <div class="card table-card" *ngIf="tab==='peligros'">
        <table class="data-table">
          <thead><tr><th>Área</th><th>Peligro</th><th>Riesgo</th><th>Controles</th><th>Responsable</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let p of peligrosFiltrados">
              <td><span class="badge badge-cyan">{{ p.area }}</span></td>
              <td><strong>{{ p.peligro }}</strong></td>
              <td><span class="badge" [ngClass]="riesgoBadge(p.riesgo)">{{ p.riesgo }}</span></td>
              <td class="muted">{{ p.controles }}</td>
              <td>{{ p.responsable }}</td><td>{{ p.fecha }}</td>
              <td><span class="badge" [ngClass]="estadoBadge(p.estado)">{{ p.estado }}</span></td>
              <td class="actions"><button class="btn-icon" (click)="editarPeligro(p)">✏️</button><button class="btn-icon btn-icon-danger" (click)="eliminarPeligro(p)">🗑️</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Capacitaciones -->
      <div class="cap-grid" *ngIf="tab==='capacitaciones'">
        <div class="neon-card cap-card" *ngFor="let c of capacitacionesFiltradas">
          <div class="cap-top"><span class="badge" [ngClass]="estadoBadge(c.estado)">{{ c.estado }}</span><span class="muted">{{ c.fecha }}</span></div>
          <h3>{{ c.tema }}</h3>
          <p class="muted">👤 {{ c.responsable }} · 👥 {{ c.asistentes }} asistentes</p>
          <div class="prog"><div class="prog-fill" [style.width.%]="c.avance"></div></div>
          <div class="cap-foot"><span>{{ c.avance }}%</span><button class="btn-secondary btn-sm" (click)="editarCap(c)">Gestionar</button></div>
        </div>
      </div>

      <!-- Incidentes -->
      <div class="card table-card" *ngIf="tab==='incidentes'">
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Persona</th><th>Área</th><th>Descripción</th><th>Días</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let i of incidentesFiltrados">
              <td>{{ i.fecha }}</td>
              <td><span class="badge" [ngClass]="i.tipo==='Accidente'?'badge-red':i.tipo==='Incidente'?'badge-orange':'badge-violet'">{{ i.tipo }}</span></td>
              <td><strong>{{ i.persona }}</strong></td><td>{{ i.area }}</td><td class="muted">{{ i.descripcion }}</td><td>{{ i.dias }}</td>
              <td><span class="badge" [ngClass]="estadoBadge(i.estado)">{{ i.estado }}</span></td>
              <td class="actions"><button class="btn-icon" (click)="editarInc(i)">✏️</button><button class="btn-icon btn-icon-danger" (click)="eliminarInc(i)">🗑️</button></td>
            </tr>
          </tbody>
        </table>
        <div class="note">Ficticio: todo accidente grave se reporta a la ARL en 48h y se investiga con el Vigía SST.</div>
      </div>

      <!-- EPP -->
      <div class="card table-card" *ngIf="tab==='epp'">
        <table class="data-table">
          <thead><tr><th>Trabajador</th><th>Cargo</th><th>Elemento</th><th>Talla</th><th>Entrega</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let e of eppFiltrados">
              <td><strong>{{ e.trabajador }}</strong></td><td>{{ e.cargo }}</td><td>{{ e.elemento }}</td><td>{{ e.talla }}</td><td>{{ e.entrega }}</td>
              <td><span class="badge" [ngClass]="estadoBadge(e.estado)">{{ e.estado }}</span></td>
              <td class="actions"><button class="btn-icon" (click)="editarEpp(e)">✏️</button><button class="btn-icon btn-icon-danger" (click)="eliminarEpp(e)">🗑️</button></td>
            </tr>
          </tbody>
        </table>
        <div class="note">Dotación cocina: gorro, tapabocas, guantes nitrilo, calzado antideslizante. Barra/servicio: guantes, delantal. Domicilios: casco, chaleco, guantes.</div>
      </div>

      <!-- Plan -->
      <div class="plan-grid" *ngIf="tab==='plan'">
        <div class="neon-card plan-card" *ngFor="let d of plan">
          <div class="plan-top"><span class="product-code">{{ d.codigo }}</span><span class="badge" [ngClass]="estadoBadge(d.estado)">{{ d.estado }}</span></div>
          <h3>{{ d.nombre }}</h3>
          <p class="muted">👤 {{ d.responsable }} · Vigencia {{ d.vigencia }}</p>
          <div class="prog"><div class="prog-fill gold" [style.width.%]="d.avance"></div></div>
          <div class="plan-foot"><span>{{ d.avance }}% implementado</span><button class="btn-secondary btn-sm" (click)="editarPlan(d)">Revisar</button></div>
        </div>
      </div>

      <!-- Modal genérico -->
      <div class="modal-overlay" *ngIf="showForm" (click)="showForm=false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2 class="modal-title">{{ modalTitulo }}</h2>
          <div class="form-grid" *ngIf="tab==='peligros'">
            <div class="form-group"><label class="form-label">Área</label><select class="form-input" [(ngModel)]="fPeligro.area"><option>Cocina</option><option>Barra</option><option>Servicio</option><option>Domicilios</option><option>Administración</option></select></div>
            <div class="form-group"><label class="form-label">Riesgo</label><select class="form-input" [(ngModel)]="fPeligro.riesgo"><option>Alto</option><option>Medio</option><option>Bajo</option></select></div>
            <div class="form-group full-width"><label class="form-label">Peligro</label><input class="form-input" [(ngModel)]="fPeligro.peligro" /></div>
            <div class="form-group full-width"><label class="form-label">Controles</label><input class="form-input" [(ngModel)]="fPeligro.controles" /></div>
            <div class="form-group"><label class="form-label">Responsable</label><input class="form-input" [(ngModel)]="fPeligro.responsable" /></div>
            <div class="form-group"><label class="form-label">Estado</label><select class="form-input" [(ngModel)]="fPeligro.estado"><option>Abierto</option><option>En seguimiento</option><option>Controlado</option><option>Cerrado</option></select></div>
          </div>
          <div class="form-grid" *ngIf="tab==='capacitaciones'">
            <div class="form-group full-width"><label class="form-label">Tema</label><input class="form-input" [(ngModel)]="fCap.tema" /></div>
            <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" [(ngModel)]="fCap.fecha" /></div>
            <div class="form-group"><label class="form-label">Asistentes</label><input type="number" class="form-input" [(ngModel)]="fCap.asistentes" /></div>
            <div class="form-group"><label class="form-label">Responsable</label><input class="form-input" [(ngModel)]="fCap.responsable" /></div>
            <div class="form-group"><label class="form-label">Estado</label><select class="form-input" [(ngModel)]="fCap.estado"><option>Programada</option><option>Realizada</option><option>Vencida</option></select></div>
          </div>
          <div class="form-grid" *ngIf="tab==='incidentes'">
            <div class="form-group full-width"><label class="form-label">Descripción</label><input class="form-input" [(ngModel)]="fInc.descripcion" /></div>
            <div class="form-group"><label class="form-label">Persona</label><input class="form-input" [(ngModel)]="fInc.persona" /></div>
            <div class="form-group"><label class="form-label">Tipo</label><select class="form-input" [(ngModel)]="fInc.tipo"><option>Accidente</option><option>Incidente</option><option>Enfermedad</option></select></div>
            <div class="form-group"><label class="form-label">Área</label><select class="form-input" [(ngModel)]="fInc.area"><option>Cocina</option><option>Barra</option><option>Servicio</option><option>Domicilios</option><option>Administración</option></select></div>
            <div class="form-group"><label class="form-label">Estado</label><select class="form-input" [(ngModel)]="fInc.estado"><option>Abierto</option><option>En seguimiento</option><option>Cerrado</option></select></div>
          </div>
          <div class="form-grid" *ngIf="tab==='epp'">
            <div class="form-group"><label class="form-label">Trabajador</label><input class="form-input" [(ngModel)]="fEpp.trabajador" /></div>
            <div class="form-group"><label class="form-label">Cargo</label><input class="form-input" [(ngModel)]="fEpp.cargo" /></div>
            <div class="form-group"><label class="form-label">Elemento</label><input class="form-input" [(ngModel)]="fEpp.elemento" /></div>
            <div class="form-group"><label class="form-label">Estado</label><select class="form-input" [(ngModel)]="fEpp.estado"><option>Al día</option><option>Por reponer</option><option>Vencido</option></select></div>
          </div>
          <div class="form-grid" *ngIf="tab==='plan'">
            <div class="form-group full-width"><label class="form-label">Documento</label><input class="form-input" [(ngModel)]="fPlan.nombre" /></div>
            <div class="form-group"><label class="form-label">Responsable</label><input class="form-input" [(ngModel)]="fPlan.responsable" /></div>
            <div class="form-group"><label class="form-label">Avance %</label><input type="number" class="form-input" [(ngModel)]="fPlan.avance" min="0" max="100" /></div>
          </div>
          <div class="modal-actions">
            <button class="btn-outline" (click)="showForm=false">Cancelar</button>
            <button class="btn-primary" (click)="guardar()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-title { margin:0; font-size:1.5rem; }
    .mb-3 { margin-bottom:1.25rem; }
    .ciclo { margin-bottom:1.25rem; }
    .ciclo-title { font-weight:800; font-size:.8rem; text-transform:uppercase; letter-spacing:.06em; color:var(--text-secondary); margin-bottom:.7rem; }
    .ciclo-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:.8rem; }
    .ciclo-item { display:flex; gap:.6rem; background:var(--bg-input); border-radius:10px; padding:.7rem .8rem; font-size:.78rem; }
    .ciclo-item p { margin:.2rem 0 0; color:var(--text-secondary); }
    .ciclo-badge { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; flex-shrink:0; color:#fff; }
    .ciclo-badge.p { background:#8b5cf6; } .ciclo-badge.h { background:#0ea5e9; } .ciclo-badge.v { background:#f59e0b; } .ciclo-badge.a { background:#10b981; }
    .tabs-bar { display:flex; gap:.5rem; margin-bottom:1rem; border-bottom:2px solid rgb(212 175 55 / 10%); padding-bottom:.5rem; flex-wrap:wrap; }
    .tab { padding:.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-size:.82rem; font-weight:600; border-radius:8px 8px 0 0; cursor:pointer; }
    .tab.active { background:rgb(212 175 55 / 10%); color:var(--brand-gold); border-bottom:3px solid var(--brand-gold); }
    .search-bar { display:flex; gap:.75rem; margin-bottom:1rem; flex-wrap:wrap; }
    .search-bar .form-input:first-child { flex:1; min-width:200px; }
    .muted { font-size:.78rem; color:var(--text-secondary); }
    .actions { display:flex; gap:.3rem; }
    .note { padding:.8rem 1.25rem; font-size:.75rem; color:var(--text-muted); border-top:1px solid var(--border); }
    .cap-grid, .plan-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:1rem; }
    .cap-card h3, .plan-card h3 { margin:.4rem 0; font-size:.95rem; }
    .cap-top, .plan-top { display:flex; justify-content:space-between; align-items:center; gap:.5rem; }
    .prog { background:var(--bg-input); border-radius:99px; height:8px; overflow:hidden; margin:.6rem 0 .4rem; }
    .prog-fill { background:linear-gradient(90deg,#ff9800,#ff5722); height:8px; border-radius:99px; }
    .prog-fill.gold { background:linear-gradient(90deg,var(--brand-gold),var(--brand-bronze)); }
    .cap-foot, .plan-foot { display:flex; justify-content:space-between; align-items:center; font-size:.78rem; }
    /* TEXT-FIT SG-SST: que el espacio acompañe al texto (flex + min-width:0 + wrap) */
    .ciclo-item > div, .stat-card > div,
    .cap-top > *, .plan-top > *, .cap-foot > *, .plan-foot > * { min-width:0; }
    .ciclo-item strong, .ciclo-item p, .cap-card h3, .plan-card h3,
    .stat-label, .muted, .note { overflow-wrap:anywhere; }
    .ciclo-item p, .cap-card h3, .plan-card h3 { line-height:1.35; }
    .badge { flex-shrink:0; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:.85rem; }
    .full-width { grid-column:1 / -1; }
    .badge-green { background:rgb(0 230 118 / 12%); color:#00C853; }
    .badge-orange { background:rgb(255 145 0 / 12%); color:#E65100; }
    .badge-red { background:rgb(255 23 68 / 12%); color:#D50000; }
    .badge-violet { background:rgb(124 77 255 / 12%); color:#651FFF; }
    @media (max-width:900px){ .ciclo-grid{grid-template-columns:1fr 1fr;} }
    @media (max-width:640px){ .form-grid{grid-template-columns:1fr;} .ciclo-grid,.cap-grid,.plan-grid{grid-template-columns:1fr;} }
  `]
})
export class SgSstComponent implements OnInit {
  tab: 'peligros' | 'capacitaciones' | 'incidentes' | 'epp' | 'plan' = 'peligros';
  search = '';
  filtroArea = '';
  showForm = false;
  modalTitulo = '';
  cumplimiento = 87;

  peligros: Peligro[] = [];
  capacitaciones: Capacitacion[] = [];
  incidentes: Incidente[] = [];
  epp: Epp[] = [];
  plan: PlanDoc[] = [];

  fPeligro: Peligro = this.nPeligro();
  fCap: Capacitacion = this.nCap();
  fInc: Incidente = this.nInc();
  fEpp: Epp = this.nEpp();
  fPlan: PlanDoc = this.nPlan();
  editId: string | null = null;

  ngOnInit(): void { this.cargar(); }

  nPeligro(): Peligro { return { _id: '', area: 'Cocina', peligro: '', riesgo: 'Medio', controles: '', responsable: '', fecha: new Date().toISOString().slice(0, 10), estado: 'Abierto' }; }
  nCap(): Capacitacion { return { _id: '', tema: '', fecha: new Date().toISOString().slice(0, 10), asistentes: 0, responsable: '', estado: 'Programada', avance: 0 }; }
  nInc(): Incidente { return { _id: '', fecha: new Date().toISOString().slice(0, 10), tipo: 'Incidente', persona: '', area: 'Cocina', descripcion: '', dias: 0, estado: 'Abierto' }; }
  nEpp(): Epp { return { _id: '', trabajador: '', cargo: '', elemento: '', talla: 'M', entrega: new Date().toISOString().slice(0, 10), estado: 'Al día' }; }
  nPlan(): PlanDoc { return { _id: '', nombre: '', codigo: 'SST-00', responsable: '', vigencia: '2026-12-31', estado: 'Vigente', avance: 0 }; }

  cargar(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const d = JSON.parse(raw); Object.assign(this, d); return; }
    } catch { /* semilla */ }
    this.peligros = [
      { _id: 'p1', area: 'Cocina', peligro: 'Quemaduras por aceite y plancha', riesgo: 'Alto', controles: 'Guantes térmicos, pantalla salpicaduras, capacitación', responsable: 'Chef ejecutivo', fecha: '2026-08-10', estado: 'En seguimiento' },
      { _id: 'p2', area: 'Cocina', peligro: 'Cortes con cuchillos y mandolina', riesgo: 'Alto', controles: 'Guante anticorte, chaira, tablas estables', responsable: 'Chef de turno', fecha: '2026-08-10', estado: 'Controlado' },
      { _id: 'p3', area: 'Barra', peligro: 'Caídas por piso húmedo', riesgo: 'Medio', controles: 'Tapete antideslizante, señalización, calzado cerrado', responsable: 'Jefe de barra', fecha: '2026-07-22', estado: 'Controlado' },
      { _id: 'p4', area: 'Servicio', peligro: 'Sobreesfuerzo al transportar bandejas', riesgo: 'Medio', controles: 'Bandejas livianas, pausas, higiene postural', responsable: 'Jefe de servicio', fecha: '2026-07-22', estado: 'En seguimiento' },
      { _id: 'p5', area: 'Domicilios', peligro: 'Accidente vial en moto', riesgo: 'Alto', controles: 'Casco, chaleco, SOAT, límite 40 km/h, no lluvia fuerte', responsable: 'Coordinador domicilios', fecha: '2026-09-01', estado: 'Abierto' },
      { _id: 'p6', area: 'Administración', peligro: 'Riesgo eléctrico en caja y oficina', riesgo: 'Bajo', controles: 'Regletas certificadas, extintor ABC, revisión anual', responsable: 'Administración', fecha: '2026-06-15', estado: 'Controlado' },
      { _id: 'p7', area: 'Cocina', peligro: 'Inhalación de gas / fuga', riesgo: 'Alto', controles: 'Detector de gas, revisión cuatrimestral, válvula de corte', responsable: 'Mantenimiento', fecha: '2026-09-05', estado: 'En seguimiento' },
      { _id: 'p8', area: 'Servicio', peligro: 'Estrés térmico y fatiga en pico', riesgo: 'Bajo', controles: 'Hidratación, rotación, ventilación salón', responsable: 'Gerencia', fecha: '2026-08-18', estado: 'Controlado' },
    ];
    this.capacitaciones = [
      { _id: 'c1', tema: 'Inducción SST y plan de emergencias', fecha: '2026-09-15', asistentes: 18, responsable: 'Vigía SST', estado: 'Programada', avance: 20 },
      { _id: 'c2', tema: 'Uso correcto de EPP en cocina', fecha: '2026-08-20', asistentes: 12, responsable: 'Chef ejecutivo', estado: 'Realizada', avance: 100 },
      { _id: 'c3', tema: 'Higiene postural y levantamiento de cargas', fecha: '2026-08-05', asistentes: 15, responsable: 'Fisioterapeuta ARL', estado: 'Realizada', avance: 100 },
      { _id: 'c4', tema: 'Primeros auxilios básicos', fecha: '2026-07-18', asistentes: 10, responsable: 'Cruz Roja', estado: 'Realizada', avance: 100 },
      { _id: 'c5', tema: 'Manejo de extintores', fecha: '2026-06-25', asistentes: 14, responsable: 'Bomberos', estado: 'Realizada', avance: 100 },
      { _id: 'c6', tema: 'Seguridad vial para domiciliarios', fecha: '2026-05-30', asistentes: 4, responsable: 'Coordinador domicilios', estado: 'Vencida', avance: 60 },
    ];
    this.incidentes = [
      { _id: 'i1', fecha: '2026-08-28', tipo: 'Incidente', persona: 'Aux. cocina J. Pérez', area: 'Cocina', descripcion: 'Corte leve dedo índice con lata, atención botiquín sin incapacidad.', dias: 0, estado: 'Cerrado' },
      { _id: 'i2', fecha: '2026-08-12', tipo: 'Accidente', persona: 'Mesero C. Ruiz', area: 'Servicio', descripcion: 'Resbalón en salón 2, esguince tobillo. 3 días de incapacidad.', dias: 3, estado: 'En seguimiento' },
      { _id: 'i3', fecha: '2026-07-02', tipo: 'Incidente', persona: 'Domiciliario L. Toro', area: 'Domicilios', descripcion: 'Caída leve en andén mojado sin lesiones, daño a maleta.', dias: 0, estado: 'Cerrado' },
    ];
    this.epp = [
      { _id: 'e1', trabajador: 'M. Aguirre', cargo: 'Cocinero', elemento: 'Guantes nitrilo + gorro + delantal', talla: 'M', entrega: '2026-09-01', estado: 'Al día' },
      { _id: 'e2', trabajador: 'J. Pérez', cargo: 'Aux. cocina', elemento: 'Guante anticorte + calzado antideslizante', talla: '42', entrega: '2026-09-01', estado: 'Al día' },
      { _id: 'e3', trabajador: 'C. Ruiz', cargo: 'Mesero', elemento: 'Calzado antideslizante + guantes servicio', talla: '40', entrega: '2026-08-15', estado: 'Al día' },
      { _id: 'e4', trabajador: 'L. Toro', cargo: 'Domiciliario', elemento: 'Casco + chaleco + guantes moto', talla: 'M', entrega: '2026-05-10', estado: 'Por reponer' },
      { _id: 'e5', trabajador: 'S. Vega', cargo: 'Bartender', elemento: 'Guantes + tapabocas + delantal', talla: 'S', entrega: '2026-08-15', estado: 'Al día' },
      { _id: 'e6', trabajador: 'P. León', cargo: 'Steward', elemento: 'Guantes caucho + botas + gafas', talla: 'L', entrega: '2025-12-01', estado: 'Vencido' },
    ];
    this.plan = [
      { _id: 's1', nombre: 'Política SST firmada y publicada', codigo: 'SST-001', responsable: 'Gerencia', vigencia: '2026-12-31', estado: 'Vigente', avance: 100 },
      { _id: 's2', nombre: 'Reglamento de higiene y seguridad', codigo: 'SST-002', responsable: 'Vigía SST', vigencia: '2026-12-31', estado: 'Vigente', avance: 100 },
      { _id: 's3', nombre: 'Vigía SST y actas mensuales', codigo: 'SST-003', responsable: 'Vigía SST', vigencia: '2026-12-31', estado: 'En revisión', avance: 70 },
      { _id: 's4', nombre: 'Plan de emergencias y simulacro', codigo: 'SST-004', responsable: 'Brigada', vigencia: '2026-11-30', estado: 'En revisión', avance: 60 },
      { _id: 's5', nombre: 'Exámenes médicos ocupacionales (18)', codigo: 'SST-005', responsable: 'Talento humano', vigencia: '2026-10-31', estado: 'Vigente', avance: 83 },
      { _id: 's6', nombre: 'Inspecciones locativas y de equipos', codigo: 'SST-006', responsable: 'Mantenimiento', vigencia: '2026-12-31', estado: 'Vigente', avance: 75 },
    ];
    this.persistir();
  }

  persistir(): void {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ peligros: this.peligros, capacitaciones: this.capacitaciones, incidentes: this.incidentes, epp: this.epp, plan: this.plan })); } catch { /* noop */ }
  }

  get capRealizadas(): number { return this.capacitaciones.filter(c => c.estado === 'Realizada').length; }
  get incidentesAbiertos(): number { return this.incidentes.filter(i => i.estado !== 'Cerrado').length; }
  get eppAlDia(): number { return this.epp.filter(e => e.estado === 'Al día').length; }

  coincide(s: string): boolean { return s.toLowerCase().includes(this.search.trim().toLowerCase()); }
  enArea(a: string): boolean { return !this.filtroArea || a === this.filtroArea; }

  get peligrosFiltrados(): Peligro[] { return this.peligros.filter(p => this.enArea(p.area) && (!this.search.trim() || this.coincide(p.peligro + ' ' + p.controles + ' ' + p.responsable))); }
  get capacitacionesFiltradas(): Capacitacion[] { return this.capacitaciones.filter(c => !this.search.trim() || this.coincide(c.tema + ' ' + c.responsable)); }
  get incidentesFiltrados(): Incidente[] { return this.incidentes.filter(i => this.enArea(i.area) && (!this.search.trim() || this.coincide(i.descripcion + ' ' + i.persona))); }
  get eppFiltrados(): Epp[] { return this.epp.filter(e => !this.search.trim() || this.coincide(e.trabajador + ' ' + e.elemento + ' ' + e.cargo)); }

  riesgoBadge(r: string): string { return r === 'Alto' ? 'badge-red' : r === 'Medio' ? 'badge-orange' : 'badge-green'; }
  estadoBadge(e: string): string {
    return e === 'Realizada' || e === 'Controlado' || e === 'Cerrado' || e === 'Al día' || e === 'Vigente' ? 'badge-green'
      : e === 'Programada' || e === 'En seguimiento' || e === 'En revisión' ? 'badge-orange'
      : e === 'Abierto' ? 'badge-red' : e === 'Vencida' || e === 'Vencido' ? 'badge-red' : e === 'Por reponer' ? 'badge-violet' : 'badge-cyan';
  }

  nuevo(): void {
    this.editId = null;
    this.fPeligro = this.nPeligro(); this.fCap = this.nCap(); this.fInc = this.nInc(); this.fEpp = this.nEpp(); this.fPlan = this.nPlan();
    this.modalTitulo = this.tab === 'peligros' ? '➕ Nuevo peligro' : this.tab === 'capacitaciones' ? '➕ Nueva capacitación' : this.tab === 'incidentes' ? '➕ Nuevo caso' : this.tab === 'epp' ? '➕ Nueva entrega EPP' : '➕ Nuevo documento SST';
    this.showForm = true;
  }

  editarPeligro(p: Peligro): void { this.fPeligro = { ...p }; this.editId = p._id; this.modalTitulo = '✏️ Editar peligro'; this.showForm = true; }
  editarCap(c: Capacitacion): void { this.fCap = { ...c }; this.editId = c._id; this.modalTitulo = '✏️ Gestionar capacitación'; this.showForm = true; }
  editarInc(i: Incidente): void { this.fInc = { ...i }; this.editId = i._id; this.modalTitulo = '✏️ Editar caso'; this.showForm = true; }
  editarEpp(e: Epp): void { this.fEpp = { ...e }; this.editId = e._id; this.modalTitulo = '✏️ Editar EPP'; this.showForm = true; }
  editarPlan(d: PlanDoc): void { this.fPlan = { ...d }; this.editId = d._id; this.modalTitulo = '✏️ Revisar documento'; this.showForm = true; }

  eliminarPeligro(p: Peligro): void { if (confirm('¿Eliminar peligro?')) { this.peligros = this.peligros.filter(x => x._id !== p._id); this.persistir(); } }
  eliminarInc(i: Incidente): void { if (confirm('¿Eliminar caso?')) { this.incidentes = this.incidentes.filter(x => x._id !== i._id); this.persistir(); } }
  eliminarEpp(e: Epp): void { if (confirm('¿Eliminar entrega?')) { this.epp = this.epp.filter(x => x._id !== e._id); this.persistir(); } }

  guardar(): void {
    const id = this.editId || ('x' + Date.now());
    if (this.tab === 'peligros') {
      const v: Peligro = { ...this.fPeligro, _id: id };
      this.peligros = this.editId ? this.peligros.map(p => (p._id === id ? v : p)) : [...this.peligros, v];
    } else if (this.tab === 'capacitaciones') {
      const v: Capacitacion = { ...this.fCap, _id: id, avance: this.fCap.estado === 'Realizada' ? 100 : this.fCap.avance };
      this.capacitaciones = this.editId ? this.capacitaciones.map(c => (c._id === id ? v : c)) : [...this.capacitaciones, v];
    } else if (this.tab === 'incidentes') {
      const v: Incidente = { ...this.fInc, _id: id };
      this.incidentes = this.editId ? this.incidentes.map(i => (i._id === id ? v : i)) : [...this.incidentes, v];
    } else if (this.tab === 'epp') {
      const v: Epp = { ...this.fEpp, _id: id };
      this.epp = this.editId ? this.epp.map(e => (e._id === id ? v : e)) : [...this.epp, v];
    } else {
      const v: PlanDoc = { ...this.fPlan, _id: id };
      this.plan = this.editId ? this.plan.map(d => (d._id === id ? v : d)) : [...this.plan, v];
    }
    this.persistir();
    this.showForm = false;
  }
}
