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
export class CodeEditorComponent implements OnInit {
    languageSelected = "json";
    // @ViewChild("textarea") textarea;
    textareaControl = new FormControl('');

    constructor(
        private exportJsonDataService: ExportJsonDataService,
        private pnmlService: PnmlService,
        private uiService: UiService
    ) {}

    // subscribe to the tabSubject on initialisation
    // allows us to reload the source code every time
    // the "code" tab is opened
    ngOnInit() {
        this.uiService.tabSubject.subscribe(tab => {
            if (tab === TabState.Code) {
                this.loadSourceCode();
            }
        });
    }

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
