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

        // angle of the line segment from this.position to p with the x-axis
        let alpha = Math.atan2((p.y - m.y), (p.x - m.x));

        // angles of diagonal line segments from the center of the node rectangle to its four corners with respect to the x-axis.
        let beta1 = Math.atan2(height, width);   // 1: center --> top right corner
        let beta2 = Math.atan2(height, -width);  // 2: center --> top left corner
        let beta3 = Math.atan2(-height, width);  // 3: center --> bottom left corner
        let beta4 = Math.atan2(-height, -width); // 4: center --> bottom right corner

        if (beta1 < alpha && alpha <= beta2){
            // intersection with top side
            yIntersect = m.y + height/2;
            xIntersect = m.x + (height/2) / Math.tan(alpha);
        } else if (beta3 < alpha && alpha <= beta4){
            // intersection with bottom side
            yIntersect = m.y - height/2;
            xIntersect = m.x - (height/2) / Math.tan(alpha);
        }else if (beta4 < alpha && alpha <= beta1) {
            // intersection with right side
            xIntersect = m.x + width/2;
            yIntersect = m.y + Math.tan(alpha) * width/2;
        } else {
            // intersection with left side
            xIntersect = m.x - width/2;
            yIntersect = m.y - Math.tan(alpha) * width/2;
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

