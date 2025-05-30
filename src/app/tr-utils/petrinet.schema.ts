export default {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://www.fernuni-hagen.de/ilovepetrinets/teamrot/petrinet.schema.json',
    title: 'Petrinet',
    type: 'object',
    properties: {
        places: {
            type: 'array',
            description: 'Holds an array of unique place ids',
            items: {
                type: 'string',
            },
            uniqueItems: true,
        },
        arcs: {
            type: 'object',
            description: 'Holds an array of sets of arcs with marking',
            patternProperties: {
                '^.*,.*$': { type: 'integer' },
            },
            uniqueItems: true,
            additionalProperties: false,
        },
        actions: {
            type: 'array',
            description: 'Holds an array of unique action labels ids',
            items: {
                type: 'string',
            },
            uniqueItems: true,
        },
        labels: {
            type: 'object',
            patternProperties: {
                '.*': { type: 'string' },
            },
            additionalProperties: false,
        },
        marking: {
            type: 'object',
            patternProperties: {
                '.*': { type: 'integer' },
            },
            additionalProperties: false,
        },
        layout: {
            type: 'object',
            patternProperties: {
                '.*,.*': {
                    type: 'array',
                    items: { $ref: '#/$defs/coordinates' },
                },
                '^[^,]*$': {
                    type: 'object',
                    properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                },
            },
            additionalProperties: false,
        },
    },
    $defs: {
        coordinates: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
            },
            required: ['x', 'y'],
        },
    },
};
