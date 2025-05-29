/**
 * @file pnml-petri-net.ts
 * @description This file defines interfaces for representing a Petri net in PNML (Petri Net Markup Language) format.
 * These interfaces are used when parsing PNML files or serializing Petri net data to PNML.
 * - `PnmlPetriNet`: Represents the root structure of a PNML Petri net, containing an array of elements.
 * - `PnmlElement`: Represents a generic element within a PNML structure, which can be a place, transition, arc, or other PNML-specific tags.
 *   It includes properties like type, name, text content, attributes, and nested elements.
 * - `attribute`: Defines the structure for attributes of a PNML element, such as id, name, source/target for arcs, and coordinates (x, y).
 */

export interface PnmlPetriNet {
    elements: Array<PnmlElement>;
}

export interface PnmlElement {
    type: string;
    name: string;
    text: string;
    attributes: attribute;
    elements: Array<PnmlElement>;
}

interface attribute {
    id: string;
    name: string;
    source: string;
    target: string;
    x: number;
    y: number;
}
