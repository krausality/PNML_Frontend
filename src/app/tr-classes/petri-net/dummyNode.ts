import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Point } from './point';

export class DummyNode implements Node {
    position: Point;
    id: string;
    label?: string;

    constructor(position: Point, id: string, label?: string) {
        this.position = position;
        this.id = id;
        this.label = label;
    }

    // Has to be implemented but is irrelevant for dummy nodes
    intersectionOfBoundaryWithLineTo(p: Point): Point {
        return this.position;
    }

    // Has to be implemented but is irrelevant for dummy nodes
    pLiesOutsideNodeShapeBoudary(p: Point): boolean {
        return true;
    }
}
