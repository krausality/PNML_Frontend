import { Node } from "src/app/tr-interfaces/petri-net/node";
import { DummyNode } from "src/app/tr-classes/petri-net/dummyNode";
import { Arc } from "src/app/tr-classes/petri-net/arc";
import { Point } from "src/app/tr-classes/petri-net/point";

import { LayeredGraph } from "src/app/tr-services/sugyiama/types";


export class VertexOrderingService {
    // Initial set of nodes and arcs
    private _nodes: Node[] = [];
    private _arcs: Arc[] = [];

    // Maps of adjacent nodes
    private _nodeInputMap: Map<Node, Node[]> = new Map();
    private _nodeOutputMap: Map<Node, Node[]> = new Map();
    
    private _layers: LayeredGraph = [];

    constructor(
        layers: LayeredGraph,
        arcs: Arc[],
        nodeInputMap: Map<Node, Node[]>,
        nodeOutputMap: Map<Node, Node[]>
    ) {
        this._layers = layers;
        this._arcs = arcs;

        this._nodeInputMap = nodeInputMap;
        this._nodeOutputMap = nodeOutputMap;
    }

    orderVertices() {
        this.insertDummyNodes();

        // TODO:
        // We should create a deep copy of the layers
        // then use median & transpose algorithms to sort layer-copy
        // then always continue on with wichever order has the least crossings (--> best)
        // Problem: the current data structure doesn't allow this since our
        // we always have to iterate over the original layers to be able to use our node maps

        // const currentOrder = this._layers;
        // let best = currentOrder;

        // 24 iterations is the number taken from paper by Ganser et al.,
        // for testing we'll use less for now
        const maxIterations = 4;
        for (let i = 0; i < maxIterations; i++) {   
            this.median(i, this._layers);
            this.transpose(this._layers);

            // console.log(this.totalCrossings(this._layers));

            // if (this.totalCrossings(currentOrder) > this.totalCrossings(best)) {
            //     best = currentOrder;
            // }
        }
    }

    median(iteration: number, currentOrder: LayeredGraph) {
        // Sweep through the tree
        // Change direction top-to-bottom to bottom-to-top for each iteration
        if (iteration % 2 === 0) {
            for (const [layerId, nodes] of currentOrder.entries()) {
                const median = new Map();
                for (const node of nodes) {
                    const adjacentLayer = currentOrder[layerId - 1];
                    if (adjacentLayer) {
                        median.set(node, this.getMedianValueOfInputNodes(node, adjacentLayer));
                    }
                }
                nodes.sort((a, b) => median.get(a) - median.get(b));
            }
        } else {
            for (const [layerId, nodes] of currentOrder.reverse().entries()) {
                const median = new Map();
                for (const node of nodes) {
                    const adjacentLayer = currentOrder[layerId + 1];
                    if (adjacentLayer) {
                        median.set(node, this.getMedianValueOfOutputNodes(node, adjacentLayer));
                    }
                }
                nodes.sort((a, b) => median.get(a) - median.get(b));
            }
        }
    }

    transpose(currentOrder: LayeredGraph) {
        let improved = true;

        // TODO: remove counter once sure that we're not creating any endless loops by accident
        let failsafe = 0;
        while (improved && failsafe < 5) {
            failsafe++;
            improved = false;
            for (const [layerId, layer] of currentOrder.entries()) {
                if (layer.length === 1 || !currentOrder[layerId + 1]) {
                    // console.log('Skipping Layer ' + layerId + ' which has only 1 node or it is the last one');
                    continue;
                }

                // Check for each pair of nodes if swapping them would reduce the # of crossings
                for (let position = 0; position < layer.length - 1; position++) {
                    const nodeA = layer[position];
                    const nodeB = layer[position + 1];
                    
                    if (this.layerCrossings(nodeA, nodeB, layerId) > this.layerCrossings(nodeB, nodeA, layerId)) {
                        improved = true;

                        // Swap the two nodes
                        const temp = nodeA;
                        layer[position] = nodeB;
                        layer[position+1] = temp;
                    }
                }
            }
        }
    }

    // Traverse the whole graph and count all crossings
    totalCrossings(currentOrder: LayeredGraph) {
        let crossings = 0;
        for (const [layerId, layer] of currentOrder.entries()) {
            if (layer.length === 1 || !currentOrder[layerId + 1]) {
                // the last layer or nodes with 1 node cannot have crossings
                continue;
            }

            // Check crossings for each neighbouring nodes
            for (let position = 0; position < layer.length - 1; position++) {
                const nodeA = layer[position];
                const nodeB = layer[position + 1];
                crossings += this.layerCrossings(nodeA, nodeB, layerId);
            }
        }

        return crossings;
    }

    // Find all crossings between two  nodes in a given layer
    layerCrossings(nodeA: Node, nodeB: Node, layerId: number) {
        if (this._layers[layerId + 1].length === 1) {
            // there is only one node in the next layer, there can be no crossings
            return 0;
        }
        
        let crossings = 0;

        // Find all connected nodes in the next layer and their positions within the layer
        let adjacentNodesIndexA = this.getConnectedNodes(nodeA).map((node) => this._layers[layerId +1].indexOf(node)).filter((item) => item !== -1);
        let adjacentNodesIndexB = this.getConnectedNodes(nodeB).map((node) => this._layers[layerId +1].indexOf(node)).filter((item) => item !== -1);
        
        // For each pair check wether the index of the neighbouring node is bigger
        // if so, then a crossing has been identified
        for (const indexA of adjacentNodesIndexA ) {
            for (const indexB of adjacentNodesIndexB) {
                if (indexA > indexB) {
                    crossings++;
                }
            }
        }

        return crossings;
    }

