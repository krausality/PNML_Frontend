import { Component } from '@angular/core';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';
import { UiService } from 'src/app/tr-services/ui.service';
import { ExportImageService } from 'src/app/tr-services/export-image.service';
import { ExportSvgService } from 'src/app/tr-services/export-svg.service';
import { MatDialog } from '@angular/material/dialog';
import { ManageActionsPopupComponent } from '../manage-actions-popup/manage-actions-popup.component';
import { TokenGameService } from 'src/app/tr-services/token-game.service';
import {
    ButtonState,
    CodeEditorFormat,
    TabState,
} from 'src/app/tr-enums/ui-state';
import { ClearPopupComponent } from '../clear-popup/clear-popup.component';
import { DataService } from '../../tr-services/data.service';
import { PlaceInvariantsService } from 'src/app/tr-services/place-invariants.service';
import { PlaceInvariantsTableComponent } from '../place-invariants-table/place-invariants-table.component';
import { LayoutSpringEmbedderService } from 'src/app/tr-services/layout-spring-embedder.service';
import { LayoutSugiyamaService } from 'src/app/tr-services/layout-sugiyama.service';

import { showTooltipDelay } from 'src/app/tr-services/position.constants';
import { HelpPopupComponent } from '../help-popup/help-popup.component';
import { ErrorPopupComponent } from '../error-popup/error-popup.component'; // Import ErrorPopupComponent

@Component({
    selector: 'app-button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.css'],
})
export class ButtonBarComponent {
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
        protected placeInvariantsService: PlaceInvariantsService,
        private layoutSpringEmebdderService: LayoutSpringEmbedderService,
        private layoutSugiyamaService: LayoutSugiyamaService,
    ) {}

    // Gets called when a tab is clicked
    // Sets the "tab" property in the uiService
    // Empties the "button" property in the uiService
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
            case 'analyze':
                this.placeInvariantsService.reset();
                this.uiService.tab = this.TabState.Analyze;
                break;
            case 'code':
                this.uiService.tab = this.TabState.Code;
                this.uiService.codeEditorFormat$.next(
                    this.uiService.codeEditorFormat$.value,
                );
                break;
        }
        this.uiService.button = null;
        this.uiService.buttonState$.next(null);

        setTimeout(() => {
            this.uiService.tabTransitioning = false;
        }, 1100);
    }

    // Gets called when a button is clicked that needs its state saved globally
    // Sets the "button" property in the uiService
    buttonClicked(button: ButtonState) {
        this.uiService.button = button;
        this.uiService.buttonState$.next(button);
    }

    openActionDialog() {
        this.matDialog.open(ManageActionsPopupComponent);
    }

    openClearDialog() {
        // Necessary To Reset Line-Drawing from Blitz-Tool
        this.buttonClicked(ButtonState.Clear);
        if (!this.dataService.isEmpty()) {
            this.matDialog.open(ClearPopupComponent);
        }
    }

    openPlaceInvariantsTable() {
        this.matDialog.open(PlaceInvariantsTableComponent);
    }

    openHelpDialog() {
        this.matDialog.open(HelpPopupComponent);
    }

    applyLayout(layoutAlgorithm: string) {
        switch (layoutAlgorithm) {
            case 'spring-embedder':
                this.layoutSpringEmebdderService.layoutSpringEmbedder();
                break;
            case 'sugiyama':
                this.layoutSpringEmebdderService.terminate();
                this.layoutSugiyamaService.applySugiyamaLayout();
                break;
            default:
                this.layoutSpringEmebdderService.terminate();
                break;
        }
    }

    switchCodeEditorFormat(format: CodeEditorFormat) {
        // Only send a new value if it is not the same as the current value
        if (format === this.uiService.codeEditorFormat$.value) {
            return;
        }

        // Set the new format as next value in the BehaviorSubject
        this.uiService.codeEditorFormat$.next(format);
    }

    /**
     * Handles the file input change event for PNML uploads.
     * Reads the selected file and triggers parsing via PnmlService.
     * @param event The file input change event.
     */
    uploadPnmlFile(event: Event): void {
        console.log('ButtonBarComponent.uploadPnmlFile: Event triggered', event); // Log entry
        const input = event.target as HTMLInputElement;

        if (!input.files || input.files.length === 0) {
            console.warn('ButtonBarComponent.uploadPnmlFile: No files selected.'); // Log no files
            return; // No file selected
        }

        const file = input.files[0];
        console.log('ButtonBarComponent.uploadPnmlFile: File selected:', file.name, file.type, file.size); // Log file info

        // Optional: Check file type although 'accept' attribute helps
        if (!file.name.toLowerCase().endsWith('.pnml')) {
            console.error('ButtonBarComponent.uploadPnmlFile: Invalid file type selected.'); // Log invalid type
            this.matDialog.open(ErrorPopupComponent, {
                data: {
                    error: 'Invalid file type. Please select a .pnml file.',
                },
            });
            input.value = ''; // Reset file input
            return;
        }

        const reader = new FileReader();
        console.log('ButtonBarComponent.uploadPnmlFile: FileReader created.'); // Log reader creation

        reader.onload = (e) => {
            console.log('ButtonBarComponent.uploadPnmlFile: FileReader onload triggered.'); // Log onload start
            try {
                const fileContent = reader.result as string;
                if (!fileContent) {
                    console.error('ButtonBarComponent.uploadPnmlFile: File content is empty or null after read.'); // Log empty content
                    throw new Error('File content is empty or could not be read.');
                }
                console.log('ButtonBarComponent.uploadPnmlFile: File read successfully (length:', fileContent.length, '). Calling pnmlService.parse...'); // Log success before parse
                // PnmlService.parse already updates DataService and applies layout
                this.pnmlService.parse(fileContent);
                console.log('ButtonBarComponent.uploadPnmlFile: pnmlService.parse completed.'); // Log after parse
                console.log('ButtonBarComponent.uploadPnmlFile: Explicitly calling dataService.triggerDataChanged()');
                this.dataService.triggerDataChanged(); // Trigger the update notification
                // Optional: Add success feedback if needed
            } catch (error) {
                console.error('ButtonBarComponent.uploadPnmlFile: Error during onload (parsing likely):', error); // Log error during parse
                this.matDialog.open(ErrorPopupComponent, {
                    data: { parsingError: error },
                });
            } finally {
                console.log('ButtonBarComponent.uploadPnmlFile: Resetting input value.'); // Log input reset
                // Reset file input to allow uploading the same file again
                input.value = '';
            }
        };

        reader.onerror = (e) => {
            console.error('ButtonBarComponent.uploadPnmlFile: FileReader onerror triggered:', reader.error); // Log reader error
            this.matDialog.open(ErrorPopupComponent, {
                data: { error: `Error reading file: ${reader.error?.message}` },
            });
            input.value = ''; // Reset file input
        };

        console.log('ButtonBarComponent.uploadPnmlFile: Calling reader.readAsText...'); // Log before readAsText
        reader.readAsText(file);
    }
}
