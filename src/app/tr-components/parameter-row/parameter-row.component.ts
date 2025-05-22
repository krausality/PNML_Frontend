import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, ControlContainer, FormGroupDirective, FormControl } from '@angular/forms';
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
  styleUrls: ['./parameter-row.component.css'],
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective }
  ]
})
export class ParameterRowComponent implements OnInit {
  @Input() parameter!: ParameterDefinition;
  @Input() controlName!: string;

  // Inject FormGroupDirective
  constructor(private parentFG: FormGroupDirective) {}

  ngOnInit(): void {
    // ngOnInit logic can remain empty or be used for other initializations if needed
  }

  // Updated getter for the current FormControl instance
  public get currentFormControl(): FormControl | null {
    if (this.parentFG && this.parentFG.control && this.controlName) {
      return this.parentFG.control.get(this.controlName) as FormControl;
    }
    return null;
  }

  get parameterName(): string {
    if (this.parameter && this.parameter.path) {
      const parts = this.parameter.path.split('.');
      return parts[parts.length - 1];
    }
    return 'N/A';
  }

  getSafeName(): string { // Retain for potential future use if name attribute becomes necessary
    if (this.parameter && this.parameter.path) {
      return this.parameter.path.replace(/[.\\[\]]/g, '_');
    }
    return 'param_default_name';
  }

  isBoolean(): boolean {
    return this.parameter && this.parameter.type.toLowerCase() === 'boolean';
  }

  isNumber(): boolean {
    if (!this.parameter || !this.parameter.type) return false;
    const typeLowerCase = this.parameter.type.toLowerCase();
    return typeLowerCase === 'number' || 
           typeLowerCase === 'integer' || 
           typeLowerCase.includes('float');
  }

  isStringOrOther(): boolean {
    return !this.isBoolean() && !this.isNumber();
  }
}