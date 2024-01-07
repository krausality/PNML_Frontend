import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Point } from './point';
import { Arc } from './arc';
import { Place } from './place';
import {
    transitionWidth,
    transitionHeight,
    transSilentWidth,
} from 'src/app/tr-services/position.constants';

export class Transition implements Node {
    position: Point;
    id: string;
    label?: string;
    preArcs: Arc[] = [];
    postArcs: Arc[] = [];

    constructor(position: Point, id: string, label?: string) {
        this.position = position;
        this.id = id;
        this.label = label;
    }

    intersectionOfBoundaryWithLineTo(p: Point): Point {
        const width = this.label ? transitionWidth : transSilentWidth;
        const height = transitionHeight;

        if (!this.pLiesOutsideNodeShapeBoudary(p)) {
            throw new Error(
                'Point p for calculating intersection with node shape must lie outside of the node shape boundary.',
            );
        }

        const m = this.position;
        let xIntersect: number;
        let yIntersect: number;

        // angle of the line segment from this.position to p with the x-axis
        let alpha = Math.atan2(p.y - m.y, p.x - m.x);

        // angles of diagonal line segments from the center of the node rectangle to its four corners with respect to the x-axis.
        let beta1 = Math.atan2(height, width); // 1: center --> top right corner
        let beta2 = Math.atan2(height, -width); // 2: center --> top left corner
        let beta3 = Math.atan2(-height, -width); // 3: center --> bottom left corner
        let beta4 = Math.atan2(-height, width); // 4: center --> bottom right corner

        if (beta1 < alpha && alpha <= beta2) {
            // intersection with top side
            yIntersect = m.y + height / 2;
            xIntersect = m.x + height / 2 / Math.tan(alpha);
        } else if (beta3 < alpha && alpha <= beta4) {
            // intersection with bottom side
            yIntersect = m.y - height / 2;
            xIntersect = m.x - height / 2 / Math.tan(alpha);
        } else if (beta4 < alpha && alpha <= beta1) {
            // intersection with right side
            xIntersect = m.x + width / 2;
            yIntersect = m.y + (Math.tan(alpha) * width) / 2;
        } else {
            // intersection with left side
            xIntersect = m.x - width / 2;
            yIntersect = m.y - (Math.tan(alpha) * width) / 2;
        }

        return new Point(xIntersect, yIntersect);
    }

    pLiesOutsideNodeShapeBoudary(p: Point): boolean {
        let width = transitionWidth;
        let height = transitionHeight;

        const absDx = Math.abs(p.x - this.position.x);
        const absDy = Math.abs(p.y - this.position.y);

        return absDx > width / 2 || absDy > height / 2;
    }

    get isActive(): boolean {
        for (let preArc of this.preArcs) {
            if ((preArc.from as Place).token + preArc.weight < 0) {
                return false;
            }
        }
        return true;
    }

    appendPreArc(arc: Arc) {
        this.preArcs.push(arc);
    }

    appendPostArc(arc: Arc) {
        this.postArcs.push(arc);
    }

    getPreArcs() {
        return this.preArcs;
    }

    getPostArcs() {
        return this.postArcs;
    }
}
