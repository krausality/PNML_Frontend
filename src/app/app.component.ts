import { Component, ViewChild, OnInit, HostListener } from '@angular/core';
import { UiService } from './tr-services/ui.service';
import { TabState } from './tr-enums/ui-state';
import { CodeEditorComponent } from './tr-components/code-editor/code-editor.component';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from './tr-services/data.service';
import { DataPersistenceInfoDialogComponent } from './tr-components/data-persistence-info-dialog/data-persistence-info-dialog.component';

/**
 * Root component of the PNML_Frontend application.
 *
 * Responsibilities:
 * - Manages the main application structure and layout
 * - Displays the data persistence info dialog on first visit
 * - Implements beforeunload warning to prevent accidental data loss
 * - Provides access to UI services and tab state management
 *
 * Data Persistence Strategy:
 * This application stores all Petri net data in-memory only (via DataService).
 * No automatic saving occurs. Users must explicitly export their work to preserve it.
 *
 * Features:
 * - First-visit info dialog explaining data persistence
 * - Browser warning when leaving with unsaved work
 * - LocalStorage for "Don't show again" preference
 *
 * @see DataService - Manages in-memory Petri net data
 * @see UiService - Manages UI state and tab navigation
 * @see DataPersistenceInfoDialogComponent - Info dialog for first-time users
 */
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
    @ViewChild(CodeEditorComponent) protected codeEditor!: CodeEditorComponent;

    /**
     * LocalStorage key for tracking whether the data persistence info dialog has been shown.
     * When set to 'true', the dialog will not be displayed on subsequent visits.
     */
    private readonly DATA_PERSISTENCE_INFO_KEY = 'dataPersistenceInfoShown';

    /**
     * Constructor injects required services:
     * - uiService: For managing UI state and tab navigation
     * - dataService: For checking if Petri net data exists (to show beforeunload warning)
     * - dialog: For displaying the data persistence info dialog
     */
    constructor(
        protected uiService: UiService,
        private dataService: DataService,
        private dialog: MatDialog
    ) {}

    /**
     * Angular lifecycle hook called after component initialization.
     *
     * Checks if the data persistence info dialog should be displayed:
     * - Shows dialog if user hasn't seen it before (localStorage flag not set)
     * - Allows user to suppress future displays via "Don't show again" checkbox
     * - Saves preference to localStorage when dialog closes
     *
     * This ensures first-time users are informed about the application's
     * data persistence strategy without annoying returning users.
     */
    ngOnInit(): void {
        // Check if dialog has been shown before
        const dialogShown = localStorage.getItem(this.DATA_PERSISTENCE_INFO_KEY);

        if (!dialogShown) {
            // Show dialog after a short delay to ensure app is fully initialized
            setTimeout(() => {
                const dialogRef = this.dialog.open(DataPersistenceInfoDialogComponent, {
                    width: '550px',
                    maxWidth: '95vw', // Responsive on mobile
                    disableClose: false, // Allow closing with ESC or backdrop click
                    autoFocus: true, // Auto-focus first focusable element
                    restoreFocus: true // Restore focus after close
                });

                // Handle dialog close and save "Don't show again" preference
                dialogRef.afterClosed().subscribe((dontShowAgain: boolean) => {
                    if (dontShowAgain) {
                        localStorage.setItem(this.DATA_PERSISTENCE_INFO_KEY, 'true');
                        console.log('User opted to suppress data persistence info dialog');
                    }
                });
            }, 500); // 500ms delay for smooth UX
        }
    }

    /**
     * HostListener for the browser's beforeunload event.
     *
     * Prevents accidental data loss by showing a browser warning when:
     * - User tries to reload the page (F5, Ctrl+R)
     * - User closes the browser tab or window
     * - User navigates away from the application
     *
     * The warning is only shown if the DataService contains Petri net data.
     * Empty workspace allows navigation without warning.
     *
     * Browser Security Note:
     * Modern browsers ignore custom warning messages and show a generic
     * "Changes you made may not be saved" message. We return a truthy value
     * to trigger the browser's built-in warning dialog.
     *
     * @param event - BeforeUnloadEvent from the browser
     * @returns string or undefined - Returning a string triggers the warning
     *
     * @example
     * // When user presses F5 with a loaded Petri net:
     * // Browser shows: "Leave site? Changes you made may not be saved."
     */
    @HostListener('window:beforeunload', ['$event'])
    public handleBeforeUnload(event: BeforeUnloadEvent): string | undefined {
        // Only warn if there's actually data to lose
        if (!this.dataService.isEmpty()) {
            // Modern browsers show generic message, but we still need to return something
            event.preventDefault(); // Required for Chrome
            event.returnValue = ''; // Required for older browsers

            // Return value triggers the browser's warning dialog
            return 'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?';
        }

        // If workspace is empty, allow navigation without warning
        return undefined;
    }

    protected readonly TabState = TabState;
}

