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
  constructor(public uiService: UiService) {}

  protected readonly TabState = TabState;
}
