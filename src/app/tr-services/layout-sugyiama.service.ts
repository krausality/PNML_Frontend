import { Injectable } from '@angular/core';
import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Arc } from '../tr-classes/petri-net/arc';
import { DataService } from 'src/app/tr-services/data.service';

import { LayeredGraph } from 'src/app/tr-services/sugyiama/types';

import { CycleRemovalService } from './sugyiama/cycle-removal.service';
import { LayerAssignmentService } from './sugyiama/layer-assignment.service';
import { VertexOrderingService } from './sugyiama/vertex-ordering.service';
import { CoordinateAssignmentService } from './sugyiama/coordinate-assignment.service';

@Injectable({
    providedIn: 'root',
})
export class LayoutSugyiamaService {
    private _nodes: Node[] = [];
    private _arcs: Arc[] = [];

    // Map parent nodes for each node
    private _nodeInputMap = new Map();
    private _nodeOutputMap = new Map();

    constructor(protected dataService: DataService) {
        this.dataService = dataService;
    }

    applySugyiamaLayout() {
        // reset to make sure there are no interferences from
        // previous runs of the algorithm
        this._nodeInputMap = new Map();
        this._nodeOutputMap = new Map();
        let layers: LayeredGraph = [];

        // copy initial state of datamodel to local datamodel
        // the algorithm treats places & transitons the same
        this._arcs = [...this.dataService.getArcs()];
        this._nodes = [
            ...this.dataService.getTransitions(),
            ...this.dataService.getPlaces(),
        ];

        // TODO: There are some requirements for the layout to work correctly.
        // -> There cannot be orphaned nodes

        // Sugyiama Step 1: remove cycles
        const cycleRemovalService = new CycleRemovalService(
            this._nodes,
            this._arcs,
        );
        cycleRemovalService.removeCycles();

        this.generateAdjacentNodeMaps();

        // Sugyiama Step 2: assign layers
        const layerAssignmentService = new LayerAssignmentService(
            this._nodes,
            this._nodeInputMap,
        );
        layers = layerAssignmentService.assignLayers();

        // Arcs that have been reversed for layer assignment can now to be re-reversed
        cycleRemovalService.reverseArcs();

        // Sugyiama Step 3: vertex ordering/crossing minimization
        // - Add dummy nodes for "long" arcs
        // - Re-order vertices to reduce crossings between arcs
        const vertexOrderingService = new VertexOrderingService(
            layers,
            this._arcs,
            this._nodeInputMap,
            this._nodeOutputMap,
        );
        vertexOrderingService.orderVertices();

        // update arcs in the unterlying data-model before redrawing it
        // this is needed to add the dummy arcs added in the previous step
        this.dataService.arcs = this._arcs;

        // Sugyiama Step 4: coordinate assignment
        const coordinateAssignmentService = new CoordinateAssignmentService(
            layers,
            this._arcs,
            this._nodes,
        );
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
