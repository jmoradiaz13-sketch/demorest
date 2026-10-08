import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { EventsComponent } from './events.component';
import { ApiService } from '../../core/services/api.service';

describe('EventsComponent', () => {
  let component: EventsComponent;
  let fixture: ComponentFixture<EventsComponent>;
  const apiSpy = jasmine.createSpyObj('ApiService', ['getEvents', 'addEventMilestone', 'removeEventMilestone', 'getEvent']);

  const mkEv = (over: any = {}) => ({
    _id: 'e1', customerName: 'Cliente Prueba', eventType: 'evento_local',
    eventDate: new Date(2026, 8, 28, 18, 0).toISOString(),
    endDate: new Date(2026, 8, 28, 22, 0).toISOString(),
    status: 'pendiente', numberOfAttendees: 10, totalCost: 100, payments: [],
    ...over
  });

  beforeEach(async () => {
    apiSpy.getEvents.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      declarations: [EventsComponent],
      imports: [CommonModule, FormsModule],
      providers: [{ provide: ApiService, useValue: apiSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(EventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create in month view', () => {
    expect(component).toBeTruthy();
    expect(component.viewMode).toBe('mes');
  });

  it('should filter by tab, client and status', () => {
    component.events = [
      mkEv({}),
      mkEv({ _id: 'e2', eventType: 'catering_externo', customerName: 'Empresa X', status: 'confirmado' })
    ];
    expect(component.eventosFiltrados.length).toBe(1);
    component.filtroCliente = 'empresa';
    component.vista = 'catering';
    expect(component.eventosFiltrados.length).toBe(1);
    component.filtroEstado = 'pendiente';
    expect(component.eventosFiltrados.length).toBe(0);
  });

  it('should build week with 7 days and group events', () => {
    component.events = [mkEv({})];
    component.anchorDate = new Date(2026, 8, 28); // lunes
    const sem = component.diasSemana;
    expect(sem.length).toBe(7);
    expect(sem[0].key).toBe('2026-09-28');
    expect(sem[0].eventos.length).toBe(1);
  });

  it('should open drawer on single event and ask on empty day', async () => {
    const ev = mkEv({});
    component.abrirDia({ date: new Date(2026, 8, 28), eventos: [ev] });
    expect(component.showDrawer).toBeTrue();
    expect(component.selectedEv).toBe(ev);

    const Swal = await import('sweetalert2');
    const fire = spyOn(Swal.default, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);
    const formSpy = spyOn(component, 'openForm');
    component.vista = 'evento';
    component.abrirDia({ date: new Date(2030, 4, 15), eventos: [] });
    await Promise.resolve();
    expect(fire).toHaveBeenCalled();
    expect(formSpy).toHaveBeenCalled();
    const prefill = formSpy.calls.mostRecent().args[1] as Date;
    expect(prefill.getDate()).toBe(15);
  });

  it('should prefill date when creating from empty day', () => {
    component.openForm(undefined, new Date(2030, 4, 15));
    expect(component.showForm).toBeTrue();
    expect(component.form.fechaEvento).toBe('2030-05-15');
    expect(component.form.horaInicio).toBe('12:00');
  });

  it('should navigate title per view', () => {
    component.setView('dia');
    component.anchorDate = new Date(2026, 8, 28);
    expect(component.tituloVista()).toContain('2026');
    component.setView('semana');
    expect(component.tituloVista()).toContain('Semana');
    component.setView('mes');
    expect(component.tituloVista()).toContain('2026');
  });

  it('should compute milestone totals and overdue state', () => {    const ev = {
      payments: [
        { amount: 1500, milestone: 'h1' },
        { amount: 500, milestone: null }
      ]
    };
    expect(component.abonadoHito(ev, { _id: 'h1' })).toBe(1500);
    expect(component.hitoVencido({ estado: 'pendiente', vencimiento: new Date(2020, 0, 1).toISOString() })).toBeTrue();
    expect(component.hitoVencido({ estado: 'pagado', vencimiento: new Date(2020, 0, 1).toISOString() })).toBeFalse();
    expect(component.hitoLabel({ estado: 'parcial' })).toBe('Parcial');
  });

  it('should format COP with thousand separators on input', () => {
    component.form.totalCost = 0;
    const input = document.createElement('input');
    input.value = '1500000';
    component.onTotalCostInput({ target: input } as any);
    expect(component.form.totalCost).toBe(1500000);
    expect(input.value).toBe('1.500.000');
    expect(component.totalCostDisplay).toBe('1.500.000');
  });

  it('should require monto mayor a 0 al guardar', async () => {
    const Swal = await import('sweetalert2');
    const fire = spyOn(Swal.default, 'fire');
    component.form.totalCost = 0;
    component.saveEvent();
    expect(fire).toHaveBeenCalledWith('Monto requerido', jasmine.anything(), 'warning');
    expect(component.saving).toBeFalse();
  });

  it('should not offer scheduling on past days', async () => {
    const Swal = await import('sweetalert2');
    const fire = spyOn(Swal.default, 'fire');
    const formSpy = spyOn(component, 'openForm');
    component.abrirDia({ date: new Date(2020, 4, 5), key: '2020-05-05', eventos: [] });
    expect(formSpy).not.toHaveBeenCalled();
    expect(fire).toHaveBeenCalled();
    expect(component.esDiaPasado(new Date(2020, 4, 5))).toBeTrue();
    expect(component.esDiaPasado(new Date(2030, 4, 5))).toBeFalse();
  });

  it('should show past non-cancelled events as realizado', () => {
    const pasado = mkEv({ status: 'pendiente', eventDate: new Date(2020, 4, 5, 18, 0).toISOString() });
    expect(component.estadoVisible(pasado)).toBe('realizado');
    const cancelado = mkEv({ status: 'cancelado', eventDate: new Date(2020, 4, 5, 18, 0).toISOString() });
    expect(component.estadoVisible(cancelado)).toBe('cancelado');
    const futuro = mkEv({ status: 'pendiente', eventDate: new Date(2030, 4, 5, 18, 0).toISOString() });
    expect(component.estadoVisible(futuro)).toBe('pendiente');
    const hecho = mkEv({ status: 'realizado', eventDate: new Date(2020, 4, 5, 18, 0).toISOString() });
    expect(component.estadoVisible(hecho)).toBe('realizado');
  });
});
