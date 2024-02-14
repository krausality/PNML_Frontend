import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { DummyNode } from 'src/app/tr-classes/petri-net/dummyNode';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { Point } from 'src/app/tr-classes/petri-net/point';

import { LayeredGraph } from 'src/app/tr-services/sugiyama/types';

export class VertexOrderingService {
    // Initial set of nodes and arcs
    private _nodes: Node[] = [];
    private _arcs: Arc[] = [];

    // Maps of adjacent nodes
    private _nodeInputIdMap: Map<string, Node[]> = new Map();
    private _nodeOutputIdMap: Map<string, Node[]> = new Map();

    private _layers: LayeredGraph = [];

    constructor(layers: LayeredGraph, nodes: Node[], arcs: Arc[]) {
        this._layers = layers;
        this._nodes = nodes;
        this._arcs = arcs;

        this.generateAdjacentNodeMaps();
    }

    orderVertices() {
        this.insertDummyNodes();

        let best = [...this._layers];
        let bestCrossingsNumber = this.totalCrossings(best);

        // 24 iterations is the number taken from paper by Ganser et al.
        // They suggest checking wether the algorithm has actually improved
        // anything. That threshold is saved in maxRoundsNoImprovement and
        // checked after each iteration.
        const maxIterations = 24;
        const maxRoundsNoImprovement = 6;
        let roundsWithNoImprovement = 0;
        for (let i = 0; i < maxIterations; i++) {
            // Change direction of sweep for every other iteration
            if (i % 2 !== 0) {
                this._layers.reverse();
            }
            this.median(i, this._layers);
            this.transpose(this._layers);
            if (i % 2 !== 0) {
                this._layers.reverse();
            }

            const currentCrossingNumber = this.totalCrossings(this._layers);

            if (currentCrossingNumber < bestCrossingsNumber) {
                best = [...this._layers];
                bestCrossingsNumber = currentCrossingNumber;
            } else {
                roundsWithNoImprovement++;
            }

            // If the optimum (0 crossings) has been reached
            // or X rounds have passed without any improvements,
            // we'll stop the algorithm early
            if (
                bestCrossingsNumber === 0 ||
                roundsWithNoImprovement > maxRoundsNoImprovement
            ) {
                break;
            }
        }

        this._layers = best;
    }

    private median(iteration: number, currentOrder: LayeredGraph) {
        // Sweep through the tree
        // Change direction top-to-bottom to bottom-to-top for each iteration
        for (const [layerId, nodes] of currentOrder.entries()) {
            const median = new Map();
            for (const node of nodes) {
                // Direction changes top-to-bottom to bottom-to-top for every other iteration
                if (iteration % 2 === 0) {
                    const adjacentLayer = currentOrder[layerId - 1];
                    if (adjacentLayer) {
                        median.set(
                            node,
                            this.getMedianValueOfInputNodes(
                                node,
                                adjacentLayer,
                            ),
                        );
                    }
                } else {
                    const adjacentLayer = currentOrder[layerId + 1];
                    if (adjacentLayer) {
                        median.set(
                            node,
                            this.getMedianValueOfOutputNodes(
                                node,
                                adjacentLayer,
                            ),
                        );
                    }
                }
            }
            nodes.sort((a, b) => median.get(a) - median.get(b));
        }
    }

    // Swaps nodes if that reduces crossings between the layers
    private transpose(currentOrder: LayeredGraph) {
        let improved = true;

        let runs = 0;
        const maxRuns = 20;
        while (improved && runs < maxRuns) {
            runs++;
            improved = false;
            for (const [layerId, layer] of currentOrder.entries()) {
                if (layer.length === 1 || !currentOrder[layerId + 1]) {
                    // Layers that have only one node or no next
                    // layer to cross with can be skipped.
                    continue;
                }

                // Check for each pair of nodes if swapping them would
                // reduce the # of layer crossings
                for (
                    let position = 0;
                    position < layer.length - 1;
                    position++
                ) {
                    const nodeA = layer[position];
                    const nodeB = layer[position + 1];

                    if (
                        this.layerCrossings(nodeA, nodeB, layerId) >
                        this.layerCrossings(nodeB, nodeA, layerId)
                    ) {
                        improved = true;

                        // Swap the two nodes
                        const temp = nodeA;
                        layer[position] = nodeB;
                        layer[position + 1] = temp;
                    }
                }
            }
        }
    }

    // Traverse the whole graph and count all crossings
    private totalCrossings(currentOrder: LayeredGraph) {
        let crossings = 0;
        for (const [layerId, layer] of currentOrder.entries()) {
            if (layer.length === 1 || !currentOrder[layerId + 1]) {
                // The last layer or layers with only one node cannot have crossings
                continue;
            }

            // Check crossings for each pair of nodes in the layer
            for (let positionA = 0; positionA < layer.length; positionA++) {
                for (
                    let positionB = positionA + 1;
                    positionB < layer.length;
                    positionB++
                ) {
                    const nodeA = layer[positionA];
                    const nodeB = layer[positionB];
                    crossings += this.layerCrossings(nodeA, nodeB, layerId);
                }
            }
        }

        return crossings;
    }

    // Find all crossings between two  nodes in a given layer
    private layerCrossings(nodeA: Node, nodeB: Node, layerId: number) {
        if (this._layers[layerId + 1].length === 1) {
            // There is only one node in the next layer, so there can be no crossings
            return 0;
        }

        let crossings = 0;

        // Find all connected nodes in the next layer and their positions within the layer
        let adjacentNodesIndexA = this.getConnectedNodes(nodeA)
            .map((node) => this._layers[layerId + 1].indexOf(node))
            .filter((item) => item !== -1);
        let adjacentNodesIndexB = this.getConnectedNodes(nodeB)
            .map((node) => this._layers[layerId + 1].indexOf(node))
            .filter((item) => item !== -1);

        // For each pair check wether the index of the neighbouring node is bigger.
        // If so, then a crossing has been identified
        for (const indexA of adjacentNodesIndexA) {
            for (const indexB of adjacentNodesIndexB) {
                if (indexA > indexB) {
                    crossings++;
                }
            }
        }

        return crossings;
    }

