import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface ParameterRow {
  path: string;
  type: string;
  required: string;
  value: any;
}

@Component({
  selector: 'app-parameter-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    JsonPipe
  ],
  templateUrl: './parameter-table.component.html',
  styleUrls: ['./parameter-table.component.css']
})
export class ParameterTableComponent implements OnInit, OnChanges {
  @Input() loadedParameters: any = {};
  displayedColumns: string[] = ['path', 'type', 'required', 'value'];
  dataSource = new MatTableDataSource<ParameterRow>();

  // Define the initial structure based on parameters_full.md or a similar source
  // This provides the path, type, and required status. Values will be populated.
  private parameterDefinitions: ParameterRow[] = [
    // scenario_definition
    { path: 'scenario_definition.operations', type: 'List[Object]', required: 'Yes', value: null },
    { path: 'scenario_definition.operations[...].base_duration_hours', type: 'Float', required: 'Yes', value: null },
    { path: 'scenario_definition.operations[...].description', type: 'String', required: 'No', value: null },
    { path: 'scenario_definition.operations[...].operation_id', type: 'String', required: 'Yes', value: null },
    { path: 'scenario_definition.operations[...].required_skills', type: 'List[String]', required: 'No', value: null },
    { path: 'scenario_definition.operations[...].weather_limits.max_wave_height_m', type: 'Float', required: 'Yes', value: null },
    { path: 'scenario_definition.operations[...].weather_limits.max_wind_speed_m_s', type: 'Float', required: 'Yes', value: null },
    { path: 'scenario_definition.owf_target_size', type: 'Integer', required: 'Yes', value: null },
    { path: 'scenario_definition.port_config.initial_owt_components', type: 'Integer', required: 'Yes', value: null },
    { path: 'scenario_definition.port_config.max_owt_components', type: 'Integer', required: 'Yes', value: null },
    { path: 'scenario_definition.port_config.min_owt_components_threshold', type: 'Integer', required: 'No', value: null },
    { path: 'scenario_definition.scenario_id', type: 'String', required: 'No', value: null },
    { path: 'scenario_definition.vessel_config.capacity_owt', type: 'Integer', required: 'Yes', value: null },
    { path: 'scenario_definition.vessel_config.num_installation_vessels', type: 'Integer', required: 'Yes', value: null },
    // simulation_config
    { path: 'simulation_config.dtmc_config.historical_data_end', type: 'String', required: 'No', value: null },
    { path: 'simulation_config.dtmc_config.historical_data_start', type: 'String', required: 'No', value: null },
    { path: 'simulation_config.dtmc_config.use_dtmc_for_weather_impact', type: 'Boolean', required: 'No', value: null },
    { path: 'simulation_config.log_wind_profile.apply_log_profile', type: 'Boolean', required: 'No', value: null },
    { path: 'simulation_config.log_wind_profile.measurement_height_m', type: 'Float', required: 'No', value: null },
    { path: 'simulation_config.log_wind_profile.surface_roughness_z0', type: 'Float', required: 'No', value: null },
    { path: 'simulation_config.log_wind_profile.target_height_m', type: 'Float', required: 'No', value: null },
    { path: 'simulation_config.log_wind_profile.zero_plane_displacement_d', type: 'Float', required: 'No', value: null },
    { path: 'simulation_config.logging_level', type: 'String (Enum)', required: 'No', value: null },
    { path: 'simulation_config.output_options', type: 'List[String]', required: 'No', value: null },
    { path: 'simulation_config.pruning_config.mode', type: 'Integer', required: 'No', value: null },
    { path: 'simulation_config.pruning_config.tolerance', type: 'Float', required: 'No', value: null },
    { path: 'simulation_config.random_seed', type: 'Integer', required: 'No', value: null },
    { path: 'simulation_config.scheduling_strategy_params.fair_mode', type: 'Integer', required: 'No', value: null },
    { path: 'simulation_config.scheduling_strategy_params.max_port_waiting_time_hours', type: 'Integer', required: 'Yes', value: null },
    { path: 'simulation_config.scheduling_strategy_params.planning_batch_size_owt', type: 'Integer', required: 'Yes', value: null },
    { path: 'simulation_config.scheduling_strategy_params.strategy_name', type: 'String (Enum)', required: 'No', value: null },
    { path: 'simulation_config.search_config.algorithm', type: 'String (Enum)', required: 'No', value: null },
    { path: 'simulation_config.search_config.depth_limit', type: 'Integer', required: 'No', value: null },
    { path: 'simulation_config.simulation_end_datetime', type: 'String', required: 'Yes', value: null },
    { path: 'simulation_config.simulation_start_datetime', type: 'String', required: 'Yes', value: null },
    { path: 'simulation_config.time_step_hours', type: 'Integer', required: 'No', value: null },
    { path: 'simulation_config.wave_data.source_location', type: 'String', required: 'Yes', value: null },
    { path: 'simulation_config.wave_data.source_type', type: 'String (Enum)', required: 'Yes', value: null },
    { path: 'simulation_config.wind_data.source_location', type: 'String', required: 'Yes', value: null },
    { path: 'simulation_config.wind_data.source_type', type: 'String (Enum)', required: 'Yes', value: null },
    // workforce_management
    { path: 'workforce_management.enable_wfm', type: 'Boolean', required: 'Yes', value: null },
    { path: 'workforce_management.personnel', type: 'List[Object]', required: 'No', value: null },
    { path: 'workforce_management.personnel[...].cost_per_hour', type: 'Float', required: 'Yes', value: null },
    { path: 'workforce_management.personnel[...].initial_location.id', type: 'Integer', required: 'No', value: null },
    { path: 'workforce_management.personnel[...].initial_location.type', type: 'String (Enum)', required: 'Yes', value: null },
    { path: 'workforce_management.personnel[...].person_id', type: 'String', required: 'Yes', value: null },
    { path: 'workforce_management.personnel[...].person_type', type: 'String', required: 'No', value: null },
    { path: 'workforce_management.personnel[...].skills', type: 'List[String]', required: 'Yes', value: null },
    { path: 'workforce_management.personnel[...].work_ruleset_id', type: 'String', required: 'Yes', value: null },
    { path: 'workforce_management.skills', type: 'List[Object]', required: 'No', value: null },
    { path: 'workforce_management.skills[...].description', type: 'String', required: 'No', value: null },
    { path: 'workforce_management.skills[...].skill_id', type: 'String', required: 'Yes', value: null },
    { path: 'workforce_management.wfm_optimization_params.change_suppression_epsilon', type: 'Float', required: 'No', value: null },
    { path: 'workforce_management.work_rulesets', type: 'List[Object]', required: 'No', value: null },
    { path: 'workforce_management.work_rulesets[...].max_hours_per_day', type: 'Float', required: 'Yes', value: null },
    { path: 'workforce_management.work_rulesets[...].max_hours_per_week', type: 'Float', required: 'Yes', value: null },
    { path: 'workforce_management.work_rulesets[...].min_break_duration_hours', type: 'Float', required: 'Yes', value: null },
    { path: 'workforce_management.work_rulesets[...].min_break_interval_hours', type: 'Float', required: 'Yes', value: null },
    { path: 'workforce_management.work_rulesets[...].min_rest_period_hours', type: 'Float', required: 'Yes', value: null },
    { path: 'workforce_management.work_rulesets[...].ruleset_id', type: 'String', required: 'Yes', value: null },
  ];


