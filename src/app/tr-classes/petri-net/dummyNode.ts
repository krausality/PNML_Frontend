/**
 * @file dummyNode.ts
 * @description This file defines the DummyNode class, representing a temporary node used during arc creation in the Petri net editor.
 * It implements the Node interface and serves as a placeholder, for example, for the target of an arc that is currently being drawn.
 * It is not a functional part of the Petri net itself but aids in the UI interactions.
 */

import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Point } from './point';

export class DummyNode implements Node {
    position: Point;
    id: string;
    label?: string;

    constructor(position: Point, id: string, label?: string) {
        this.position = position;
        this.id = id;
        this.label = label;
    }

    // Has to be implemented but is irrelevant for dummy nodes
    intersectionOfBoundaryWithLineTo(p: Point): Point {
        return this.position;
    }

    // Has to be implemented but is irrelevant for dummy nodes
    pLiesOutsideNodeShapeBoudary(p: Point): boolean {
        return true;
    }
}
