import json
import requests
import csv
from urllib.parse import urlparse
from collections import OrderedDict

# --- Configuration ---
TARGET_PATH = '/model-x/planning'
TARGET_METHOD = 'post'
# --- End Configuration ---

def is_url(path):
    try:
        result = urlparse(path)
        return all([result.scheme, result.netloc])
    except ValueError: return False

def load_spec(source):
    spec = None
    print(f"Attempting to load spec from: {source}")
    if is_url(source):
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(source, timeout=15, headers=headers)
            response.raise_for_status()
            spec = response.json()
            print("Successfully loaded spec from URL.")
        except requests.exceptions.RequestException as e:
            print(f"Error fetching spec from URL: {e}")
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from URL response: {e}")
    else:
        try:
            with open(source, 'r', encoding='utf-8') as f: spec = json.load(f)
            print("Successfully loaded spec from local file.")
        except FileNotFoundError: print(f"Error: Local file not found at {source}")
        except json.JSONDecodeError as e: print(f"Error decoding JSON from file: {e}")
        except Exception as e: print(f"An unexpected error occurred loading the file: {e}")
    return spec

def resolve_ref(spec, ref):
    if not ref or not ref.startswith('#/'): return None
    parts = ref[2:].split('/')
    current = spec
    try:
        for part in parts:
            part = part.replace('~1', '/').replace('~0', '~')
            if isinstance(current, list): part = int(part)
            current = current[part]
        return json.loads(json.dumps(current)) # Return a copy
    except (KeyError, IndexError, TypeError, ValueError) as e:
        print(f"DEBUG: Error resolving reference '{ref}': {e}")
        return None

def map_swagger_type(schema_type, schema_format=None, enum_values=None, items_schema=None, ref_name=None):
    if schema_type == 'object': return f"Object ({ref_name})" if ref_name else 'Object'
    elif schema_type == 'array':
        item_type_str = 'Unknown'
        if items_schema:
            items_ref = items_schema.get('$ref')
            items_ref_name = items_ref.split('/')[-1] if items_ref else None
            item_type_str = map_swagger_type(
                items_schema.get('type'), items_schema.get('format'),
                items_schema.get('enum'), items_schema.get('items'), items_ref_name
            )
        # Simplify array representation
        object_name_match = None
        if isinstance(item_type_str, str):
             import re
             match = re.match(r"Object\s*\(([^)]+)\)", item_type_str)
             if match:
                  object_name_match = match.group(1)

        if object_name_match: return f"List[{object_name_match}]"
        else: return f"List[{item_type_str}]"

    elif schema_type == 'integer': return 'Integer'
    elif schema_type == 'number': return 'Float (Number)'
    elif schema_type == 'boolean': return 'Boolean'
    elif schema_type == 'string':
        if enum_values: return "String (Enum)"
        if schema_format == 'date-time': return 'String (ISO 8601)'
        return 'String'
    else: return f"Unknown ({schema_type})"


