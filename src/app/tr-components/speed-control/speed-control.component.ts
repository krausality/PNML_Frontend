import { Component, OnDestroy, OnInit } from '@angular/core';
import { UiService } from '../../tr-services/ui.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-speed-control',
  templateUrl: './speed-control.component.html',
  styleUrls: ['./speed-control.component.css']
})
export class SpeedControlComponent implements OnInit, OnDestroy {
  // Defines the discrete steps for the slider and their corresponding speeds/labels
  readonly speedMap = [
    { value: 0, label: '0x', actualSpeed: 0 },    // Pause
    { value: 1, label: '0.5x', actualSpeed: 0.5 }, // Half speed
    { value: 2, label: '1x', actualSpeed: 1 },    // Normal speed
    { value: 3, label: '2x', actualSpeed: 2 },    // Double speed
    { value: 4, label: '4x', actualSpeed: 4 }     // Quadruple speed
  ];
  
  // sliderValue holds the 'value' from speedMap (0 to 4), representing the slider's position
  sliderValue: number = 2; // Default to 1x speed (which is speedMap[2])
  private speedSubscription: Subscription | undefined;

  constructor(private uiService: UiService) {}

  ngOnInit(): void {
    // Subscribe to simulation speed changes from UiService to keep slider synchronized
    this.speedSubscription = this.uiService.simulationSpeed$.subscribe(currentActualSpeed => {
      const matchingSpeedEntry = this.speedMap.find(s => s.actualSpeed === currentActualSpeed);
      if (matchingSpeedEntry) {
        this.sliderValue = matchingSpeedEntry.value;
      } else {
        // If the speed from UiService isn't one of our predefined actualSpeeds,
        // default the slider to 1x and update UiService to reflect this.
        this.sliderValue = 2; // Default slider position for 1x
        this.uiService.setSimulationSpeed(this.speedMap[this.sliderValue].actualSpeed);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.speedSubscription) {
      this.speedSubscription.unsubscribe();
    }
  }

  /**
   * Called when the slider's value changes.
   * Updates the simulation speed in UiService based on the new slider position.
   * @param newSliderValue The new value from the slider (0-4).
   */
  onSpeedChange(newSliderValue: number | null): void {
    if (newSliderValue !== null && newSliderValue >= 0 && newSliderValue < this.speedMap.length) {
      this.uiService.setSimulationSpeed(this.speedMap[newSliderValue].actualSpeed);
    }
  }

  /**
   * Formats the label for the slider's ticks and current value display.
   * @param value The slider's internal value (0-4).
   * @returns The display label (e.g., "1x").
   */
  formatLabel(value: number): string {
    const speedEntry = this.speedMap.find(s => s.value === value);
    return speedEntry ? speedEntry.label : `${value}`;
  }
}
