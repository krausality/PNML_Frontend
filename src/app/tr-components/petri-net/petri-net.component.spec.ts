import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PetriNetComponent } from './petri-net.component';

describe('PetriNetComponent', () => {
  let component: PetriNetComponent;
  let fixture: ComponentFixture<PetriNetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PetriNetComponent]
    });
    fixture = TestBed.createComponent(PetriNetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
