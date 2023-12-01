import {Component} from '@angular/core';
import {FormControl} from '@angular/forms';
import { TokenGameService } from 'src/app/tr-services/token-game.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {

    public textareaFc: FormControl;

    constructor(protected tokenGameService: TokenGameService) {
        this.textareaFc = new FormControl();
        this.textareaFc.disable();
    }

    public processSourceChange(newSource: string) {
        this.textareaFc.setValue(newSource);
    }

}
