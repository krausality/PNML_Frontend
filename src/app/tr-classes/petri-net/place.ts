import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Point } from "./point";
import { radius } from "src/app/tr-services/position.constants";

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
        const r = radius;

        if (! this.pLiesOutsideNodeShapeBoudary(p)){
            throw new Error('Point p for calculating intersection with node shape must lie outside of the node shape boundary.')
        }

        const m = this.position;
        const d = Math.sqrt((p.x - m.x) ** 2 + (p.y - m.y) ** 2);

        const sinAlpha = (p.y - m.y) / d;
        const cosAlpha = (p.x - m.x) / d;
        const yIntersect = m.y + r * sinAlpha;
        const xIntersect = m.x + r * cosAlpha;
        return new Point(xIntersect, yIntersect);
    }

    pLiesOutsideNodeShapeBoudary(p: Point): boolean {
        const d = Math.sqrt((p.x - this.position.x)**2 + (p.y - this.position.y)**2);
        return d > radius;
    };
}
