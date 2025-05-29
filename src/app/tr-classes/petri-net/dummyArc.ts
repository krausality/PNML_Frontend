/**
 * @file dummyArc.ts
 * @description This file defines the DummyArc class, representing a temporary arc used during arc creation in the Petri net editor.
 * It implements the Arc interface and is used to provide visual feedback to the user while they are drawing an arc.
 * Once the arc creation is complete, the DummyArc is typically replaced by a regular Arc.
 */

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
