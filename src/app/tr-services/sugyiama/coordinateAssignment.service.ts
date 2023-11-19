import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Arc } from "src/app/tr-classes/petri-net/arc";
import { Point } from "src/app/tr-classes/petri-net/point";
import { DummyNode } from "src/app/tr-classes/petri-net/dummyNode";

import { LayeredGraph } from "src/app/tr-services/sugyiama/types";

export class CoordinateAssignmentService {
    // Initial set of nodes and arcs
    private _arcs: Arc[] = [];
    private _nodes: Node[] = [];
    private _layers: LayeredGraph = [];

    private _canvasHeight = 400;
    private _canvasWidth = 1140;

    private _maxColumnWidth = 300;
    private _maxRowHeight = 100;

    private _minColumnWidth = 100;
    private _minRowHeight = 50;

    constructor(
        layers: LayeredGraph,
        arcs: Arc[],
        nodes: Node[]
    ) {
        this._layers = layers;
        this._arcs = arcs;
        this._nodes = nodes;
    }
    
    assignCoordinates() {
        let currentX = 0;
        let currentY = 0;

        const columns = this._layers.length;
        const columnSize = Math.max(Math.min((this._canvasWidth/columns), this._maxColumnWidth), this._minColumnWidth);
        const maxRows = Math.max(...(this._layers.map((layer) => layer.length)));
        const rowSize = Math.max(Math.min((this._canvasHeight/maxRows), this._maxRowHeight), this._minRowHeight);

        this.clearArcAnchorpoints();

        for (const [layerId, layer] of this._layers.entries()) {
            const column = layerId + 1;
            currentX = (columnSize * column) - columnSize/2 ;
            currentY = this._canvasHeight/2 - (rowSize * (layer.length - 1)/2);
            for (const index in layer) {
                const node = layer[index];

                const position = new Point(currentX, currentY);

                if (node instanceof DummyNode) {
                    this.replaceDummyNode(node, position);
                    // node.position = position;
                } else {
                    node.position = position;
                }

                currentY = currentY + rowSize;
            }
        }
    }

    clearArcAnchorpoints() {
        for (let arc of this._arcs) {
            if (arc.anchors.length) arc.resetAnchors();            
        }
    }

    replaceDummyNode(node: DummyNode, position: Point) {
        const anchorpoints = [];

        const [inputArc] = this._arcs.filter((arc) => arc.to === node);
        const [outputArc] = this._arcs.filter((arc) => arc.from === node);

        if (inputArc.anchors) anchorpoints.push(...inputArc.anchors);
        this.removeItemFromArray(inputArc, this._arcs);

        anchorpoints.push(position);

        if (outputArc.anchors) anchorpoints.push(...outputArc.anchors);
        this.removeItemFromArray(outputArc, this._arcs);
        this._arcs.push(new Arc(inputArc.from, outputArc.to, 1, anchorpoints));

        // this.removeItemFromArray(node, this._nodes);
    }

    removeItemFromArray(item: any, array: any[]) {
        const index = array.indexOf(item);
        const x = array.splice(index, 1);

        return array;
    }
}