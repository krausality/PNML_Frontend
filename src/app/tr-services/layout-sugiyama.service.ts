import { Injectable } from '@angular/core';
import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Arc } from '../tr-classes/petri-net/arc';
import { DataService } from 'src/app/tr-services/data.service';

import { LayeredGraph } from 'src/app/tr-services/sugiyama/types';

import { CycleRemovalService } from './sugiyama/cycle-removal.service';
import { LayerAssignmentService } from './sugiyama/layer-assignment.service';
import { VertexOrderingService } from './sugiyama/vertex-ordering.service';
import { CoordinateAssignmentService } from './sugiyama/coordinate-assignment.service';

/**
 * @Injectable
 * Provided in 'root', making this service a singleton available throughout the application.
 *
 * @description
 * The `LayoutSugiyamaService` is responsible for applying the Sugiyama-style layered graph layout
 * to the Petri net data provided by the `DataService`. This algorithm aims to produce a clear
 * hierarchical representation of the graph.
 *
 * Modularity:
 * This service orchestrates the four main steps of the Sugiyama algorithm, each implemented
 * as a separate, specialized service:
 * 1.  `CycleRemovalService`: Temporarily removes cycles from the graph.
 * 2.  `LayerAssignmentService`: Assigns nodes to horizontal layers.
 * 3.  `VertexOrderingService`: Orders nodes within layers to minimize edge crossings. This step
 *     may introduce dummy nodes and arcs for edges spanning multiple layers.
 * 4.  `CoordinateAssignmentService`: Assigns final x and y coordinates to nodes.
 *
 * This modular approach was chosen to:
 * - Enhance **Maintainability**: Each step is isolated, making it easier to understand, modify, and debug.
 * - Improve **Testability**: Individual algorithm components can be tested independently.
 * - Promote **Separation of Concerns**: Each service has a clearly defined responsibility.
 *
 * The `LayoutSugiyamaService` initializes these services with the current graph data (nodes and arcs),
 * manages the flow of data between them, and ensures that any modifications (like the addition of
 * dummy arcs) are reflected back in the `DataService` if necessary for rendering.
 */
@Injectable({
    providedIn: 'root',
})
export class LayoutSugiyamaService {
    private _nodes: Node[] = [];
    private _arcs: Arc[] = [];

    /**
     * Constructs the `LayoutSugiyamaService`.
     * @param dataService The central service for accessing and modifying Petri net data.
     */
    constructor(protected dataService: DataService) {
        this.dataService = dataService;
    }

    /**
     * Applies the Sugiyama layout algorithm to the current Petri net data.
     * The process involves several steps:
     * 1. Copying the current nodes and arcs from `DataService`.
     * 2. Removing cycles from the graph using `CycleRemovalService`.
     * 3. Assigning nodes to layers using `LayerAssignmentService`.
     * 4. Reversing any arcs that were temporarily reversed for cycle removal.
     * 5. Ordering vertices within layers to minimize crossings and adding dummy nodes/arcs
     *    for long edges using `VertexOrderingService`.
     * 6. Updating the `DataService` with any new (dummy) arcs.
     * 7. Assigning final coordinates to all nodes (including dummy nodes) using `CoordinateAssignmentService`.
     *
     * The layout modifications are applied directly to the node and arc objects.
     * The `DataService.dataChanged$` observable should be triggered by the consuming component
     * after this method completes to update the UI.
     */
    applySugiyamaLayout() {
        let layers: LayeredGraph = [];

        // Copy initial state of datamodel to local datamodel
        // because the algorithm treats places & transitons the same
        this._arcs = [...this.dataService.getArcs()];
        this._nodes = [
            ...this.dataService.getTransitions(),
            ...this.dataService.getPlaces(),
        ];

        // Sugiyama Step 1: Remove cycles
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

        // Arcs that have been reversed for layer assignment can now be re-reversed
        cycleRemovalService.reverseArcs();

        // Sugiyama Step 3: Vertex ordering/crossing minimization
        // - Add dummy nodes for "long" arcs
        // - Re-order vertices to reduce crossings between arcs
        const vertexOrderingService = new VertexOrderingService(
            layers,
            this._nodes,
            this._arcs,
        );
        vertexOrderingService.orderVertices();

        // Update arcs in the unterlying data-model before redrawing it.
        // This is needed to add the dummy arcs that were added with the
        // dummy nodes in the previous step
        this.dataService.arcs = this._arcs;

        // Sugiyama Step 4: Coordinate assignment
        const coordinateAssignmentService = new CoordinateAssignmentService(
            layers,
            this._arcs,
            this._nodes,
        );
        coordinateAssignmentService.assignCoordinates();
    }
}
