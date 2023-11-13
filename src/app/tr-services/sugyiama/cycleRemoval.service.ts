import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Arc } from "src/app/tr-classes/petri-net/arc";
import { Transition } from "src/app/tr-classes/petri-net/transition";

export class CycleRemovalService {
    // Initial set of nodes and arcs
    private _nodes: Set<Node> = new Set<Node>();
    private _arcs: Arc[] = [];

    private _stack: Set<Node> = new Set<Node>();
    private _visited: Set<Node> = new Set<Node>();

    private _arcsToBeReversed: Arc[] = [];

    constructor(
        nodes: Set<Node>,
        arcs: Arc[],
    ) {
        this._nodes = nodes;
        this._arcs = arcs;
    }

    removeCycles() {
        // Get and remove arcs that lead to circle
        for (let node of this._nodes) {
            this.depthFirstSearchRemove(node);
        }
        // Reverse arcs that need reversing
        this.reverseArcs();
        console.log('[Sugyiama Layout:] Arcs to be reversed: ', this._arcsToBeReversed);

        // Add reversed arcs
        this._arcs = this._arcs.concat(this._arcsToBeReversed);
        console.log('[Sugyiama Layout:] Nodes & Arcs after removal of cycles', this._nodes, this._arcs);
    }
 
    depthFirstSearchRemove(node: Node) {
        if (this._visited.has(node)) {
            return;
        }
        this._visited.add(node);
        this._stack.add(node);

        for (let arc of this.getPostArcsForNode(node)) {
            if (this._stack.has(arc.to)) {
                this._arcsToBeReversed.push(arc);
                // TODO: Check if it's possibly that a petrinet contains two arcs
                // leading from and to the same node ?
                this._arcs = this._arcs.filter(
                    (a) => !(a.from.id === arc.from.id && a.to.id === arc.to.id)
                );
            } else if (!this._visited.has(arc.to)) {
                this.depthFirstSearchRemove(arc.to);
            }
        }

        this._stack.delete(node);
    }

    // Change the direction of the arcs in the arcs to reverse array
    // original arcs array is not touched, as we do not want to modify
    // the original data structure
    reverseArcs() {
        for (let arc of this._arcsToBeReversed) {
            const newTo = arc.from;
            const newFrom = arc.to;

            arc.to = newTo;
            arc.from = newFrom;
        }
    }

    getPostArcsForNode(node: Node) {
        if (node instanceof Transition) {
            return node.getPostArcs();
        } else {
            return this._arcs.filter((arc) => arc.from === node);
        }
    }
}