def extract_parameters_recursive(spec, schema, path_prefix, output_dict, visited_refs=None):
    """Recursively extracts parameters, handling specific structures."""
    if visited_refs is None: visited_refs = set()

    if not isinstance(schema, dict):
        # print(f"DEBUG: Schema at {path_prefix} is not a dict: {schema}")
        return

    # --- Handle $ref at the current level ---
    ref = schema.get('$ref')
    if ref:
        if ref in visited_refs: return
        visited_refs.add(ref)
        resolved_schema = resolve_ref(spec, ref)
        if resolved_schema:
            extract_parameters_recursive(spec, resolved_schema, path_prefix, output_dict, visited_refs)
        visited_refs.remove(ref)
        return # Stop processing the ref dict itself

    # --- Handle type: object ---
    if schema.get('type') == 'object':
        # Add entry for the object path itself if it's not the root
        if path_prefix:
             ref_name = schema.get('$ref', '').split('/')[-1] # Use original ref if present
             obj_type = map_swagger_type('object', ref_name=ref_name if ref_name else None)
             if path_prefix not in output_dict: output_dict[path_prefix] = {}
             output_dict[path_prefix]['path'] = path_prefix
             output_dict[path_prefix]['type'] = obj_type
             # Required status is set by parent

        properties = schema.get('properties', {})
        object_required_set = set(schema.get('required', []))

        for prop_name, prop_schema in properties.items():
            new_path = f"{path_prefix}.{prop_name}" if path_prefix else prop_name
            is_prop_required = prop_name in object_required_set

            # --- Check for the specific "allOf > $ref" pattern for properties ---
            prop_all_of = prop_schema.get('allOf')
            prop_ref_within_allof = None
            if isinstance(prop_all_of, list) and len(prop_all_of) > 0:
                # Assume the primary definition is the first $ref inside allOf
                first_item = prop_all_of[0]
                if isinstance(first_item, dict) and '$ref' in first_item:
                    prop_ref_within_allof = first_item['$ref']

            schema_to_recurse = prop_schema # Default schema for recursion
            prop_type = "Unknown" # Default type

            if prop_ref_within_allof:
                 # Resolve the ref inside allOf to get the actual type and schema for recursion
                 resolved_prop_schema = resolve_ref(spec, prop_ref_within_allof)
                 if resolved_prop_schema:
                     prop_ref_name = prop_ref_within_allof.split('/')[-1]
                     prop_type = map_swagger_type(
                         resolved_prop_schema.get('type'), resolved_prop_schema.get('format'),
                         resolved_prop_schema.get('enum'), resolved_prop_schema.get('items'),
                         prop_ref_name
                     )
                     schema_to_recurse = resolved_prop_schema # Recurse into the resolved schema
                 else:
                      prop_type = "Unknown (Unresolved Ref in allOf)"
                      schema_to_recurse = {} # Can't recurse further

            else:
                # Handle properties defined directly or via a direct $ref (not inside allOf)
                prop_ref = prop_schema.get('$ref')
                prop_ref_name = prop_ref.split('/')[-1] if prop_ref else None
                schema_for_type = prop_schema
                if prop_ref:
                     resolved_direct_ref = resolve_ref(spec, prop_ref)
                     if resolved_direct_ref:
                          schema_for_type = resolved_direct_ref
                          schema_to_recurse = resolved_direct_ref # Recurse into resolved
                     else:
                          prop_type = "Unknown (Unresolved Ref)"
                          schema_to_recurse = {}

                if prop_type == "Unknown": # If not set by unresolved ref
                     prop_type = map_swagger_type(
                          schema_for_type.get('type'), schema_for_type.get('format'),
                          schema_for_type.get('enum'), schema_for_type.get('items'),
                          prop_ref_name
                     )

            # --- Add/Update the entry for the property path ---
            if new_path not in output_dict: output_dict[new_path] = {}
            output_dict[new_path]['path'] = new_path
            output_dict[new_path]['type'] = prop_type
            output_dict[new_path]['required'] = is_prop_required

            # --- Recurse into the determined schema ---
            # Crucially, use the resolved schema if we found one, otherwise the original prop_schema
            extract_parameters_recursive(spec, schema_to_recurse, new_path, output_dict, visited_refs)

        return # Finished processing this object

    # --- Handle type: array ---
    if schema.get('type') == 'array':
         # Add entry for the array path itself if not root
         if path_prefix:
              arr_type = map_swagger_type('array', items_schema=schema.get('items'))
              if path_prefix not in output_dict: output_dict[path_prefix] = {}
              output_dict[path_prefix]['path'] = path_prefix
              output_dict[path_prefix]['type'] = arr_type
              # Required status set by parent

         items_schema = schema.get('items')
         if items_schema:
             item_path_prefix = f"{path_prefix}[...]"
             extract_parameters_recursive(spec, items_schema, item_path_prefix, output_dict, visited_refs)
         return # Finished processing array

    # --- Handle cases where the schema is just 'allOf' (less common but possible) ---
    all_of = schema.get('allOf')
    if all_of:
         # Merge and re-process as an object (simplified merge)
         effective_schema = {'type': 'object', 'properties': {}, 'required': []}
         temp_visited = set(visited_refs)
         primary_ref_name = None
         for sub_schema in all_of:
              sub_ref = sub_schema.get('$ref')
              if sub_ref:
                   if sub_ref in temp_visited: continue
                   temp_visited.add(sub_ref)
                   resolved_sub = resolve_ref(spec, sub_ref)
                   if resolved_sub:
                        if not primary_ref_name: primary_ref_name = sub_ref.split('/')[-1]
                        effective_schema['properties'].update(resolved_sub.get('properties', {}))
                        effective_schema['required'].extend(resolved_sub.get('required', []))
              else:
                   effective_schema['properties'].update(sub_schema.get('properties', {}))
                   effective_schema['required'].extend(sub_schema.get('required', []))
         effective_schema['required'] = list(OrderedDict.fromkeys(effective_schema['required']))
         if primary_ref_name: # Add ref info if we found one
            effective_schema['$ref'] = '#/definitions/' + primary_ref_name # Reconstruct approx ref

         # Now call recursively with the merged object schema
         extract_parameters_recursive(spec, effective_schema, path_prefix, output_dict, visited_refs)
         return

    # If it's none of the above (e.g., a simple type at the root), it won't be processed further here.
    # Simple types are added when they are properties of an object.

