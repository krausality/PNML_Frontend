import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ErrorDialogData } from 'src/app/tr-interfaces/dialog/error-dialog-data';

@Component({
  selector: 'app-error-popup',
  templateUrl: './error-popup.component.html',
  styleUrls: ['./error-popup.component.css']
})
export class ErrorPopupComponent {

    constructor(@Inject(MAT_DIALOG_DATA) protected data: ErrorDialogData) {}

}
