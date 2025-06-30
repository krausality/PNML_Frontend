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

  // Mock model list (replace with API call later)
  offshoreModels: OffshoreModelInfo[] = [
    { id: '1', name: 'Modell 1', description: '' },
    { id: '2', name: 'Modell 2', description: '' },
    { id: '3', name: 'Modell 3', description: '' }
  ];
  selectedOffshoreModelId: string | null = null;

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
  onOffshoreModelChange(modelId: string) {
    this.selectedOffshoreModelId = modelId;
    // TODO: Load model data for simulation
    console.log('Selected offshore model:', modelId);
  }
  onOffshoreStartSimulation(): void {
    // TODO: Implementiere die Logik zum Starten der Simulation im Offshore-Tab
    console.log('Offshore: Start Simulation clicked');
  }
}

/**
 * MOCK: Model selector for Offshore tab.
 *
 * Später Modelle vom Backend holen:
 *   GET /api/offshore/models
 *   Accept: application/json
 *   Response: [
 *     {
 *       id: string,           // Unique identifier for the model
 *       name: string,         // Human-readable name
 *       description: string,  // Short description
 *       createdAt: string,    // ISO date string (optional)
 *       type: string          // Model type/category (optional)
 *     }, ...
 *   ]
 *
 * Einzelnes Modell laden:
 *   GET /api/offshore/models/{id}
 */
export interface OffshoreModelInfo {
  id: string;
  name: string;
  description: string;
}
