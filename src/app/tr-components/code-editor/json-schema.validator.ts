import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import Ajv from 'ajv/dist/2020';
import jsonSchema from 'src/app/tr-components/code-editor/petrinet.schema';

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

        const codeValidationErrors: ValidationErrors = {};

        try {
            const json = JSON.parse(value);
            const valid = validate(json);

            if (!valid) {
                validate.errors?.forEach((validationError) => {
                    let path = validationError.instancePath;
                    path = path.replace(/\//g, '.');

                    codeValidationErrors[path] = validationError.message;
                });
            }
        } catch (e) {
            codeValidationErrors['JSON parsing error'] = e;
        }

        // everything is valid
        return Object.keys(codeValidationErrors).length
            ? codeValidationErrors
            : null;
    };
}
