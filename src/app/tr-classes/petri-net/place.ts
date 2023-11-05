import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Point } from "./point";

export class Place implements Node {
    token: number;
    position: Point;
    id: string;
    label?: string;

    constructor(token: number, position: Point, id: string, label?: string) {
        this.token = token;
        this.position = position;
        this.id = id;
        this.label = label;
    }

    intersectionOfBoundaryWithLineTo(p: Point): Point {
        // ToDo: replace hard coded value with value from graphics data service
        const r = 25;

        const m = this.position;
        const d = Math.sqrt((p.x - m.x) ** 2 + (p.y - m.y) ** 2);

        if (d == 0) {
            // d == 0 (i.e. p == this.position) should not occur!!!
            // Return node position as fall back value, so that arcs could
            // still be drawn (then to the center of the node instead of the boundary).
            return (this.position);
        }

        const sinAlpha = (p.y - m.y) / d;
        const cosAlpha = (p.x - m.x) / d;
        const yIntersect = m.y + r * sinAlpha;
        const xIntersect = m.x + r * cosAlpha;
        return new Point(xIntersect, yIntersect);
    }
}