    private getConnectedNodes(node: Node) {
        const connectedNodes = [];

        const inputNodes = this._nodeInputIdMap.get(node.id);
        const outputNodes = this._nodeOutputIdMap.get(node.id);

        if (inputNodes) connectedNodes.push(...inputNodes);
        if (outputNodes) connectedNodes.push(...outputNodes);

        return connectedNodes;
    }

    private getMedianValueOfInputNodes(node: Node, layer: Node[]) {
        const inputNodes = this._nodeInputIdMap.get(node.id);
        if (!inputNodes || !inputNodes.length) {
            // Nodes with no adjacent vertices are given a median of -1
            return -1;
        } else {
            const adjacentValues = [];
            for (const index in layer) {
                if (
                    inputNodes.find((inputNode) => inputNode === layer[index])
                ) {
                    adjacentValues.push(+index);
                }
            }

            const mid = Math.floor(adjacentValues.length / 2);
            return adjacentValues.length % 2 !== 0
                ? adjacentValues[mid]
                : (adjacentValues[mid - 1] + adjacentValues[mid]) / 2;
        }
    }

    private getMedianValueOfOutputNodes(node: Node, layer: Node[]) {
        const outputNodes = this._nodeOutputIdMap.get(node.id);
        if (!outputNodes || !outputNodes.length) {
            // Nodes with no adjacent vertices are given a median of -1
            return -1;
        } else {
            const adjacentValues = [];
            for (const index in layer) {
                if (
                    outputNodes.find(
                        (outputNode) => outputNode === layer[index],
                    )
                ) {
                    adjacentValues.push(+index);
                }
            }

            const mid = Math.floor(adjacentValues.length / 2);
            return adjacentValues.length % 2 !== 0
                ? adjacentValues[mid]
                : (adjacentValues[mid - 1] + adjacentValues[mid]) / 2;
        }
    }

    private insertDummyNodes() {
        let dummyIndex = 0;
        for (const [layerId, nodes] of this._layers.entries()) {
            const nextLayer = this._layers[layerId + 1];
            if (!nextLayer) continue;

            // Check if there are connected nodes from a layer
            // that is *not* the previous one.
            // This has to be done seperately for input & output nodes,
            // so that we can ensure the correct direction of the inserted dummy arcs
            for (let node of nodes) {
                const preNodes = this._nodeInputIdMap.get(node.id);
                if (preNodes) {
                    for (let preNode of preNodes) {
                        const preNodeLayer = this.findLayerIdForNode(preNode);

                        // If prenode is not on the previous layer, this is
                        // a long edge and a dummy node needs to be inserted
                        if (Math.abs(preNodeLayer) - layerId > 1) {
                            this.addDummyNodeAndArcs(
                                dummyIndex,
                                nextLayer,
                                preNode,
                                node,
                            );
                            dummyIndex++;
                        }
                    }
                }

                const outputNodes = this._nodeOutputIdMap.get(node.id);
                if (outputNodes) {
                    // Check if there are outgoing edges from a vertex
                    // on a layer that is *not* the next one
                    for (let postNode of outputNodes) {
                        const postNodeLayer = this.findLayerIdForNode(postNode);

                        // If postnode is not on the previous layer this is
                        // a long edge and a dummy node needs to be inserted
                        if (Math.abs(postNodeLayer) - layerId > 1) {
                            this.addDummyNodeAndArcs(
                                dummyIndex,
                                nextLayer,
                                node,
                                postNode,
                            );
                            dummyIndex++;
                        }
                    }
                }

                // Update the now outdated node maps to include the dummy arcs & nodes
                this.generateAdjacentNodeMaps();
            }
        }
    }

    private addDummyNodeAndArcs(
        index: number,
        layer: Node[],
        from: Node,
        to: Node,
    ) {
        // console.log('[Vertex Ordering]: Create dummy for  ' , from, 'to: ', to);
        const dummy = new DummyNode(
            new Point(1, 1),
            `dummyNode-${index}`,
            `DummyNode ${index}`,
        );
        layer.push(dummy);

        // Remove original arc
        const arcIndex = this._arcs.findIndex((arc) =>
            arc.equals(new Arc(from, to)),
        );
        const weight = this._arcs[arcIndex].weight;
        this._arcs.splice(arcIndex, 1);

        // Instead add two arc sections to and from the dummy node
        this._arcs.push(new Arc(from, dummy, weight));
        this._arcs.push(new Arc(dummy, to, weight));
    }

    private findLayerIdForNode(node: Node): number {
        for (const [layerId, nodes] of this._layers.entries()) {
            if (nodes.includes(node)) return layerId;
        }
        return 0;
    }

    private generateAdjacentNodeMaps() {
        this._nodeInputIdMap.clear();
        this._nodeOutputIdMap.clear();

        this._arcs.forEach((arc) => {
            if (this._nodeInputIdMap.get(arc.to.id)) {
                this._nodeInputIdMap.get(arc.to.id)?.push(arc.from);
            } else {
                this._nodeInputIdMap.set(arc.to.id, [arc.from]);
            }

            if (this._nodeOutputIdMap.get(arc.from.id)) {
                this._nodeOutputIdMap.get(arc.from.id)?.push(arc.to);
            } else {
                this._nodeOutputIdMap.set(arc.from.id, [arc.to]);
            }
        });
    }
}
