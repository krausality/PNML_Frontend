import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

/**
 * Dialog component that informs users about the data persistence strategy of the application.
 *
 * This component is displayed on the user's first visit to explain that:
 * - All Petri net data is stored in-memory only (no automatic saving)
 * - Data will be lost on browser reload or tab closure
 * - Users should export their work before leaving
 *
 * Features:
 * - Material Design themed info dialog
 * - "Don't show again" checkbox that persists preference in localStorage
 * - Responsive design for mobile devices
 * - Accessibility-friendly with proper ARIA labels
 *
 * Usage:
 * This dialog is automatically shown by AppComponent on first visit.
 * Users can suppress future displays by checking the "Don't show again" option.
 *
 * @see AppComponent - Triggers this dialog on app initialization
 * @see DataService - Manages in-memory Petri net data
 *
 * @example
 * // Open dialog programmatically
 * const dialogRef = this.dialog.open(DataPersistenceInfoDialogComponent, {
 *   width: '500px',
 *   disableClose: false
 * });
 *
 * dialogRef.afterClosed().subscribe(dontShowAgain => {
 *   if (dontShowAgain) {
 *     localStorage.setItem('dataPersistenceInfoShown', 'true');
 *   }
 * });
 */
@Component({
    selector: 'app-data-persistence-info-dialog',
    templateUrl: './data-persistence-info-dialog.component.html',
    styleUrls: ['./data-persistence-info-dialog.component.css']
})
export class DataPersistenceInfoDialogComponent {
    /**
     * Tracks whether the user wants to suppress this dialog in future sessions.
     * Bound to the "Don't show again" checkbox in the template.
     */
    public dontShowAgain: boolean = false;

    /**
     * Constructor injects MatDialogRef for dialog control.
     *
     * @param dialogRef - Reference to the opened dialog, used to close it and pass back data
     */
    constructor(
        public dialogRef: MatDialogRef<DataPersistenceInfoDialogComponent>
    ) {}

    /**
     * Closes the dialog and returns the user's "Don't show again" preference.
     *
     * The AppComponent or calling component should handle this return value by:
     * 1. Storing it in localStorage if true
     * 2. Skipping future dialog displays when the flag is set
     *
     * @example
     * // In AppComponent after dialog closes:
     * dialogRef.afterClosed().subscribe(dontShowAgain => {
     *   if (dontShowAgain) {
     *     localStorage.setItem('dataPersistenceInfoShown', 'true');
     *   }
     * });
     */
    public onClose(): void {
        this.dialogRef.close(this.dontShowAgain);
    }
}
