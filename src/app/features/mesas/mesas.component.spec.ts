import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { MesasComponent } from './mesas.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('MesasComponent', () => {
  let component: MesasComponent;
  let fixture: ComponentFixture<MesasComponent>;
  let api: jasmine.SpyObj<ApiService>;
  let navigateSpy: jasmine.Spy;

  function makeMockTables() {
    return [
      { _id: 't1', number: 1, zona: 'Salón 1', status: 'libre', isOccupied: false, currentSale: null },
      { _id: 't2', number: 2, zona: 'Salón 1', status: 'ocupada', isOccupied: true, currentSale: { _id: 's1', total: 25000 } },
      { _id: 't3', number: 10, zona: 'Salón 2', status: 'reservada', isOccupied: false, currentSale: null, currentReservation: { _id: 'r1', customerName: 'Juan' } },
      { _id: 't0', number: 0, zona: 'Para llevar', status: 'libre', isOccupied: false, currentSale: null }
    ];
  }

  beforeEach(async () => {
    api = jasmine.createSpyObj('ApiService', [
      'getTables', 'freeTable', 'createReservation', 'completeReservation', 'cancelReservation', 'cancelSale', 'getReservations',
      'getPendingKitchenOrders', 'getSale', 'paySale'
    ]);
    api.getTables.and.callFake(() => of(makeMockTables()));
    api.getReservations.and.returnValue(of([]));
    api.getPendingKitchenOrders.and.returnValue(of([]));
    api.getSale.and.returnValue(of({ _id: 's9', total: 10000, items: [], dishItems: [], status: 'pendiente' }));
    api.paySale.and.returnValue(of({ _id: 's9', status: 'pagada' }));
    api.freeTable.and.returnValue(of({}));
    api.cancelSale.and.returnValue(of({ _id: 's1', status: 'cancelada' }));

    navigateSpy = jasmine.createSpy('navigate');

    await TestBed.configureTestingModule({
      declarations: [MesasComponent],
      imports: [CommonModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: AuthService, useValue: { currentUser: { role: 'admin', name: 'Admin' } } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(MesasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tables on init', () => {
    expect(api.getTables).toHaveBeenCalled();
    expect(component.tables.length).toBe(4);
  });

  it('should filter tables by status', () => {
    component.filtro = 'ocupada';
    expect(component.mesasFiltradas.length).toBe(1);
    expect(component.mesasFiltradas[0].number).toBe(2);
    component.filtro = 'libre';
    expect(component.mesasFiltradas.length).toBe(2);
  });

  it('should count only the 16 tables (takeout excluded)', () => {
    expect(component.libres).toBe(1);
    expect(component.ocupadas).toBe(1);
    expect(component.reservadas).toBe(1);
  });

  it('should show libre on tables arriving without status (legacy docs)', () => {
    component.tables = [
      { _id: 'tx', number: 7, zona: 'Salón 1' },
      { _id: 't0', number: 0, zona: 'Para llevar', status: 'libre' }
    ];
    fixture.detectChanges();
    const badges: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.table-status')
    ).map((el: any) => (el.textContent || '').trim());
    expect(badges).toContain('libre');
    expect(badges.some(b => b === '')).toBeFalse();
  });

  it('should group tables by salon in order', () => {
    const grupos = component.grupos;
    expect(grupos.map(g => g.nombre)).toEqual(['Salón 1', 'Salón 2']);
    expect(grupos[0].mesas.length).toBe(2);
    expect(grupos[1].mesas[0].number).toBe(10);
  });

  it('should expose takeout separately from table groups', () => {
    expect(component.paraLlevar.number).toBe(0);
    expect(component.grupos.every(g => g.nombre !== 'Para llevar')).toBeTrue();
  });

  it('should navigate to pos when free table pedido is confirmed', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    component.onTableClick(component.tables[0]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(navigateSpy).toHaveBeenCalledWith(['/pos'], { queryParams: { table: 1 } });
  });

  it('should navigate to pos when occupied table ver pedido is confirmed', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    component.onTableClick(component.tables[1]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(navigateSpy).toHaveBeenCalledWith(['/pos'], { queryParams: { table: 2 } });
    expect(api.freeTable).not.toHaveBeenCalled();
  });

  it('should clear the table draft when freeing the table', async () => {
    localStorage.setItem('pos-borradores', JSON.stringify({ '2': [{ productName: 'P' }], '5': [{ productName: 'Q' }] }));
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    component.confirmFreeTable(component.tables[1]);
    await new Promise(resolve => setTimeout(resolve, 0));
    const b = JSON.parse(localStorage.getItem('pos-borradores') || '{}');
    expect(b['2']).toBeUndefined();
    expect(b['5'].length).toBe(1);
  });

  it('should clear the table draft when annulling the sale', async () => {
    localStorage.setItem('pos-borradores', JSON.stringify({ '2': [{ productName: 'P' }] }));
    const fireSpy = spyOn(Swal, 'fire');
    fireSpy.withArgs(jasmine.objectContaining({ confirmButtonText: '🧾 Ver pedido' }))
      .and.returnValue(Promise.resolve({ isDenied: true } as any));
    fireSpy.and.returnValue(Promise.resolve({ isConfirmed: true, value: 'se fue' } as any));
    component.onTableClick(component.tables[1]);
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(api.cancelSale).toHaveBeenCalledWith('s1', { reason: 'se fue' });
    expect(api.freeTable).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('pos-borradores')).toBe('{}');
  });

  it('should free occupied table when liberar is chosen and confirmed', async () => {
    const fireSpy = spyOn(Swal, 'fire');
    fireSpy.and.callFake((opts: any) => {
      if (opts && opts.confirmButtonText === '🧾 Ver pedido') {
        return Promise.resolve({ isDenied: true } as any);
      }
      if (opts && opts.title && String(opts.title).includes('Anular')) {
        return Promise.resolve({ isConfirmed: false } as any);
      }
      return Promise.resolve({ isConfirmed: true } as any);
    });
    // Simular clic en el enlace "Liberar mesa sin anular" del footer
    component.confirmFreeTable(component.tables[1]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(api.freeTable).toHaveBeenCalledWith('t2');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should NOT call freeTable when dialog is cancelled', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: false } as any));
    component.onTableClick(component.tables[1]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(api.freeTable).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should count active reservations per table', () => {
    api.getReservations.and.returnValue(of([
      { _id: 'r1', table: { _id: 't3' }, status: 'pendiente', date: new Date().toISOString() },
      { _id: 'r2', table: { _id: 't3' }, status: 'confirmada', date: new Date().toISOString() },
      { _id: 'r3', table: { _id: 't3' }, status: 'cancelada', date: new Date().toISOString() }
    ]));
    component.cargarConteos();
    expect(component.conteoReservas['t3']).toBe(2);
  });

  it('should navigate with reserva id when starting order from reservation (without completing yet)', () => {
    const table = component.tables[2];
    component.iniciarPedidoReserva(table, { _id: 'r1', customerName: 'Juan' });
    expect(navigateSpy).toHaveBeenCalledWith(['/pos'], { queryParams: { table: 10, reserva: 'r1' } });
    expect(api.completeReservation).not.toHaveBeenCalled();
  });

  it('should search orphan orders when occupied table has no linked sale', async () => {
    api.getPendingKitchenOrders.and.returnValue(of([
      { _id: 'k1', tableNumber: 2, sale: 's9', status: 'nuevo' }
    ]));
    const fire = spyOn(Swal, 'fire');
    component.onTableClick({ _id: 't9', number: 2, status: 'ocupada', currentSale: null });
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(api.getPendingKitchenOrders).toHaveBeenCalled();
    expect(api.getSale).toHaveBeenCalledWith('s9');
    const args = fire.calls.mostRecent().args[0] as any;
    expect(args.title).toContain('Pedidos sin enlazar');
    expect(args.html).toContain('Pedido 1');
  });

  it('should offer agregar nueva reserva next to Cerrar on reserved tables', async () => {
    const r1 = { _id: 'r1', customerName: 'Juan', numberOfPeople: 2, date: new Date(2026, 8, 28, 19, 0).toISOString(), status: 'pendiente' };
    api.getReservations.and.returnValue(of([r1]));
    const fire = spyOn(Swal, 'fire');
    let llamadas = 0;
    fire.and.callFake(() => {
      llamadas += 1;
      if (llamadas === 1) return Promise.resolve({ isDenied: true } as any);
      return Promise.resolve({ isConfirmed: false } as any);
    });
    component.onTableClick(component.tables[2]);
    await new Promise(resolve => setTimeout(resolve, 100));
    const args = fire.calls.allArgs().find(a => (a[0] as any).denyButtonText);
    expect(args).toBeTruthy();
    expect((args![0] as any).denyButtonText).toContain('Agregar nueva reserva');
  });

  it('should open reservations window with all data on reserved click', async () => {
    const r1 = { _id: 'r1', customerName: 'Juan', numberOfPeople: 2, date: new Date(2026, 8, 28, 19, 0).toISOString(), status: 'pendiente' };
    const r2 = { _id: 'r2', customerName: 'Ana', numberOfPeople: 4, date: new Date(2026, 8, 29, 20, 0).toISOString(), status: 'confirmada' };
    api.getReservations.and.returnValue(of([r1, r2]));
    const fire = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({} as any));
    component.onTableClick(component.tables[2]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(api.getReservations).toHaveBeenCalledWith({ table: 't3' });
    expect(fire).toHaveBeenCalled();
    const html = (fire.calls.mostRecent().args[0] as any).html as string;
    expect(html).toContain('Juan');
    expect(html).toContain('Ana');
    expect(html).toContain('Fecha y hora');
  });
});
