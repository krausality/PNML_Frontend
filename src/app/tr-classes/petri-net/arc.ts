import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Point } from "./point";
import { Place } from "./place";
import { Transition } from "./transition";

export class Arc {
    from: Node;
    to: Node;
    weight: number;
    anchors: Point[];

    constructor(from: Node, to: Node, weight: number = 1, anchors: Point[] = []){
        // if (typeof from === typeof to){
        //     throw new Error("Mach mal nicht!");
        // }
        this.from = from;
        this.to = to;
        this.anchors = anchors;
        if (from instanceof Place) {
            this.weight = -1 * Math.abs(weight);
        } else {
            this.weight = Math.abs(weight);
        }
    }

    get polyLinePoints(): string {
        // ToDo: the application should make sure that no anchor points lie
        // within the boundaries of the shapes associated with the from and
        // to nodes

        let start: Point;
        let end: Point;

        // Determine start point of the line
        const pForStartCalc: Point = [...this.anchors, this.to.position][0];
        if (this.from.pLiesOutsideNodeShapeBoudary(pForStartCalc)){
            start = this.from.intersectionOfBoundaryWithLineTo(pForStartCalc);
        } else {
            // Fall back solution: if pForStartCalc lies within the boundaries
            // of the shape, the start for the line is given as the center
            // of the from-node --> a graphical representation of the petri-net
            // can still be produced, even though the layout may not (yet) be
            // optimal (e.g. somewhat overlapping nodes)
            start = this.from.position;
        }

        // Determine end point of the line
        const anchorsPlusFrom: Point[] = [this.from.position, ...this.anchors]
        const pForEndCalc: Point = anchorsPlusFrom[anchorsPlusFrom.length - 1]
        if (this.to.pLiesOutsideNodeShapeBoudary(pForEndCalc)){
            end = this.to.intersectionOfBoundaryWithLineTo(pForEndCalc);
        } else {
            // Fall back solution as above
            end = this.to.position;
        }

        return this.pointArrayToString([start, ...this.anchors, end]);
    }

    private pointArrayToString(points: Point[]): string {
        let s = '';
        for (let point of points){
          s = s + point.x + ',' + point.y + ' ';
        }
        return s;
    }

    appendSelfToTransition() {
        if (this.from instanceof Transition) {
            (this.from as Transition).appendPostArc(this);
        } else {
            (this.to as Transition).appendPreArc(this);
        }
    }

    resetAnchors() {
        this.anchors = [];
    }
    
    equals(arc: Arc): boolean {
        return this.from === arc.from
            && this.to === arc.to;
    }
}
