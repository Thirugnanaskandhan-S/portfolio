import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThisPc } from './this-pc';

describe('ThisPc', () => {
  let component: ThisPc;
  let fixture: ComponentFixture<ThisPc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThisPc],
    }).compileComponents();

    fixture = TestBed.createComponent(ThisPc);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
