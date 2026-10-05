import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SgSstComponent } from './sg-sst.component';

describe('SgSstComponent', () => {
  let component: SgSstComponent;
  let fixture: ComponentFixture<SgSstComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [SgSstComponent],
      imports: [CommonModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SgSstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with seed data', () => {
    expect(component).toBeTruthy();
    expect(component.peligros.length).toBe(8);
    expect(component.capacitaciones.length).toBe(6);
    expect(component.plan.length).toBe(6);
  });

  it('should render full texts without empty badges', () => {
    const texto: string = fixture.nativeElement.textContent || '';
    expect(texto).toContain('Quemaduras por aceite y plancha');
    expect(texto).toContain('En seguimiento');
    const vacios: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.badge')
    )
      .map((el: any) => (el.textContent || '').trim())
      .filter(b => b === '');
    expect(vacios.length).toBe(0);
  });

  it('should filter hazards by area and search', () => {
    component.filtroArea = 'Barra';
    expect(component.peligrosFiltrados.length).toBe(1);
    component.filtroArea = '';
    component.search = 'gas';
    expect(component.peligrosFiltrados.length).toBe(1);
    expect(component.peligrosFiltrados[0].peligro).toContain('gas');
  });

  it('should add and persist a hazard', () => {
    const antes = component.peligros.length;
    component.fPeligro = { ...component.nPeligro(), peligro: 'Prueba corte', controles: 'Control prueba' };
    component.guardar();
    expect(component.peligros.length).toBe(antes + 1);
    expect(JSON.parse(localStorage.getItem('soupe-sgsst-v1') || '{}').peligros.length).toBe(antes + 1);
  });

  it('should count open KPIs', () => {
    expect(component.cumplimiento).toBe(87);
    expect(component.capRealizadas).toBe(4);
    expect(component.incidentesAbiertos).toBe(1);
  });
});
