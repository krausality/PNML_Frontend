import { Component } from '@angular/core';
import { DataService } from '../../tr-services/data.service';
import { UiService } from '../../tr-services/ui.service';
import { TabState } from '../../tr-enums/ui-state';

@Component({
  selector: 'app-offshore-view',
  templateUrl: './offshore-view.component.html',
  styleUrls: ['./offshore-view.component.css'],
  providers: [DataService] // This is the key part: provides a local instance of DataService
})
export class OffshoreViewComponent {
  // Local simulation state for Offshore tab
  offshoreIsPlaying = false;
  offshoreCurrentStep = 0;
  offshoreTotalSteps = 0;
  offshoreIsHistoryEmpty = true;

  constructor(public uiService: UiService) {}

  protected readonly TabState = TabState;

  // Playback control handlers
  onOffshorePlay() {
    this.offshoreIsPlaying = true;
    // TODO: Start offshore simulation logic
  }
  onOffshorePause() {
    this.offshoreIsPlaying = false;
    // TODO: Pause offshore simulation logic
  }
  onOffshoreStop() {
    this.offshoreIsPlaying = false;
    this.offshoreCurrentStep = 0;
    // TODO: Stop/reset offshore simulation logic
  }
  onOffshoreRestart() {
    this.offshoreCurrentStep = 0;
    // TODO: Restart offshore simulation logic
  }
  onOffshoreRewind() {
    if (this.offshoreCurrentStep > 0) {
      this.offshoreCurrentStep--;
    }
    // TODO: Rewind offshore simulation logic
  }
  onOffshoreStepChanged(step: number) {
    this.offshoreCurrentStep = step;
    // TODO: Update Petri net view for offshore simulation
  }
}
