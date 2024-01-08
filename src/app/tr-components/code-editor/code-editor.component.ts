import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { of } from 'rxjs';
import { TabState } from 'src/app/tr-enums/ui-state';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';
import { UiService } from 'src/app/tr-services/ui.service';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.css']
})
export class CodeEditorComponent {
    languageSelected = "json";
    textareaControl = new FormControl('');

    constructor(
        private exportJsonDataService: ExportJsonDataService,
        private pnmlService: PnmlService
    ) {}

    // loads the source code in json or pnml depending on 
    // which language is selected in the language switch
    public loadSourceCode() {
        if (this.languageSelected === "json") {
            const jsonContent = this.exportJsonDataService.getJson();
            if (jsonContent) {
                this.textareaControl.setValue(jsonContent);
            }
        } else {
            this.textareaControl.setValue(this.pnmlService.getPNML());
        }
    }
}
