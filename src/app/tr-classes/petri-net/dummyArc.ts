import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Point } from './point';
import { Place } from './place';
import { Transition } from './transition';

export class DummyArc {
    points: Point[] = [];

    constructor() {}

    get polyLinePoints(): string {
        return this.pointArrayToString(this.points);
    }

    pointArrayToString(points: Point[]): string {
        let s = '';
        for (let point of points) {
            s = s + point.x + ',' + point.y + ' ';
        }
        return s;
    }
}
