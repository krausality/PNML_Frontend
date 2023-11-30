import { Component } from '@angular/core';
import { DataService } from 'src/app/tr-services/data.service';

@Component({
  selector: 'app-action-popup',
  templateUrl: './action-popup.component.html',
  styleUrls: ['./action-popup.component.css']
})
export class ActionPopupComponent {

    constructor(protected dataService: DataService) {}

    // check that the action is not already present and add it to the dataService
    addAction(action: HTMLInputElement) {
        if (!this.dataService.getActions().includes(action.value)) {
            this.dataService.getActions().push(action.value);
        }
        action.value = "";
    }

}
