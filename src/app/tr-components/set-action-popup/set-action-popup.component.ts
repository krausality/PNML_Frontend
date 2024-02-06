import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SetActionDialogData } from 'src/app/tr-interfaces/dialog/set-action-dialog-data';
import { DataService } from 'src/app/tr-services/data.service';

@Component({
    selector: 'app-set-action-popup',
    templateUrl: './set-action-popup.component.html',
    styleUrls: ['./set-action-popup.component.css'],
})
export class SetActionPopupComponent {
    constructor(
        protected dataService: DataService,
        @Inject(MAT_DIALOG_DATA) protected data: SetActionDialogData,
    ) {}

    replaceBreakChar(action: string): string {
        return action.replace("~", "↲")
    }
}


