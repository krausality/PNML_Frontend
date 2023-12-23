import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { Point } from 'src/app/tr-classes/petri-net/point';
import { DummyNode } from 'src/app/tr-classes/petri-net/dummyNode';

import { LayeredGraph } from 'src/app/tr-services/sugyiama/types';

export class CoordinateAssignmentService {
    // Initial set of nodes and arcs
    private _arcs: Arc[] = [];
    private _nodes: Node[] = [];
    private _layers: LayeredGraph = [];

    // Default values to ensure a pleasing layout
    // TODO: maybe move these to the position constants?
    private _canvasHeight;
    private _canvasWidth;

    private _maxColumnWidth = 300;
    private _maxRowHeight = 100;

    private _minColumnWidth = 100;
    private _minRowHeight = 50;

    constructor(layers: LayeredGraph, arcs: Arc[], nodes: Node[]) {
        this._layers = layers;
        this._arcs = arcs;
        this._nodes = nodes;

        const drawingArea = document.getElementById('drawingArea');

        this._canvasHeight = drawingArea?.scrollHeight
            ? drawingArea?.scrollHeight
            : 400;
        this._canvasWidth = drawingArea?.scrollWidth
            ? drawingArea?.scrollWidth
            : 1140;
    }

    assignCoordinates() {
        let currentX = 0;
        let currentY = 0;

        // Calculate spacings between nodes from the max values set above
        // and the number of nodes and layers in the graph
        // this is really just for nicer layout and even spacing
        const columns = this._layers.length;
        const columnSize = Math.max(
            Math.min(this._canvasWidth! / columns, this._maxColumnWidth),
            this._minColumnWidth,
        );
        const maxRows = Math.max(...this._layers.map((layer) => layer.length));
        const rowSize = Math.max(
            Math.min(this._canvasHeight! / maxRows, this._maxRowHeight),
            this._minRowHeight,
        );

        // remove all anchorpoints as these will have to be re-calculated
        this._arcs.forEach((arc) => arc.resetAnchors());

        // lay out each layer of the graph
        for (const [layerId, layer] of this._layers.entries()) {
            // calculate the x position from the layer the node is in
            const column = layerId + 1; // the layers are zero-indexed so we'll always add 1
            currentX = columnSize * column - columnSize / 2;

            // calculate the initial y position from the max number of nodes in the layer
            // this will be incremented for each node in the layer
            currentY =
                this._canvasHeight! / 2 - (rowSize * (layer.length - 1)) / 2;

            for (const node of layer) {
                const position = new Point(currentX, currentY);

                if (node instanceof DummyNode) {
                    this.replaceDummyNode(node, position);
                    // node.position = position;
                } else {
                    node.position = position;
                }

                // Update the vertical position
                currentY = currentY + rowSize;
            }
        }
    }

    private replaceDummyNode(node: DummyNode, position: Point) {
        const anchorpoints = [];

        // find the arcs that connect the dummy node to both sides
        const [inputArc] = this._arcs.filter((arc) => arc.to === node);
        const [outputArc] = this._arcs.filter((arc) => arc.from === node);

        // Create the new long arcs' anchorpoints in the right order:
        // copy the preArcs anchors in case it was already a long arc
        // then add the current nodes position
        // last add the post arcs anchors in case it was already a long arc

        if (inputArc.anchors) anchorpoints.push(...inputArc.anchors);
        anchorpoints.push(position);
        if (outputArc.anchors) anchorpoints.push(...outputArc.anchors);

        // delete the old connecting arcs which are being replaced
        this.removeItemFromArray(inputArc, this._arcs);
        this.removeItemFromArray(outputArc, this._arcs);

        // create a new arc leading from the dummy nodes prenode to its postnode
        this._arcs.push(
            new Arc(inputArc.from, outputArc.to, inputArc.weight, anchorpoints),
        );

        // remove the dummy node itself
        this.removeItemFromArray(node, this._nodes);
    }

    private removeItemFromArray(item: any, array: any[]) {
        const index = array.indexOf(item);
        const x = array.splice(index, 1);

        return array;
    }
}
