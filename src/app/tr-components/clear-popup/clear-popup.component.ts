import { Component } from '@angular/core';
import { DataService } from 'src/app/tr-services/data.service';
import {ButtonState} from "../../tr-enums/ui-state";
import {MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'app-manage-actions-popup',
  templateUrl: './clear-popup.component.html',
  styleUrls: ['./clear-popup.component.css']
})
export class ClearPopupComponent {

    constructor(protected dataService: DataService, private dialogRef: MatDialogRef<ClearPopupComponent>) {}

    // Clear Petri-Net
    clear(): void {
        this.dataService.clearAll();
    }

    closeDialog(){
        this.dialogRef.close();
    }

    protected readonly ButtonState = ButtonState;
}
