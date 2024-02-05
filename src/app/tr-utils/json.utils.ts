import { ValidationErrors } from '@angular/forms';
import Ajv from 'ajv/dist/2020';
import jsonSchema from 'src/app/tr-utils/petrinet.schema';

const ajv = new Ajv({
    allowMatchingProperties: true,
    verbose: true,
    allErrors: true,
});
const validate = ajv.compile(jsonSchema);

export function validateJsonAgainstSchema(value: string): ValidationErrors {
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
        return {};
    }
    return codeValidationErrors;
}
