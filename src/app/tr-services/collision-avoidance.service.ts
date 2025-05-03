import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { Node } from '../tr-interfaces/petri-net/node';
import { Place } from '../tr-classes/petri-net/place';
import { Transition } from '../tr-classes/petri-net/transition';
import { Arc } from '../tr-classes/petri-net/arc';
import { Point } from '../tr-classes/petri-net/point';
import {
    transitionHeight,
    transitionWidth,
    transSilentWidth,
} from './position.constants';

const ARC_AVOIDANCE_OFFSET = 20;
const MAX_AVOIDANCE_ITERATIONS = 10;

interface Rect { x: number; y: number; width: number; height: number; }

// Define a type for the collision information
type CollisionInfo = {
    transition: Transition;
    anchor: Point;
} | null; // Allow null when no collision is found

@Injectable({
    providedIn: 'root',
})
export class CollisionAvoidanceService {
    constructor(private dataService: DataService) {}

    runChecksAndCorrections(): boolean {
        const arcs = this.dataService.getArcs();
        const transitions = this.dataService.getTransitions();
        let overallChangesMade = false;

        for (const arc of arcs) {
            const manualAnchors = arc.anchors.filter(a => !a.isAutomatic);
            const oldAutomaticAnchors = arc.anchors.filter(a => a.isAutomatic);

            // Temporarily set anchors to manual ones for calculation
            arc.anchors = [...manualAnchors];
            const newAutomaticAnchors = this.calculateNeededAutomaticAnchors(arc, transitions);

            // Combine manual and NEW automatic anchors
            const combinedAnchors = [...manualAnchors, ...newAutomaticAnchors];

            // Sort combined anchors geometrically
            const sortedCombinedAnchors = this.sortAnchorsGeometrically(arc.from.position, arc.to.position, combinedAnchors);

            // Assign sorted anchors and mark automatic ones
            const finalAnchors: Point[] = [];
            const addedAutomaticCoords = new Set<string>(); // To track added automatic anchors by coordinate string
            newAutomaticAnchors.forEach(p => addedAutomaticCoords.add(`${p.x.toFixed(3)},${p.y.toFixed(3)}`));

            for (const anchor of sortedCombinedAnchors) {
                const coordKey = `${anchor.x.toFixed(3)},${anchor.y.toFixed(3)}`;
                // Check if this anchor was one of the newly calculated automatic ones
                const isNewAutomatic = addedAutomaticCoords.has(coordKey);
                // Create a new Point to avoid modifying original manual anchors' flags
                finalAnchors.push(new Point(anchor.x, anchor.y, anchor.isAutomatic || isNewAutomatic));
            }
            arc.anchors = finalAnchors;

            // Check for changes
            const currentAutomaticAnchors = arc.anchors.filter(a => a.isAutomatic);
            if (this.didAnchorsChange(oldAutomaticAnchors, currentAutomaticAnchors)) {
                overallChangesMade = true;
                console.debug(`Arc ${arc.id}: Automatic anchors changed.`);
            }
        }
        return overallChangesMade;
    }

    /**
     * Vergleicht zwei Listen von Ankerpunkten auf signifikante Unterschiede.
     */
    private didAnchorsChange(oldAnchors: Point[], newAnchors: Point[]): boolean {
        if (oldAnchors.length !== newAnchors.length) {
            return true;
        }
        // Sort both arrays by coordinates to compare regardless of original order
        const sortFn = (a: Point, b: Point) => a.x !== b.x ? a.x - b.x : a.y - b.y;
        const sortedOld = [...oldAnchors].sort(sortFn);
        const sortedNew = [...newAnchors].sort(sortFn);

        for (let i = 0; i < sortedOld.length; i++) {
            if (Math.abs(sortedOld[i].x - sortedNew[i].x) > 0.1 || Math.abs(sortedOld[i].y - sortedNew[i].y) > 0.1) {
                return true; // Significant position difference
            }
        }
        return false;
    }

