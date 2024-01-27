import { Component, Output, EventEmitter } from '@angular/core';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';
import { UiService } from 'src/app/tr-services/ui.service';
import { ExportImageService } from 'src/app/tr-services/export-image.service';
import { ExportSvgService } from 'src/app/tr-services/export-svg.service';
import { MatDialog } from '@angular/material/dialog';
import { ManageActionsPopupComponent } from '../manage-actions-popup/manage-actions-popup.component';
import { TokenGameService } from 'src/app/tr-services/token-game.service';
import { ButtonState, CodeEditorFormat, TabState } from 'src/app/tr-enums/ui-state';
import { ClearPopupComponent } from '../clear-popup/clear-popup.component';
import { DataService } from '../../tr-services/data.service';
import { LayoutSpringEmbedderService } from 'src/app/tr-services/layout-spring-embedder.service';
import { LayoutSugyiamaService } from 'src/app/tr-services/layout-sugyiama.service';

import { showTooltipDelay } from 'src/app/tr-services/position.constants';

@Component({
    selector: 'app-button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.css'],
})
export class ButtonBarComponent {
    @Output() applySourceCodeEvent = new EventEmitter();

    readonly TabState = TabState;
    readonly ButtonState = ButtonState;
    readonly CodeEditorFormat = CodeEditorFormat;

    readonly showTooltipDelay = showTooltipDelay;

    public petrinetCss: string = '';

    constructor(
        protected uiService: UiService,
        protected exportJsonDataService: ExportJsonDataService,
        protected pnmlService: PnmlService,
        protected exportImageService: ExportImageService,
        protected exportSvgService: ExportSvgService,
        protected tokenGameService: TokenGameService,
        private dataService: DataService,
        private matDialog: MatDialog,
        private layoutSpringEmebdderService: LayoutSpringEmbedderService,
        private layoutSugyiamaService: LayoutSugyiamaService,
    ) {}

    // gets called when a tab is clicked
    // sets the "tab" property in the uiService
    // empties the "button" property in the uiService
    tabClicked(tab: string) {
        this.uiService.tabTransitioning = true;

        switch (tab) {
            case 'build':
                this.uiService.tab = this.TabState.Build;
                this.tokenGameService.clearGameHistory();
                break;
            case 'play':
                this.uiService.tab = this.TabState.Play;
                break;
            case 'save':
                this.uiService.tab = this.TabState.Save;
                break;
            case 'code':
                this.uiService.tab = this.TabState.Code;
                this.uiService.codeEditorFormat$.next(this.uiService.codeEditorFormat$.value);
                break;
        }
        this.uiService.button = null;
        this.uiService.buttonState$.next(null)

        setTimeout(() => {
            this.uiService.tabTransitioning = false;
        }, 1100);
    }

    // gets called when a button is clicked that needs its state saved globally
    // sets the "button" property in the uiService
    buttonClicked(button: ButtonState) {
        this.uiService.button = button;
        this.uiService.buttonState$.next(button)
    }

    openActionDialog() {
        this.matDialog.open(ManageActionsPopupComponent);
    }

    openClearDialog() {
        if (!this.dataService.isEmpty()) {
            this.matDialog.open(ClearPopupComponent);
        }
    }

    applyLayout(layoutAlgorithm: string) {
        switch (layoutAlgorithm) {
            case 'spring-embedder':
                this.layoutSpringEmebdderService.layoutSpringEmbedder();
                break;
            case 'sugyiama':
                this.layoutSpringEmebdderService.terminate();
                this.layoutSugyiamaService.applySugyiamaLayout();
                break;
            default:
                this.layoutSpringEmebdderService.terminate();
                break;
        }
    }

    switchCodeEditorFormat(format: CodeEditorFormat) {
        // only send a new value if it is not the same as the current value
        if (format === this.uiService.codeEditorFormat$.value) {
            return;
        }

        // set the new format as next value in the BehaviorSubject
        this.uiService.codeEditorFormat$.next(format);
    }
}
