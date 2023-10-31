import { Node } from "src/app/tr-interfaces/petri-net/node";
import { Point } from "./point";
import { booleanAttribute } from "@angular/core";
import { Arc } from "./arc";
import { Place } from "./place";

export class Transition implements Node {
    position: Point;
    id: string;
    label?: string;
    preArcs: Arc[] = [];
    postArcs: Arc[] = [];

    constructor(position: Point, id: string, label?: string){
        this.position = position;
        this.id = id;
        this.label = label;
    }

    get isActive(): boolean{
        if (this.preArcs.length === 0) return false;
        for (let preArc of this.preArcs) {
            if ((preArc.from as Place).token + preArc.weight < 0) {
                return false;
            }
        }
        return true;
    }

    appendPreArc(arc: Arc){
        this.preArcs.push(arc);
    }

    appendPostArc(arc: Arc){
        this.postArcs.push(arc);
    }
}

