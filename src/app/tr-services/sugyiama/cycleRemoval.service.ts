import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Arc } from "src/app/tr-classes/petri-net/arc";

/** 
 * Cycle removal service
 *
 * Loops through a graph and performs a depth first search on each node.
 * If a node is found that is already on stack a cycle has been identified.
 * To remove the cycle, one its edges are removed and replaced with a 
 * reversed arc.
 * 
 * The arcs array is modified in place.
 * Reversed arcs are kept in memory (arcsToBeReversed) for re-reversal later on.
 * 
 */
export class CycleRemovalService {
    // Initial set of nodes and arcs
    private _nodes: Node[] = [];
    private _arcs: Arc[] = [];

    // Uitility variables
    private _stack: Node[] = [];
    private _visited: Node[] = [];

    private _arcsToBeReversed: Arc[] = [];

    constructor(
        nodes: Node[],
        arcs: Arc[],
    ) {
        this._nodes = nodes;
        this._arcs = arcs;
    }

    removeCycles() {
        // Find cycles
        for (let node of this._nodes) {
            this.depthFirstSearchRemove(node);
        }
        // Reverse arcs 
        this.reverseArcs();
    }
 
    depthFirstSearchRemove(node: Node) {
        if (this._visited.includes(node)) {
            return;
        }
        this._visited.push(node);
        this._stack.push(node);

        const postArcs = this.getPostArcsForNode(node);
        for (let arc of postArcs) {
            if (this._stack.includes(arc.to)) {
                this._arcsToBeReversed.push(arc);
                // TODO: Check if it's possibly that a petrinet contains two arcs
                // leading from and to the same node ?
            } else if (!this._visited.includes(arc.to)) {
                this.depthFirstSearchRemove(arc.to);
            }
        }
        this._stack.pop();
    }

    // Change the direction of the arcs to eliminate circles
    reverseArcs() {
        for (let arc of this._arcsToBeReversed) {
            // Remove original arc
            const index = this._arcs.indexOf(arc);
            this._arcs.splice(index, 1);

            // Reverse & add arc
            const newTo = arc.from;
            const newFrom = arc.to;
            arc.to = newTo;
            arc.from = newFrom;

            this._arcs.push(arc);
        }
    }

    getPostArcsForNode(node: Node): Arc[] {
        return this._arcs.filter((arc) => arc.from === node);
    }
}