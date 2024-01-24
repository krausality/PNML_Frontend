import { Component } from '@angular/core';
import { DataService } from 'src/app/tr-services/data.service';

@Component({
    selector: 'app-manage-actions-popup',
    templateUrl: './manage-actions-popup.component.html',
    styleUrls: ['./manage-actions-popup.component.css'],
})
export class ManageActionsPopupComponent {
    actionSubmittedOnce = false;
    bothActionsEmpty = false;
    actionAlreadyExists = false;
    actionLine1: HTMLInputElement | undefined;
    actionLine2: HTMLInputElement | undefined;

    constructor(protected dataService: DataService) {}

    // check that the action is not already present and add it to the dataService
    addAction(actionLine1: HTMLInputElement, actionLine2: HTMLInputElement) {
        if (
            !this.isActionEmpty(actionLine1.value) &&
            this.isActionEmpty(actionLine2.value) &&
            !this.dataService.getActions().includes(actionLine1.value)
        ) {
            this.dataService.getActions().push(actionLine1.value.trim());
            this.bothActionsEmpty = false;
            this.actionAlreadyExists = false;
        } else if (
            this.isActionEmpty(actionLine1.value) &&
            !this.isActionEmpty(actionLine2.value) &&
            !this.dataService.getActions().includes(actionLine2.value)
        ) {
            this.dataService.getActions().push(actionLine2.value);
            this.bothActionsEmpty = false;
            this.actionAlreadyExists = false;
        } else if (
            !this.isActionEmpty(actionLine1.value) &&
            !this.isActionEmpty(actionLine2.value) &&
            !this.dataService.getActions().includes(actionLine1.value + '~' +actionLine2.value)
        ) {
            this.dataService.getActions().push(actionLine1.value.trim() + '~' +actionLine2.value);
            this.bothActionsEmpty = false;
            this.actionAlreadyExists = false;
        } else if (
            this.isActionEmpty(actionLine1.value) &&
            this.isActionEmpty(actionLine2.value)
        ) {
            this.bothActionsEmpty = true;
        } else if (
            this.dataService.getActions().includes(actionLine1.value) ||
            this.dataService.getActions().includes(actionLine2.value) ||
            this.dataService.getActions().includes(actionLine1.value + '~' +actionLine2.value)
        ) {
            this.actionAlreadyExists = true;
        }

        actionLine1.value = '';
        actionLine2.value = '';
    }

    isActionEmpty(action: string): boolean {
        return !action.trim();
    }

    saveActionLine1(actionLine1: HTMLInputElement) {
        this.actionLine1 = actionLine1;
    }

    saveActionLine2(actionLine2: HTMLInputElement) {
        this.actionLine2 = actionLine2;
    }

    returnLine1(action: string): string {
        return (action.split("~"))[0];
    }

    returnLine2(action: string): string {
        return (action.split("~"))[1];
    }

    containsBreakChar(action: string): boolean {
        return action.includes('~');
    }
}
