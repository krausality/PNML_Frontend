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

    intersectionOfBoundaryWithLineTo(p: Point): Point {
        // Note: in the case of this.position == p (which should not
        // occur), the alpha value given by Math.atan2 is 0. Thus, an
        // intersection point with the left side will be given.

        // ToDo: replace hard coded values with values from graphics data service
        const width = 50;
        const height = 50;

        const m = this.position;
        let xIntersect: number;
        let yIntersect: number;

        let alpha = Math.atan2((p.y - m.y), (p.x - m.x));
        alpha = alpha < 0 ? alpha + 2 * Math.PI : alpha;


        if (0.25 * Math.PI < alpha && alpha <= 0.75 * Math.PI){
            // intersection with top side
            yIntersect = m.y + height/2;
            xIntersect = m.x - Math.tan(alpha - Math.PI / 2) * height/2
        } else if (1.25 * Math.PI < alpha && alpha <= 1.75 * Math.PI){
            // intersection with bottom side
            yIntersect = m.y - height/2;
            xIntersect = m.x + Math.tan(alpha + 0.5 * Math.PI) * height/2
        }else if (0.75 * Math.PI < alpha && alpha <= 1.25 * Math.PI){
            // intersection with left side
            xIntersect = m.x - width/2;
            yIntersect = m.y + Math.tan(Math.PI - alpha) * (m.x - xIntersect);
        }else {
            // intersection with right side
            xIntersect = m.x + width/2;
            yIntersect = m.y + Math.tan(alpha) * (xIntersect - m.x);
        }

        return new Point(xIntersect, yIntersect);
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