    /**
     * Berechnet iterativ die benötigten automatischen Ankerpunkte.
     */
    private calculateNeededAutomaticAnchors(arc: Arc, transitions: Transition[]): Point[] {
        let finalNeededAnchors: Point[] = [];
        let currentSortedAnchors = [...arc.anchors]; // Start with manual anchors (already filtered in caller)
        let iterations = 0;
        let collisionFoundInIteration: boolean;

        do {
            collisionFoundInIteration = false;
            iterations++;
            // Get polyline based on current sorted state (manual + anchors found in previous iterations)
            const currentPoints = this.getPolylinePointsArray(arc.from, arc.to, currentSortedAnchors);
            let anchorsToAddInThisIteration : Point[] = [];

            for (let i = 0; i < currentPoints.length - 1; i++) {
                const segmentStart = currentPoints[i];
                const segmentEnd = currentPoints[i + 1];

                // Explicitly type closestCollision using the defined CollisionInfo type
                let closestCollision: CollisionInfo = null;
                let minDistanceSq = Infinity;

                for (const transition of transitions) {
                    if (arc.from === transition || arc.to === transition) continue;

                    if (this.doesLineSegmentIntersectTransition(segmentStart, segmentEnd, transition)) {
                        const potentialAnchor = this.calculateAvoidanceAnchor(segmentStart, segmentEnd, transition);
                        const midPoint = new Point((segmentStart.x + segmentEnd.x) / 2, (segmentStart.y + segmentEnd.y) / 2);
                        const distSq = (transition.position.x - midPoint.x)**2 + (transition.position.y - midPoint.y)**2;

                        // Check if too close to any anchor considered so far (manual + already needed + to add in this iter)
                        const allConsideredAnchors = [...arc.anchors, ...finalNeededAnchors, ...anchorsToAddInThisIteration];
                        const tooCloseToExisting = allConsideredAnchors.some(existing =>
                            (existing.x - potentialAnchor.x)**2 + (existing.y - potentialAnchor.y)**2 < (ARC_AVOIDANCE_OFFSET / 2)**2
                        );

                        if (!tooCloseToExisting && distSq < minDistanceSq) {
                            minDistanceSq = distSq;
                            // Assign the object matching the CollisionInfo type
                            closestCollision = { transition: transition, anchor: potentialAnchor };
                        }
                    }
                }

                // Check if closestCollision is not null before accessing its properties
                if (closestCollision) {
                    // Avoid adding exact duplicates within the same overall calculation run
                    // Use non-null assertion (!) as we checked closestCollision is not null
                    const alreadyNeeded = finalNeededAnchors.some(a =>
                        Math.abs(a.x - closestCollision!.anchor.x) < 0.1 && Math.abs(a.y - closestCollision!.anchor.y) < 0.1
                    );
                    if (!alreadyNeeded) {
                        anchorsToAddInThisIteration.push(closestCollision.anchor);
                        collisionFoundInIteration = true;
                    }
                }
            } // End segment loop

            // If anchors were added in this iteration, update the lists for the next iteration
            if (collisionFoundInIteration) {
                finalNeededAnchors.push(...anchorsToAddInThisIteration);
                // Re-sort all anchors (manual + all automatic found so far) for the next iteration's path check
                currentSortedAnchors = this.sortAnchorsGeometrically(arc.from.position, arc.to.position, [...arc.anchors, ...finalNeededAnchors]);
            }

        } while (collisionFoundInIteration && iterations < MAX_AVOIDANCE_ITERATIONS);

        if (iterations >= MAX_AVOIDANCE_ITERATIONS) {
            console.warn(`Maximale Iterationen (${MAX_AVOIDANCE_ITERATIONS}) für Bogen ${arc.id} bei Neuberechnung erreicht.`);
        }

        return finalNeededAnchors;
    }

