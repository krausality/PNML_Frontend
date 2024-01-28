import { ValidationErrors } from '@angular/forms';

export interface ErrorDialogData {
    parsingError: boolean | string;
    schemaValidationErrors: ValidationErrors;
}
