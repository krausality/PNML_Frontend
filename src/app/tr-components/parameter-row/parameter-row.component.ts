import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ParameterDefinition } from '../../tr-interfaces/parameter-definition.interface';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-parameter-row',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './parameter-row.component.html',
  styleUrls: ['./parameter-row.component.css']
})
export class ParameterRowComponent {
  @Input() parameter!: ParameterDefinition;
  @Input() formControl!: FormControl;

  // Helper to get the last part of the path for display
  get parameterName(): string {
    if (this.parameter && this.parameter.path) {
      const parts = this.parameter.path.split('.');
      return parts[parts.length - 1];
    }
    return '';
  }

  // Helper to determine if the input should be a checkbox
  isBoolean(): boolean {
    return this.parameter && this.parameter.type === 'boolean';
  }

  // Helper to determine if the input should be a number
  isNumber(): boolean {
    return this.parameter && this.parameter.type === 'number'; // Corrected to check for 'number'
  }

  // Helper to determine if the input should be a string or other
  isStringOrOther(): boolean {
    return !this.isBoolean() && !this.isNumber();
  }
}
