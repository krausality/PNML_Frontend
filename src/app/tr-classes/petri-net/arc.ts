import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Point } from "./point";
import { Place } from "./place";

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
        return this.pointArrayToString([this.from.position, ...this.anchors, this.to.position]); // shallow copy
    }

    private pointArrayToString(points: Point[]): string {
        let s = '';
        for (let point of points){
          s = s + point.x + ',' + point.y + ' ';
        }
        return s;
    }
}
