import { ValidationErrors } from '@angular/forms';

export interface ErrorDialogData {
    parsingError: boolean;
    schemaValidationErrors: ValidationErrors;
}