# --- Main Execution ---
if __name__ == "__main__":
    # spec_source = input("Enter the URL or local file path for the Swagger/OpenAPI spec: ")
    spec_source = "http://127.0.0.1:9040/l3s-offshore-2/swagger.json" # For testing
    spec = load_spec(spec_source)

    if not spec:
        print("Exiting due to spec loading failure.")
        exit()

    parameters_dict = OrderedDict()

    try:
        operation = spec['paths'][TARGET_PATH][TARGET_METHOD]
        # Find the body parameter schema
        body_param_info = next((p for p in operation.get('parameters', []) if p.get('in') == 'body'), None)
        if not body_param_info or 'schema' not in body_param_info:
            raise KeyError("Body parameter schema not found")
        body_param_schema = body_param_info['schema']

        # --- Get Top Level Required Fields ---
        # Resolve the main body schema to find its 'required' list
        top_level_schema = body_param_schema
        top_level_ref = top_level_schema.get('$ref')
        if top_level_ref:
             resolved_top = resolve_ref(spec, top_level_ref)
             if resolved_top: top_level_schema = resolved_top
        TOP_LEVEL_REQUIRED = set(top_level_schema.get('required', []))


    except KeyError as e:
        print(f"Error: Could not find operation/schema structure for {TARGET_METHOD.upper()} {TARGET_PATH}: {e}")
        exit()

    print(f"\nExtracting parameters for request body of {TARGET_METHOD.upper()} {TARGET_PATH}...")
    # Start recursion with the original body schema (might just be a ref)
    extract_parameters_recursive(spec, body_param_schema, "", parameters_dict)

    # --- Final Cleanup and Output ---
    if "" in parameters_dict: del parameters_dict[""]

    # Set required status for top-level properties explicitly
    for key in parameters_dict:
         if '.' not in key and key in TOP_LEVEL_REQUIRED:
              parameters_dict[key]['required'] = True
         # Ensure all have a boolean required status
         if 'required' not in parameters_dict[key] or parameters_dict[key]['required'] is None:
             parameters_dict[key]['required'] = False


    md_file = "parameters_full.md"
    csv_file = "parameters_full.csv"

    with open(md_file, 'w', encoding='utf-8') as f_md, \
         open(csv_file, 'w', encoding='utf-8', newline='') as f_csv:

        writer = csv.writer(f_csv)
        f_md.write("| Parameter Path | Expected Type / Structure | Required? |\n")
        f_md.write("| :------------- | :------------------------ | :-------- |\n")
        writer.writerow(["Parameter Path", "Expected Type / Structure", "Required?"])

        if not parameters_dict:
             print("Warning: No parameters were extracted. Output files will be empty.")
        else:
            # Sort paths for consistent output order
            sorted_paths = sorted(parameters_dict.keys())

            for path in sorted_paths:
                param = parameters_dict.get(path, {}) # Use .get for safety
                path_str = param.get('path', path)
                type_str = param.get('type', 'Unknown')
                req_val = param.get('required', False)
                req_str = "Yes" if req_val else "No"

                f_md.write(f"| `{path_str}` | {type_str} | {req_str} |\n")
                writer.writerow([path_str, type_str, req_str])

    print(f"\nExtraction complete. Results saved to:\n- Markdown: {md_file}\n- CSV: {csv_file}")