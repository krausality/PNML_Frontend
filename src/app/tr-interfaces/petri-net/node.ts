import { Point } from "src/app/tr-classes/petri-net/point";

export interface Node {
    position: Point;
    id: string;
    label?: string;

    // Returns the intersection of the line between this.position and p
    // with the boundary of the geometric shape associated with the
    // node (Place --> circle, Transition --> square or rectangle)
    intersectionOfBoundaryWithLineTo(p: Point) : Point;
}
