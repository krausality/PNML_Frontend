import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Arc } from "src/app/tr-classes/petri-net/arc";
import { Transition } from "src/app/tr-classes/petri-net/transition";
import { Place } from "src/app/tr-classes/petri-net/place";
import { Point } from "src/app/tr-classes/petri-net/point";
import { DummyNode } from "src/app/tr-classes/petri-net/dummyNode";

export class CoordinateAssignmentService {
    // Initial set of nodes and arcs
    private _nodes: Node[] = [];
    private _arcs: Arc[] = [];

    // Maps of adjacent nodes
    private _nodeInputMap: Map<Node, Node[]> = new Map();
    private _nodeOutputMap: Map<Node, Node[]> = new Map();
    
    private _layers: Record<number, Node[]> = {};

    private _canvasHeight = 400 -50;
    private _canvasWidth = 1140;

    private _maxColumnWidth = 300;
    private _maxRowHeight = 150;

    constructor(
        layers: Record<number, Node[]>,
        nodes: Node[],
        arcs: Arc[],
        nodeInputMap: Map<Node, Node[]>,
        nodeOutputMap: Map<Node, Node[]>
    ) {
        this._layers = layers;
        this._nodes = nodes;
        this._arcs = arcs;

        this._nodeInputMap = nodeInputMap;
        this._nodeOutputMap = nodeOutputMap;
    }
    
    assignCoordinates() {
        let currentX = 0;
        let currentY = 0;

        const columns = Object.entries(this._layers).length;
        const columnSize = Math.min((this._canvasWidth/columns), this._maxColumnWidth);

        console.log(this._arcs);
        this.clearArcAnchorpoints();

        for (const [layerId, layer] of Object.entries(this._layers)) {
            currentX = (columnSize * +layerId) - columnSize/2 ;

            const rowSize = Math.min((this._canvasHeight/layer.length), this._maxRowHeight);

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
            // TODO: Add utility to reset arc weight to arc model
            arc = new Arc(arc.from, arc.to, arc.weight, []);
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

        this.removeItemFromArray(node, this._nodes);
    }

    removeItemFromArray(item: any, array: any[]) {
        const index = array.indexOf(item);
        const x = array.splice(index, 1);

        return array;
    }
}