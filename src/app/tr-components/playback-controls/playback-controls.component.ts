import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SimulationMode } from '../../tr-services/ui.service';

@Component({
  selector: 'app-playback-controls',
  templateUrl: './playback-controls.component.html',
  styleUrls: ['./playback-controls.component.css']
})
export class PlaybackControlsComponent {
  @Input() isPlaying: boolean = false;
  @Input() currentStep: number = 0;
  @Input() isHistoryEmpty: boolean = true;
  @Input() simulationMode: SimulationMode = 'automatic';

  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() rewind = new EventEmitter<void>();
  @Output() returnToAutomatic = new EventEmitter<void>();
}
