import { Component } from '@angular/core';
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
    // @ViewChild("textarea") textarea;
    textareaControl = new FormControl('');

    uiTabs$ = of(this.uiService.tab);

    constructor(
        private exportJsonDataService: ExportJsonDataService,
        private pnmlService: PnmlService,
        private uiService: UiService
    ) {
        this.uiTabs$.subscribe(tabValue => {
            console.log("test");
            if (tabValue === TabState.Code) {
                this.loadSourceCode();
            }
        });
    }

    public languageSwitchChanged() {
        this.loadSourceCode();
    }

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
