import {Component} from '@angular/core';
import {FormControl} from '@angular/forms';
import { ExportImageService } from './tr-services/export-image.service';
import { ExportSvgService } from './tr-services/export-svg.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {

    public textareaFc: FormControl;

    constructor(public exportImageService: ExportImageService,
                public exportSvgService: ExportSvgService,) {
        this.textareaFc = new FormControl();
        this.textareaFc.disable();
    }

    public processSourceChange(newSource: string) {
        this.textareaFc.setValue(newSource);
    }
}
