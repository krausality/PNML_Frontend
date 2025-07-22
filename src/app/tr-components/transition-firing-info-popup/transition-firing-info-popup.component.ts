import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TransitionFiringInfo } from '../../tr-interfaces/dialog/transition-firing-info';

@Component({
    selector: 'app-transition-firing-info-popup',
    templateUrl: './transition-firing-info-popup.component.html',
    styleUrls: ['./transition-firing-info-popup.component.css']
})
export class TransitionFiringInfoPopupComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: TransitionFiringInfo) {}
}