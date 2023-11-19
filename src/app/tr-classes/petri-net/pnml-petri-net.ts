export interface PnmlPetriNet {
    elements: Array<PnmlElement>;
}


export interface PnmlElement {
    type: string;
    name: string;
    text: string;
    attributes:attribute
    elements: Array<PnmlElement>;
}

interface attribute {
    id: string;
    name: string;
    source: string;
    target: string;
    x: number;
    y: number
}
