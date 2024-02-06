import { ValidationErrors } from '@angular/forms';

export interface ErrorDialogData {
    error: string;
    parsingError: boolean | string;
    schemaValidationErrors: ValidationErrors;
}
