import { LayeredGraph } from 'src/app/tr-services/sugyiama/types';
import { Node } from 'src/app/tr-interfaces/petri-net/node';

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

    constructor(nodes: Node[], nodeInputMap: Map<Node, Node[]>) {
        this._nodes = nodes;
        this._nodeInputMap = nodeInputMap;
    }

    assignLayers(): LayeredGraph {
        // Layer which is currently being processed
        let layerId = 0;
        let counter = 0;

        // Add nodes to layers until there are no unassigned nodes left
        while (
            this._assignedNodes.length < this._nodes.length &&
            counter < 20
        ) {
            counter++;

            const previousLayer = this._layers[layerId - 1];

            const choices = this.getNodeChoicesForLayer(previousLayer);

            console.log(choices);
            const picked = choices.pop();

            if (picked) {
                // Create empty array for layer if it doesn't exist yet
                if (!this._layers[layerId]) this._layers[layerId] = [];

                // Add the picked node both the layered graph
                this._layers[layerId].push(picked);
                this._assignedNodes.push(picked);
            } else {
                // There are no nodes left that can be assigned to the current layer
                // so we move up to the next layer
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
    private getNodeChoicesForLayer(prevLayer: Node[] | undefined): Node[] {
        const incomingNodes: Node[] = [];

        // Get the pre-nodes for each node form the graph map
        // (map contains prenodes indexed by node)
        console.log(this._nodeInputMap);
        for (const [node, preNode] of this._nodeInputMap.entries()) {
            if (this._assignedNodes.includes(node)) {
                // ignore nodes that have already been assigned to a layer
                continue;
            }

            if (!prevLayer || prevLayer.length === 0) {
                // If this is the first layer/the previous layer has no nodes
                // all nodes are potential candidates for the layer
                if (preNode.length === 0) incomingNodes.push(node);
            } else {
                // Otherwise only nodes that have prenodes coming from
                // the previous layer are candidates for the current layer
                let intersection = [...preNode].filter((preNode) =>
                    prevLayer.includes(preNode),
                );
                if (intersection.length) {
                    incomingNodes.push(node);
                }
            }
        }

        return incomingNodes;
    }
}
