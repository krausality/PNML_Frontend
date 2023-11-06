import { Point } from "src/app/tr-classes/petri-net/point";

export interface Node {
    position: Point;
    id: string;
    label?: string;

    // Returns the intersection of the line segment between this.position and p
    // with the boundary of the geometric shape of the node. If p doesn't lie
    // outside the shape boundary, an Error is thrown.
    intersectionOfBoundaryWithLineTo(p: Point) : Point;

    // Returns true, if Point p lies outside of the node shape boundary
    pLiesOutsideNodeShapeBoudary(p: Point): boolean;
}
