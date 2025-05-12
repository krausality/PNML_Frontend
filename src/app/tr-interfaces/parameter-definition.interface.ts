export interface ParameterDefinition {
    path: string;
    type: string;
    required: string; // 'Yes' or 'No'
    value?: any;
    description?: string;
}
