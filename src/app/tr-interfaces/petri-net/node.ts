import { Point } from "src/app/tr-classes/petri-net/point";

export interface Node {
    position: Point;
    id: string;
    label?: string;
}
