import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParameterRowComponent } from './parameter-row.component';

describe('ParameterRowComponent', () => {
  let component: ParameterRowComponent;
  let fixture: ComponentFixture<ParameterRowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ParameterRowComponent]
    });
    fixture = TestBed.createComponent(ParameterRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
