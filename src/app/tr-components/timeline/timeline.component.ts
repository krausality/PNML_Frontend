// src/app/tr-components/timeline/timeline.component.ts
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css']
})
export class TimelineComponent implements OnChanges {
  @Input() totalSteps: number = 0; // This should represent the number of STATES (numFirings + 1)
  @Input() currentStep: number = 0; // This is the current STATE index
  @Output() stepChanged = new EventEmitter<number>();

  _sliderValue: number = 0;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep']) {
      this._sliderValue = changes['currentStep'].currentValue;
    }
    if (changes['totalSteps']) {
      // totalSteps is the number of states. Slider max is numStates - 1.
      if (this.totalSteps === 0) { // Should not happen if there's always an initial state
        this._sliderValue = 0;
      }
      if (this._sliderValue >= this.totalSteps && this.totalSteps > 0) {
        this._sliderValue = this.totalSteps - 1;
      }
      if (this.totalSteps > 0 && this.currentStep === 0) {
        this._sliderValue = 0;
      }
    }
  }

  onSliderInputChange(newStep: number | null): void {
    if (newStep !== null && newStep >= 0 && newStep < this.totalSteps && newStep !== this.currentStep) {
        this.stepChanged.emit(newStep);
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.stepChanged.emit(this.currentStep - 1);
    }
  }

  nextStep(): void {
    // Can go up to the last state, which is totalSteps - 1
    if (this.totalSteps > 0 && this.currentStep < this.totalSteps - 1) {
      this.stepChanged.emit(this.currentStep + 1);
    }
  }
}
