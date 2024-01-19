import { Pipe, PipeTransform } from '@angular/core';
import { ValidationErrors } from '@angular/forms';

/**
 * Convert Object to array of keys.
 */
@Pipe({
    name: 'objectEntries',
})
export class objectEntriesPipe implements PipeTransform {
    transform(value: {} | ValidationErrors | null): [string, unknown][] {
        if (!value) {
            return [];
        }

        return Object.entries(value);
    }
}
