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
    // keeps track of all nodes in the current branch
    private _stack: Node[] = [];
    // keeps track of all nodes that have been visited in the whole run
    private _visited: Node[] = [];

    // Saves arcs that are reversed to be able to re-reverse them later
    private _arcsToBeReversed: Arc[] = [];

    constructor(
        nodes: Node[],
        arcs: Arc[],
    ) {
        this._nodes = nodes;
        this._arcs = arcs;
    }

    removeCycles() {
        // Find cycles and assign one arc of each
        // circle to arcsToBeReversed
        for (let node of this._nodes) {
            this.depthFirstSearchRemove(node);
        }
        // Reverse arcs 
        this.reverseArcs();
    }
 
    private depthFirstSearchRemove(node: Node) {
        if (this._visited.includes(node)) {
            return;
        }
        
        this._visited.push(node);
        this._stack.push(node);

        const postArcs = this.getPostArcsForNode(node);
        for (let arc of postArcs) {
            if (this._stack.includes(arc.to)) {
                // If the node is already included in the stack
                // this must be a circle and the arc needs to be reversed
                this._arcsToBeReversed.push(arc);
                // TODO: Check if it's possibly that a petrinet contains two arcs
                // leading from and to the same node ? or at least if our data structure
                // allows that
            } else if (!this._visited.includes(arc.to)) {
                // if this arc has not been visited before continue the dfs search
                // starting with the arcs target node
                this.depthFirstSearchRemove(arc.to);
            }
        }
        this._stack.pop();
    }

    // Changes the direction of the arcs to eliminate circles
    // needs to be public as it needs to be called again from
    // the main class to return arcs to original states
    reverseArcs() {
        for (let arc of this._arcsToBeReversed) {
            // since we're working with references it's enough
            // to just update the arcs to & from nodes
            const newTo = arc.from;
            const newFrom = arc.to;
            arc.to = newTo;
            arc.from = newFrom;
        }
    }

    private getPostArcsForNode(node: Node): Arc[] {
        return this._arcs.filter((arc) => arc.from === node);
    }
}