    getConnectedNodes(node: Node) {
        const connectedNodes = [];

        const inputNodes = this._nodeInputMap.get(node);
        const outputNodes = this._nodeOutputMap.get(node);

        if (inputNodes) connectedNodes.push(...inputNodes);
        if (outputNodes) connectedNodes.push(...outputNodes);

        return connectedNodes;
    }


    getMedianValueOfInputNodes(node: Node, layer: Node[]) {
        // console.log('[Vertex Ordering]: nodes in adjacent layer to node: ', node, layer);
        const inputNodes = this._nodeInputMap.get(node);
        if (!inputNodes || !inputNodes.length) {
            // nodes with no adjacent vertices are given a median of -1
            return -1;
        } else {
            const adjacentValues = [];
            for(const index in layer) {
                if (inputNodes.find(inputNode => inputNode === layer[index])) {
                    adjacentValues.push(+index);
                }
            }
 
            // console.log('[Vertex Ordering]: adjacent values', adjacentValues);

            const mid = Math.floor(adjacentValues.length / 2);
            // TODO: implemented weighted median
            return adjacentValues.length % 2 !== 0 ? adjacentValues[mid] : (adjacentValues[mid - 1] + adjacentValues[mid]) / 2;
        }
    }

    getMedianValueOfOutputNodes(node: Node, layer: Node[]) {
        // console.log('[Vertex Ordering]: nodes in adjacent layer to node: ', node, layer);
        const outputNodes = this._nodeOutputMap.get(node);
        if (!outputNodes || !outputNodes.length) {
            // nodes with no adjacent vertices are given a median of -1
            return -1;
        } else {
            const adjacentValues = [];
            for(const index in layer) {
                if (outputNodes.find(outputNode => outputNode === layer[index])) {
                    adjacentValues.push(+index);
                }
            }

            const mid = Math.floor(adjacentValues.length / 2);
            // TODO: implemented weighted median
            return adjacentValues.length % 2 !== 0 ? adjacentValues[mid] : (adjacentValues[mid - 1] + adjacentValues[mid]) / 2;
        }
    }

    insertDummyNodes() {
        let dummyIndex = 0;
        for (const [layerId, nodes] of this._layers.entries()) {
            const nextLayer = this._layers[layerId + 1];
            if (!nextLayer) continue;
            
            // Check if there are connected nodes from a layer
            // that is *not* the previous one.
            // This has to be done seperately for input & output nodes
            // so that we can ensure the correct direction of the inserted dummy arcs
            for (let node of nodes) {
                const preNodes = this._nodeInputMap.get(node);
                if (preNodes) {
                    for (let preNode of preNodes) {
                        const preNodeLayer = this.findLayerIdForNode(preNode);

                        // If prenode is not on the previous layer
                        // this is a long edge and a dummy node needs to be inserted
                        if (Math.abs(preNodeLayer) - layerId > 1) {
                            this.addDummyNodeAndArcs(dummyIndex, nextLayer, preNode, node);
                            dummyIndex++;
                        }
                    }
                }

                const outputNodes = this._nodeOutputMap.get(node);
                if (outputNodes) {
                    // check if there are outgoing edges from a vertex from a layer
                    // that is *not* the next one
                    for (let postNode of outputNodes) {
                        const postNodeLayer = this.findLayerIdForNode(postNode);

                        // If postnode is not on the previous layer
                        // this is a long edge and a dummy node needs to be inserted
                        if (Math.abs(postNodeLayer) - layerId > 1) {
                            this.addDummyNodeAndArcs(dummyIndex, nextLayer, node, postNode);
                            dummyIndex++;
                        }
                    }
                }

                // Update the now outdated node maps to reflect the dummy arcs & nodes
                this.generateAdjacentNodeMaps();
            }
        }
    }

    addDummyNodeAndArcs(index: number, layer: Node[], from: Node, to: Node) {
        // console.log('[Vertex Ordering]: Create dummy for  ' , from, 'to: ', to);
        const dummy = new DummyNode(new Point(1, 1), `dummyNode-${index}`, `DummyNode ${index}`);
        layer.push(dummy);

        // Remove original arc
        const arcIndex = this._arcs.findIndex((arc) => arc.equals(new Arc(from, to)));
        const weight = this._arcs[arcIndex].weight;
        this._arcs.splice(arcIndex, 1);

        // Instead add two arc sections to and from the dummy node
        this._arcs.push(new Arc(from, dummy, weight));
        this._arcs.push(new Arc(dummy, to, weight));
    }

    findLayerIdForNode(node: Node): number {
        for (const [layerId, nodes] of this._layers.entries()) {
            if (nodes.includes(node)) return layerId;
        }
        return 0;
    }

    generateAdjacentNodeMaps() {
        this._nodeInputMap.clear();
        this._nodeOutputMap.clear();

        this._arcs.forEach((arc) => {
            if (this._nodeInputMap.get(arc.to)) {
                this._nodeInputMap.get(arc.to)?.push(arc.from);
            } else {
                this._nodeInputMap.set(arc.to, [arc.from]);
            }

            if (this._nodeOutputMap.get(arc.from)) {
                this._nodeOutputMap.get(arc.from)?.push(arc.to);
            } else {
                this._nodeOutputMap.set(arc.from, [arc.to]);
            }
        });
    }
}