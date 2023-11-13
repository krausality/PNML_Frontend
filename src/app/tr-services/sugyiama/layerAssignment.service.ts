import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Arc } from "src/app/tr-classes/petri-net/arc";

export class LayerAssignmentService {
    // Initial set of nodes and arcs
    private _nodes: Node[] = [];
    private _arcs: Arc[] = [];

    // Map parent nodes for each node
    private _nodeInputMap = new Map();
    
    // U: Keep track of all nodes that have been assigned to any layer
    private _assignedNodes: Node[] = []; 
    
    // Z: Nodes assigned to layer below current layer
    private _layers: Record<number, Node[]> = {};

    constructor(
        nodes: Node[],
        arcs: Arc[],
    ) {
        this._nodes = nodes;
        this._arcs = arcs;

        console.log('[Layer Assignment:] Nodes', nodes);
        console.log('[Layer Assignment:] Arcs', arcs);

        this._nodes.forEach((node) => {
            const parentNodes: Node[] = [];

            this._arcs.forEach((arc) => {
                if (arc.to === node) parentNodes.push(arc.from);
            });
            this._nodeInputMap.set(node, parentNodes);
        });

        console.log('[Layer Assignment:] NodeInputMap', (this._nodeInputMap));
     }

    /* Utility functions for layer assignment */
    assignLayers() {
        // Layer which is currently being processed
        let layerId = 1;

        console.log('[Layer Assignment:] Layer ID:', layerId, 'Assigned nodes: ', this._assignedNodes, 'all nodes: ', this._nodes);

        let counter = 0;

        // TODO: Check if there is a more elegant way to check if two sets are equal
        while (this._assignedNodes.length < this._nodes.length && counter < 20) {
            counter++;

            const parentLayer = this._layers[layerId - 1];

            const choices = this.getNodeChoicesForLayer(parentLayer);
            const picked = choices.pop();

            console.log('[Layer Assignment:] Choices: ', choices, 'Picked: ', picked);

            if (picked) {
                if (!this._layers[layerId]) this._layers[layerId] = [];
                this._layers[layerId].push(picked);
                this._assignedNodes.push(picked);
            } else {
                layerId++;
                this._layers[layerId] = [];
            }

            console.log('[Layer Assignment:] Layers:', this._layers);

            if (layerId > this._nodes.length) {
                // if there are more layers than vertices
                // something has gone very wrong!
                console.log('Error during Layer Assignment.');
                break;
            }
        }

    }

    // gets all nodes that have incoming edges from the given layer
    getNodeChoicesForLayer(layer: Node[] | undefined)  {
        const incomingNodes: Node[] = [];

        for (const [node, parentNodes] of this._nodeInputMap.entries()) {
            if (this._assignedNodes.includes(node)) {
                // this node has already been assigned, ignore
                continue;
            }

            if (!layer || layer.length === 0) {
                if (parentNodes.length === 0) incomingNodes.push(node);  
            } else {
                let intersection = new Set([...parentNodes].filter(parentNode => layer.includes(parentNode)));
                if (intersection.size) {
                    incomingNodes.push(node);
                }
            }
        }

        return incomingNodes;
    }
}