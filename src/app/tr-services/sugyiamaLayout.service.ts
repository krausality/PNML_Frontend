import { Injectable } from "@angular/core";
import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Arc } from "../tr-classes/petri-net/arc";
import { Place } from "../tr-classes/petri-net/place";
import { Transition } from "../tr-classes/petri-net/transition";
import { Point } from "../tr-classes/petri-net/point";
import { Observable, of } from "rxjs";
import { DataService } from "src/app/tr-services/data.service";
import { transition } from "@angular/animations";

import { LayerAssignmentService } from "../tr-services/sugyiama/layerAssignment.service";

@Injectable({
    providedIn: 'root'
})

export class LayoutService {
    private _arcsToBeReversed: Arc[] = [];

    private _nodes: Set<Node> = new Set<Node>();
    private _arcs: Arc[] = [];

    /* utility vars for cycle removal */
    private _stack: Set<Node> = new Set<Node>();
    private _visited: Set<Node> = new Set<Node>();

    constructor(protected dataService: DataService) {
        this.dataService = dataService;
    }

    applySugyiamaLayout() {
        // copy initial state of datamodel to local datamodel
        this._arcs = [...this.dataService.getArcs()];
        this._nodes = new Set([...this.dataService.getPlaces(), ...this.dataService.getTransitions()]);
        console.log('[Sugyiama Layout:] Initial set of arcs and nodes', this._nodes, this._arcs);

        // TODO: There are some requirements for the layout to work correctly.
        // - There cannot be orphaned nodes

        // Sugyiama Step 1: remove cycles
        this.removeCycles();

        console.log('[Sugyiama Layout:] Arcs to be reversed: ', this._arcsToBeReversed);

        console.log('[Sugyiama Layout:] Nodes & Arcs after removal of cycles', this._nodes, this._arcs);

        // Sugyiama Step 2: assign layers
        const layerAssignmentService = new LayerAssignmentService(this._nodes, this._arcs)
        layerAssignmentService.assignLayers();

        // Sugyiama Step 3: vertex ordering
        // Sugyiama Step 4: coordinate assignment
    }

    /* Utility functions for cycle removal */
    removeCycles() {
        // Get and remove arcs that lead to circle
        for (let node of this._nodes) {
            this.depthFirstSearchRemove(node);
        }
        // Reverse arcs that need reversing
        this.reverseArcs();
        // Add reversed arcs
        this._arcs = this._arcs.concat(this._arcsToBeReversed);
    }
 
    depthFirstSearchRemove(node: Node) {
        if (this._visited.has(node)) {
            return;
        }
        this._visited.add(node);
        this._stack.add(node);

        for (let arc of this.getPostArcsForNode(node)) {
            if (this._stack.has(arc.to)) {
                this._arcsToBeReversed.push(arc);
                // TODO: Check if it's possibly that a petrinet contains two arcs
                // leading from and to the same node ?
                this._arcs = this._arcs.filter(
                    (a) => !(a.from.id === arc.from.id && a.to.id === arc.to.id)
                );
            } else if (!this._visited.has(arc.to)) {
                this.depthFirstSearchRemove(arc.to);
            }
        }

        this._stack.delete(node);
    }

    getPostArcsForNode(node: Node) {
        if (node instanceof Transition) {
            return node.getPostArcs();
        } else {
            return this._arcs.filter((arc) => arc.from === node);
        }
    }

    reverseArcs() {
        for (let arc of this._arcsToBeReversed) {
            const newTo = arc.from;
            const newFrom = arc.to;

            arc.to = newTo;
            arc.from = newFrom;
        }
    }

    getNodeMap() {

    }
}