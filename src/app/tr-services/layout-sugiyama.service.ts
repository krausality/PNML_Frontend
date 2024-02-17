import { Injectable } from '@angular/core';
import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Arc } from '../tr-classes/petri-net/arc';
import { DataService } from 'src/app/tr-services/data.service';

import { LayeredGraph } from 'src/app/tr-services/sugiyama/types';

import { CycleRemovalService } from './sugiyama/cycle-removal.service';
import { LayerAssignmentService } from './sugiyama/layer-assignment.service';
import { VertexOrderingService } from './sugiyama/vertex-ordering.service';
import { CoordinateAssignmentService } from './sugiyama/coordinate-assignment.service';

@Injectable({
    providedIn: 'root',
})
export class LayoutSugiyamaService {
    private _nodes: Node[] = [];
    private _arcs: Arc[] = [];

    constructor(protected dataService: DataService) {
        this.dataService = dataService;
    }

    applySugiyamaLayout() {
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

        // Sugiyama Step 1: remove cycles
        const cycleRemovalService = new CycleRemovalService(
            this._nodes,
            this._arcs,
        );
        cycleRemovalService.removeCycles();

        // Sugiyama Step 2: Assign layers
        const layerAssignmentService = new LayerAssignmentService(
            this._nodes,
            this._arcs,
        );
        layers = layerAssignmentService.assignLayers();

        // Arcs that have been reversed for layer assignment can now to be re-reversed
        cycleRemovalService.reverseArcs();

        // Sugiyama Step 3: vertex ordering/crossing minimization
        // - Add dummy nodes for "long" arcs
        // - Re-order vertices to reduce crossings between arcs
        const vertexOrderingService = new VertexOrderingService(
            layers,
            this._nodes,
            this._arcs,
        );
        vertexOrderingService.orderVertices();

        // update arcs in the unterlying data-model before redrawing it
        // this is needed to add the dummy arcs added in the previous step
        this.dataService.arcs = this._arcs;

        // Sugiyama Step 4: coordinate assignment
        const coordinateAssignmentService = new CoordinateAssignmentService(
            layers,
            this._arcs,
            this._nodes,
        );
        coordinateAssignmentService.assignCoordinates();
    }
}
