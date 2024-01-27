import { Component, ViewChild } from '@angular/core';
import { UiService } from './tr-services/ui.service';
import { TabState } from './tr-enums/ui-state';
import { CodeEditorComponent } from './tr-components/code-editor/code-editor.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent {
    @ViewChild(CodeEditorComponent) protected codeEditor!: CodeEditorComponent;

    constructor(protected uiService: UiService) {}

    protected readonly TabState = TabState;
}
