import { Pipe, PipeTransform } from '@angular/core';
/*
 * Returns the absolute value of a number
 * Usage:
 *   value | mathAbs
 * Example:
 *   {{ -2 | mathAbs }}
 *   formats to: 2
*/
@Pipe({
  name: 'mathAbs'
})
export class mathAbsPipe implements PipeTransform {
  transform(value: number): number {
    return Math.abs(value);
  }
}
