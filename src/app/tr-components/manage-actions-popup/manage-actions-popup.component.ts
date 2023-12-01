import { Component } from '@angular/core';
import { DataService } from 'src/app/tr-services/data.service';

@Component({
  selector: 'app-manage-actions-popup',
  templateUrl: './manage-actions-popup.component.html',
  styleUrls: ['./manage-actions-popup.component.css']
})
export class ManageActionsPopupComponent {

    constructor(protected dataService: DataService) {}

    // check that the action is not already present and add it to the dataService
    addAction(action: HTMLInputElement) {
        if (!this.dataService.getActions().includes(action.value)) {
            this.dataService.getActions().push(action.value);
        }
        action.value = "";
    }

}