  constructor() {}

  ngOnInit(): void {
    this.updateDataSource();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loadedParameters']) {
      this.updateDataSource();
    }
  }

  private updateDataSource(): void {
    const currentData = [...this.parameterDefinitions]; // Start with the base structure

    if (this.loadedParameters) {
      // Iterate over the definitions and try to find the corresponding value in loadedParameters
      // This is a simplified approach; a more robust solution would involve recursive traversal
      // of both parameterDefinitions and loadedParameters if paths are deeply nested and not flat.
      currentData.forEach(def => {
        // Attempt to get value from loadedParameters using a simple path split
        // This won't handle arrays or complex objects perfectly without more logic
        const pathParts = def.path.split('.');
        let value = this.loadedParameters;
        for (const part of pathParts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else if (part.endsWith('[...]')) { // Basic handling for array placeholders
             // If path is like 'list[...].property', try to get 'list'
            const listKey = part.substring(0, part.indexOf('[...]'));
            if (value && Array.isArray(value[listKey]) && value[listKey].length > 0) {
                // For simplicity, we might just indicate that the list has items
                // or try to access the property of the first item if the next path part exists
                // This part needs more sophisticated handling for real data.
                // For now, if the next part is just the property, we might show "Array of Objects" or similar.
                // If the path is 'list[...].property', and the next part is 'property'
                if (pathParts.indexOf(part) < pathParts.length -1) {
                    // Placeholder for complex array/object display logic
                    value = `[Array - ${value[listKey].length} items]`; // Example
                } else {
                     value = value[listKey];
                }
                break; 
            } else {
                value = undefined; // Path not found
                break;
            }
          } else {
            value = undefined; // Path not found
            break;
          }
        }
        def.value = value !== undefined ? value : 'N/A (or default)';
      });
    }
    this.dataSource.data = currentData;
  }

  isPrimitive(value: any): boolean {
    return typeof value !== 'object' || value === null;
  }

  isObject(value: any): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  // Helper to get a string representation for display
  getDisplayValue(value: any): string {
    if (this.isPrimitive(value)) {
      return String(value);
    }
    if (this.isArray(value)) {
      return `[Array (${value.length} items)]`;
    }
    if (this.isObject(value)) {
      return '{Object}'; // Or use JsonPipe for a fuller view if desired, but can be large
    }
    return String(value); // Fallback
  }
}
