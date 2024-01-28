import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import Ajv from 'ajv/dist/2020';
import { validateJsonAgainstSchema } from 'src/app/tr-utils/json.utils';
import jsonSchema from 'src/app/tr-utils/petrinet.schema';

const ajv = new Ajv({
    allowMatchingProperties: true,
    verbose: true,
    allErrors: true,
});
const validate = ajv.compile(jsonSchema);

export function createJsonSchemaValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (!value) {
            return null;
        }

        let codeValidationErrors: ValidationErrors = {};

        try {
            codeValidationErrors = validateJsonAgainstSchema(value);
        } catch (e) {
            console.log(e);
            return null;
        }

        return Object.keys(codeValidationErrors).length
            ? codeValidationErrors
            : null;
    };
}
