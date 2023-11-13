import { Injectable, Inject } from "@angular/core";
import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Arc } from "src/app/tr-classes/petri-net/arc";
import { Place } from "src/app/tr-classes/petri-net/place";
import { Transition } from "src/app/tr-classes/petri-net/transition";
import { DataService } from "src/app/tr-services/data.service";

export class LayerAssignmentService {
    // Initial set of nodes and arcs
    private _nodes: Set<Node> = new Set<Node>();
    private _arcs: Arc[] = [];

    // Map parent nodes for each node
    private _nodeInputMap = new Map();
    
    // U: Keep track of all nodes that have been assigned to any layer
    private _assignedNodes = new Set<Node>(); 
    
    // Z: Nodes assigned to layer below current layer
    private _layers: Record<number, Set<Node>> = {
        0: new Set<Node>(),
        1: new Set<Node>(),
    };

    constructor(
        nodes: Set<Node>,
        arcs: Arc[],
    ) {
        this._nodes = nodes;
        this._arcs = arcs;

        console.log('[Layer Assignment:] Nodes', nodes);
        console.log('[Layer Assignment:] Arcs', arcs);

        this._nodes.forEach((node) => {
            const parentNodes = new Set<Node>();

            this._arcs.forEach((arc) => {
                if (arc.to === node) parentNodes.add(arc.from);
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
        while (this._assignedNodes.size < this._nodes.size && counter < 20) {
            counter++;

            const parentLayer = this._layers[layerId - 1];

            console.log('[Layer Assignment:] ParentLayer', this._layers, this._layers[0], (parentLayer));

            const choices = this.getNodeChoicesForLayer(parentLayer);
            const picked = choices.pop();

            console.log('[Layer Assignment:] Choices: ', choices, 'Picked: ', picked);

            if (picked) {
                this._layers[layerId].add(picked);
                this._assignedNodes.add(picked);
            } else {
                layerId++;
                this._layers[layerId] = new Set<Node>();
            }

            console.log('[Layer Assignment:] Layers:', this._layers);

            if (layerId > this._nodes.size) {
                // if there are more layers than vertices
                // something has gone very wrong!
                console.log('Error during Layer Assignment.');
                break;
            }
        }

    }

    // gets all nodes that have incoming edges from the given layer
    getNodeChoicesForLayer(layer: Set<Node>)  {
        const incomingNodes: Node[] = [];

        for (const [node, parentNodes] of this._nodeInputMap.entries()) {
            if (this._assignedNodes.has(node)) {
                // this node has already been assigned, ignore
                continue;
            }

            if (layer.size === 0 && parentNodes.size === 0) {
                incomingNodes.push(node);
            } else {
                let intersection = new Set([...parentNodes].filter(parentNode => layer.has(parentNode)));
                if (intersection.size) {
                    incomingNodes.push(node);
                }
            }
        }

        return incomingNodes;
    }

    // Compares the members of sets A and B but ignores their order
    isEqualSet(a: Set<any>, b: Set<any>) {
        // a and b reference the same set -> they are the same set
        if (a === b) return true;

        // a and b have a different amount of items and cannot be the same
        if (a.size !== b.size) return false;

        // since both sets have an equal amount of items,
        // set b has to contain every single item that is in a
        return [...a].every(value => b.has(value));
    }
}