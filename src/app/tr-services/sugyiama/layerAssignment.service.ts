import { LayeredGraph } from "src/app/tr-services/sugyiama/types";
import { Node } from "src/app/tr-interfaces/petri-net/node";

/** 
 * Layer Assignment Service
 *
 * Loops through a graph and assigns its nodes to layers.
 * This implementation follows the Longest Path Algorithm proposed by
 * Tamassia et al., Handbook of Graph Drawing and Visualization, 2010
 * 
 */
export class LayerAssignmentService {
    // Initial set of nodes and arcs
    private _nodes: Node[] = [];
    private _nodeInputMap: Map<Node, Node[]> = new Map();
    
    private _assignedNodes: Node[] = []; 
    
    private _layers: LayeredGraph = [];

    constructor(
        nodes: Node[],
        nodeInputMap: Map<Node, Node[]>
    ) {
        this._nodes = nodes;
        this._nodeInputMap = nodeInputMap;
    }

    assignLayers(): LayeredGraph {
        // Layer which is currently being processed
        let layerId = 0;
        let counter = 0;

        // TODO: Check if there is a more elegant way to check if two sets are equal
        while (this._assignedNodes.length < this._nodes.length && counter < 20) {
            counter++;

            const parentLayer = this._layers[layerId - 1];

            const choices = this.getNodeChoicesForLayer(parentLayer);
            const picked = choices.pop();


            if (picked) {
                if (!this._layers[layerId]) this._layers[layerId] = [];
                this._layers[layerId].push(picked);
                this._assignedNodes.push(picked);
            } else {
                layerId++;
                this._layers[layerId] = [];
            }

            if (layerId > this._nodes.length) {
                // if there are more layers than vertices
                // something has gone very wrong!
                console.log('Error during Layer Assignment.');
                break;
            }
        }

        return this._layers;
    }

    // gets all nodes that have incoming edges from the given layer
    getNodeChoicesForLayer(layer: Node[] | undefined): Node[]  {
        const incomingNodes: Node[] = [];

        for (const [node, parentNodes] of this._nodeInputMap.entries()) {
            if (this._assignedNodes.includes(node)) {
                // this node has already been assigned, ignore
                continue;
            }
            if (!layer || layer.length === 0) {
                if (parentNodes.length === 0) incomingNodes.push(node);  
            } else {
                let intersection = [...parentNodes].filter(parentNode => layer.includes(parentNode));
                if (intersection.length) {
                    incomingNodes.push(node);
                }
            }
        }

        return incomingNodes;
    }
}