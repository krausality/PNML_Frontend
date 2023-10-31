import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Point } from "./point";

export class Place implements Node {
    token: number;
    position: Point;
    id: string;
    label?: string;

    constructor(token: number, position: Point, id: string, label?: string){
        this.token = token;
        this.position = position;
        this.id = id;
        this.label = label;
    }
}