    /**
     * Sorts anchor points geometrically along the line from start to end.
     */
    private sortAnchorsGeometrically(startPoint: Point, endPoint: Point, anchors: Point[]): Point[] {
        if (anchors.length === 0) {
            return [];
        }
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const magSq = dx * dx + dy * dy;

        if (magSq < 1e-10) {
            return [...anchors].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
        }

        const projections = anchors.map(anchor => {
            const dotProduct = ((anchor.x - startPoint.x) * dx + (anchor.y - startPoint.y) * dy) / magSq;
            return { anchor, projection: dotProduct };
        });
        projections.sort((a, b) => a.projection - b.projection);
        return projections.map(p => p.anchor);
    }

    /**
     * Generates the polyline points array including start/end intersections.
     * Assumes Node interface has `intersectionOfBoundaryWithLineTo` and `pLiesOutsideNodeShapeBoudary`.
     * If not, this needs adaptation or those methods need to be added to nodes.
     */
    private getPolylinePointsArray(fromNode: Node, toNode: Node, anchors: Point[]): Point[] {
        let start: Point;
        let end: Point;
        const pForStartCalc: Point = anchors.length > 0 ? anchors[0] : toNode.position;

        // Check if methods exist before calling - basic type guard
        const fromNodeWithBounds = fromNode as Node & { intersectionOfBoundaryWithLineTo?: (p: Point) => Point, pLiesOutsideNodeShapeBoudary?: (p: Point) => boolean };
        const toNodeWithBounds = toNode as Node & { intersectionOfBoundaryWithLineTo?: (p: Point) => Point, pLiesOutsideNodeShapeBoudary?: (p: Point) => boolean };

        if (fromNodeWithBounds.pLiesOutsideNodeShapeBoudary && fromNodeWithBounds.intersectionOfBoundaryWithLineTo) {
            if (fromNodeWithBounds.pLiesOutsideNodeShapeBoudary(pForStartCalc)) {
                start = fromNodeWithBounds.intersectionOfBoundaryWithLineTo(pForStartCalc);
            } else {
                start = fromNode.position;
            }
        } else {
            start = fromNode.position; // Fallback
            // console.warn(`Node ${fromNode.id} missing boundary methods for polyline calculation.`);
        }

        const pForEndCalc: Point = anchors.length > 0 ? anchors[anchors.length - 1] : fromNode.position;
        if (toNodeWithBounds.pLiesOutsideNodeShapeBoudary && toNodeWithBounds.intersectionOfBoundaryWithLineTo) {
            if (toNodeWithBounds.pLiesOutsideNodeShapeBoudary(pForEndCalc)) {
                end = toNodeWithBounds.intersectionOfBoundaryWithLineTo(pForEndCalc);
            } else {
                end = toNode.position;
            }
        } else {
            end = toNode.position; // Fallback
            // console.warn(`Node ${toNode.id} missing boundary methods for polyline calculation.`);
        }
        return [start, ...anchors, end];
   }

    // --- Existing helper functions (unchanged) ---
    // doesLineSegmentIntersectTransition, lineIntersectsRect, lineSegmentsIntersect, calculateAvoidanceAnchor
    // ... existing code ...

    /**
     * Prüft, ob ein Liniensegment die Bounding Box einer Transition schneidet.
     */
    private doesLineSegmentIntersectTransition(
        p1: Point,
        p2: Point,
        t: Transition,
    ): boolean {
        // ... existing code ...
        const tWidth = t.label ? transitionWidth : transSilentWidth;
        const tHeight = transitionHeight;
        const tx = t.position.x;
        const ty = t.position.y;
        const rect: Rect = {
            x: tx - tWidth / 2,
            y: ty - tHeight / 2,
            width: tWidth,
            height: tHeight,
        };
        return this.lineIntersectsRect(p1, p2, rect);
    }

