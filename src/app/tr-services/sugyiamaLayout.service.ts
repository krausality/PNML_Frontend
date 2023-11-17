import { Injectable } from "@angular/core";
import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Arc } from "../tr-classes/petri-net/arc";
import { DataService } from "src/app/tr-services/data.service";

import { CycleRemovalService } from "./sugyiama/cycleRemoval.service";
import { LayerAssignmentService } from "./sugyiama/layerAssignment.service";
import { VertexOrderingService } from "./sugyiama/vertexOrdering.service";
import { CoordinateAssignmentService } from "./sugyiama/coordinateAssignment.service";

@Injectable({
    providedIn: 'root'
})

export class LayoutService {
    private _nodes: Node[] = [];
    private _arcs: Arc[] = [];

    // Map parent nodes for each node
    private _nodeInputMap = new Map();
    private _nodeOutputMap = new Map();

    constructor(protected dataService: DataService) {
        this.dataService = dataService;
    }

    applySugyiamaLayout() {
        // copy initial state of datamodel to local datamodel
        this._arcs = [...this.dataService.getArcs()];
        this._nodes = [...this.dataService.getPlaces(), ...this.dataService.getTransitions()];

        // console.log('[Sugyiama Layout:] Initial set of arcs and nodes', this._nodes, this._arcs);

        // TODO: There are some requirements for the layout to work correctly.
        // -> There cannot be orphaned nodes

        // Sugyiama Step 1: remove cycles
        const cycleRemovalService = new CycleRemovalService(this._nodes, this._arcs)
        cycleRemovalService.removeCycles();

        this.generateAdjacentNodeMaps();

        // Sugyiama Step 2: assign layers
        const layerAssignmentService = new LayerAssignmentService(this._nodes, this._nodeInputMap);
        const layers = layerAssignmentService.assignLayers();
        
        // Arcs that have been reversed for layer assignment can now to be re-reversed
        cycleRemovalService.reverseArcs();

        // Sugyiama Step 3: vertex ordering/crossing minimization
        // - Add dummy nodes for "long" arcs
        // - Re-order vertices to reduce crossings between arcs
        const vertexOrderingService = new VertexOrderingService(layers, this._arcs, this._nodeInputMap, this._nodeOutputMap);
        vertexOrderingService.orderVertices();

        // Sugyiama Step 4: coordinate assignment
        const coordinateAssignmentService = new CoordinateAssignmentService(layers, this._arcs);
        coordinateAssignmentService.assignCoordinates();

    }

    generateAdjacentNodeMaps() {
        this._nodes.forEach((node) => {
            const inputNodes: Node[] = [];
            const outputNodes: Node[] = [];

            this._arcs.forEach((arc) => {
                if (arc.to === node) inputNodes.push(arc.from);
                if (arc.from === node) outputNodes.push(arc.to);
            });
            this._nodeInputMap.set(node, inputNodes);
            this._nodeOutputMap.set(node, outputNodes);
        });
    }
}