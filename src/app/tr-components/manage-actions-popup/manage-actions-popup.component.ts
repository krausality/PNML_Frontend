import { Component } from '@angular/core';
import { DataService } from 'src/app/tr-services/data.service';
import { FormBuilder } from '@angular/forms';

@Component({
    selector: 'app-manage-actions-popup',
    templateUrl: './manage-actions-popup.component.html',
    styleUrls: ['./manage-actions-popup.component.css'],
})
export class ManageActionsPopupComponent {
    actionSubmittedOnce = false;

    checkoutForm = this.formBuilder.group({
        line_1: '',
        line_2: ''
    });

    constructor(
        protected dataService: DataService,
        private formBuilder: FormBuilder) {}

    // check that the action is not already present and add it to the dataService
    addAction(action: string) {
        if (
            !this.isActionEmpty(action) &&
            !this.dataService.getActions().includes(action)
        ) {
            this.dataService.getActions().push(action);
        }
        action = '';
        this.actionSubmittedOnce = true;
    }

    isActionEmpty(action: string): boolean {
        return !action.trim();
    }

    onSubmit(): void {
        if((this.checkoutForm.value.line_1 && this.checkoutForm.value.line_2))
        {

            console.log(this.checkoutForm.value.line_1 + this.checkoutForm.value.line_2);
            this.addAction(this.checkoutForm.value.line_1 + '~' + this.checkoutForm.value.line_2);
        }
        this.checkoutForm.reset();
    }
}
