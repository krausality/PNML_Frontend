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
import { CycleRemovalService } from "./sugyiama/cycleRemoval.service";

@Injectable({
    providedIn: 'root'
})

export class LayoutService {
    private _nodes: Set<Node> = new Set<Node>();
    private _arcs: Arc[] = [];

    constructor(protected dataService: DataService) {
        this.dataService = dataService;
    }

    applySugyiamaLayout() {
        // copy initial state of datamodel to local datamodel
        this._arcs = [...this.dataService.getArcs()];
        this._nodes = new Set([...this.dataService.getPlaces(), ...this.dataService.getTransitions()]);
        console.log('[Sugyiama Layout:] Initial set of arcs and nodes', this._nodes, this._arcs);

        // TODO: There are some requirements for the layout to work correctly.
        // -> There cannot be orphaned nodes

        // Sugyiama Step 1: remove cycles
        const cycleRemovalService = new CycleRemovalService(this._nodes, this._arcs)
        cycleRemovalService.removeCycles();

        // Sugyiama Step 2: assign layers
        const layerAssignmentService = new LayerAssignmentService(this._nodes, this._arcs)
        layerAssignmentService.assignLayers();

        // Sugyiama Step 3: vertex ordering
        // Sugyiama Step 4: coordinate assignment
    }

    
}