     /**
     * ECHTE Liniensegment-Rechteck-Intersektionsprüfung.
     */
    private lineIntersectsRect(p1: Point, p2: Point, rect: Rect): boolean {
        // ... existing code ...
        const isP1Inside = p1.x >= rect.x && p1.x <= rect.x + rect.width &&
                           p1.y >= rect.y && p1.y <= rect.y + rect.height;
        const isP2Inside = p2.x >= rect.x && p2.x <= rect.x + rect.width &&
                           p2.y >= rect.y && p2.y <= rect.y + rect.height;
        if (isP1Inside && isP2Inside) return true;
        if (isP1Inside || isP2Inside) return true;
        const rLeft = rect.x;
        const rRight = rect.x + rect.width;
        const rTop = rect.y;
        const rBottom = rect.y + rect.height;
        const topLeft = new Point(rLeft, rTop);
        const topRight = new Point(rRight, rTop);
        const bottomLeft = new Point(rLeft, rBottom);
        const bottomRight = new Point(rRight, rBottom);
        if (this.lineSegmentsIntersect(p1, p2, topLeft, topRight)) return true;
        if (this.lineSegmentsIntersect(p1, p2, topRight, bottomRight)) return true;
        if (this.lineSegmentsIntersect(p1, p2, bottomRight, bottomLeft)) return true;
        if (this.lineSegmentsIntersect(p1, p2, bottomLeft, topLeft)) return true;
        return false;
    }

    /**
     * Prüft, ob sich zwei Liniensegmente schneiden.
     */
    private lineSegmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
        // ... existing code ...
        function orientation(p: Point, q: Point, r: Point): number {
            const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
            if (Math.abs(val) < 1e-10) return 0;
            return val > 0 ? 1 : 2;
        }
        function onSegment(p: Point, q: Point, r: Point): boolean {
            const tolerance = 1e-10;
            return (
                q.x <= Math.max(p.x, r.x) + tolerance &&
                q.x >= Math.min(p.x, r.x) - tolerance &&
                q.y <= Math.max(p.y, r.y) + tolerance &&
                q.y >= Math.min(p.y, r.y) - tolerance
            );
        }
        const o1 = orientation(p1, p2, p3);
        const o2 = orientation(p1, p2, p4);
        const o3 = orientation(p3, p4, p1);
        const o4 = orientation(p3, p4, p2);
        if (o1 !== o2 && o3 !== o4) return true;
        if (o1 === 0 && onSegment(p1, p3, p2)) return true;
        if (o2 === 0 && onSegment(p1, p4, p2)) return true;
        if (o3 === 0 && onSegment(p3, p1, p4)) return true;
        if (o4 === 0 && onSegment(p3, p2, p4)) return true;
        return false;
    }


    /**
     * Berechnet einen neuen Ankerpunkt, um die Kollision zu vermeiden.
     */
    private calculateAvoidanceAnchor(
        p1: Point,
        p2: Point,
        collidingTransition: Transition,
    ): Point {
        // ... existing code ...
        const midPoint = new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        let nx = -dy;
        let ny = dx;
        const length = Math.sqrt(nx * nx + ny * ny);
        if (length > 1e-10) {
            nx /= length;
            ny /= length;
        } else {
            nx = 0;
            ny = 1;
        }
        const transitionCenter = collidingTransition.position;
        const vectorToTransition = new Point(
            transitionCenter.x - midPoint.x,
            transitionCenter.y - midPoint.y,
        );
        if (nx * vectorToTransition.x + ny * vectorToTransition.y > 0) {
            nx = -nx;
            ny = -ny;
        }
        const newAnchor = new Point(
            midPoint.x + nx * ARC_AVOIDANCE_OFFSET,
            midPoint.y + ny * ARC_AVOIDANCE_OFFSET,
            // false // isAutomatic wird in runChecksAndCorrections gesetzt
        );
        // console.debug(`Kollision vermieden: Neuer Anker berechnet bei ${newAnchor.x.toFixed(1)},${newAnchor.y.toFixed(1)}`);
        return newAnchor;
    }
}
