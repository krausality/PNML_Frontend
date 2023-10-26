import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Point } from "./point";
import { booleanAttribute } from "@angular/core";
import { Arc } from "./arc";

export class Transition implements Node {
    position: Point;
    id: string;
    label?: string;
    preAcrs: Arc[] = [];
    postArcs: Arc[] = [];

    constructor(position: Point, id: string, label?: string){
        this.position = position;
        this.id = id;
        this.label = label;
    }

    get isActive(): boolean{
        return true;
    }

    appendPreArc(arc: Arc){
        this.preAcrs.push(arc);
    }

    appendPostArc(arc: Arc){
        this.postArcs.push(arc);
    }
}

