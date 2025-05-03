import { Injectable } from '@angular/core';
import { Point } from '../tr-classes/petri-net/point';
import { Arc } from '../tr-classes/petri-net/arc';
import { Node } from '../tr-interfaces/petri-net/node';
import { DataService } from './data.service';
import { UiService } from './ui.service';
import { ButtonState } from '../tr-enums/ui-state';
import { SvgCoordinatesService } from './svg-coordinates-service';
import { CollisionAvoidanceService } from './collision-avoidance.service';
import { ZoomService } from './zoom.service'; // Import ZoomService

@Injectable({
    providedIn: 'root',
})
export class EditMoveElementsService {
    // Mouse position before next drag step
    initialMousePos: Point = { x: 0, y: 0 };

    // For moving nodes: Node which will be moved
    node: Node | null = null;
    // Arcs that start or end at the selected node
    // -->  anchor points of these arcs will be moved automatically with the node
    nodeArcs: Arc[] = [];

    // For moving anchor points: anchor which will be moved
    anchor: Point | null = null;

    // Temporary storage of new anchor.
    // Also an indicator that a new anchor is moved instead of an existing one
    // when automatic switch to 'Move' mode occurs.
    newAnchor: Point | undefined;

    isCanvasDragInProcess: Boolean = false;

    constructor(
        private dataService: DataService,
        private uiService: UiService,
        private svgCoordinatesService: SvgCoordinatesService,
        private collisionAvoidanceService: CollisionAvoidanceService,
        private zoomService: ZoomService // Inject ZoomService
    ) {}

    initializePetrinetPanning(event: MouseEvent) {
        // Register initial mouse position
        this.initialMousePos.x = event.clientX;
        this.initialMousePos.y = event.clientY;

        this.isCanvasDragInProcess = true;
    }

    initializeNodeMove(event: MouseEvent, node: Node) {
        // Register node to be moved
        this.node = node;

        // Register arcs connected to the node
        this.dataService.getArcs().forEach((arc) => {
            if (arc.from === node || arc.to === node) this.nodeArcs.push(arc);
        });

        // Register mouse position
        this.initialMousePos.x = event.clientX;
        this.initialMousePos.y = event.clientY;
    }

    initializeAnchorMove(event: MouseEvent, anchor: Point) {
        // Register anchor to be moved
        this.anchor = anchor;

        // Register mouse position
        this.initialMousePos.x = event.clientX;
        this.initialMousePos.y = event.clientY;
    }

    moveNodeByMousePositionChange(event: MouseEvent) {
        if (this.node) {
            const currentScale = this.zoomService.currentScale;
            // Prevent division by zero or near-zero scale
            if (currentScale < 0.01) return;

            // Screen delta
            const deltaX = event.clientX - this.initialMousePos.x;
            const deltaY = event.clientY - this.initialMousePos.y;

            // Convert screen delta to SVG delta
            const svgDeltaX = deltaX / currentScale;
            const svgDeltaY = deltaY / currentScale;

            // Update node position with SVG delta
            this.node.position.x += svgDeltaX;
            this.node.position.y += svgDeltaY;

            // Update anchor positions with SVG delta (keeping the /2 heuristic for now)
            this.nodeArcs.forEach((arc) =>
                arc.anchors.forEach((point) => {
                    point.x += svgDeltaX / 2;
                    point.y += svgDeltaY / 2;
                }),
            );

            // Update initialMousePos for next move increment
            this.initialMousePos.x = event.clientX;
            this.initialMousePos.y = event.clientY;

            // Trigger redraw
            this.dataService.triggerDataChanged();
        }
    }

    moveAnchorByMousePositionChange(event: MouseEvent) {
        if (this.anchor) {
            const currentScale = this.zoomService.currentScale;
            // Prevent division by zero or near-zero scale
            if (currentScale < 0.01) return;

            // Screen delta
            const deltaX = event.clientX - this.initialMousePos.x;
            const deltaY = event.clientY - this.initialMousePos.y;

            // Convert screen delta to SVG delta
            const svgDeltaX = deltaX / currentScale;
            const svgDeltaY = deltaY / currentScale;

            // Update anchor position with SVG delta
            this.anchor.x += svgDeltaX;
            this.anchor.y += svgDeltaY;

            // Update initialMousePos for next move increment
            this.initialMousePos.x = event.clientX;
            this.initialMousePos.y = event.clientY;

            // Trigger redraw
            this.dataService.triggerDataChanged();
        }
    }

    movePetrinetPositionByMousePositionChange(event: MouseEvent) {
        // Calculate screen delta
        const deltaX = event.clientX - this.initialMousePos.x;
        const deltaY = event.clientY - this.initialMousePos.y;

        // Call zoomService.pan with the screen delta
        this.zoomService.pan(deltaX, deltaY);

        // Update initialMousePos for next move increment
        this.initialMousePos = { x: event.clientX, y: event.clientY };

        // No data change trigger needed here, as zoomService handles the view transform
        // this.dataService.triggerDataChanged(); // REMOVED
    }

    finalizeMove() {
        // Finalizes move of both nodes and anchors

        // Run collision check AFTER the move is finalized but BEFORE resetting state
        let changesMade = false;
        if (this.node || this.anchor || this.newAnchor) { // Only run if something was actually moved
             changesMade = this.collisionAvoidanceService.runChecksAndCorrections();
        }

        // Un-register elements of move of existing nodes/anchors
        this.node = null;
        this.nodeArcs = [];
        this.anchor = null;

        this.isCanvasDragInProcess = false;

        this.initialMousePos = { x: 0, y: 0 };

        // return to 'Anchor' mode if a newly created anchor was moved
        if (this.newAnchor) this.uiService.button = ButtonState.Anchor;
        // Un-register new anchor
        this.newAnchor = undefined;

        // Trigger final redraw if collision avoidance made changes
        if (changesMade) {
            this.dataService.triggerDataChanged();
        }
        // Always trigger redraw at the end of a move operation?
        // Might be redundant if already triggered during move or by collision avoidance.
        // Let's keep it simple for now and rely on the trigger within collision avoidance.
        // If visual glitches occur, uncomment the line below.
        // else { this.dataService.triggerDataChanged(); }
    }

    insertAnchorIntoLineSegmentStart(
        event: MouseEvent,
        arc: Arc,
        lineSegment: Point[], // Assuming this contains [startPoint, endPoint] of the segment clicked
        drawingArea: HTMLElement,
    ) {
        // Get coordinates relative to SVG viewport (unscaled, untranslated)
        const anchor = this.svgCoordinatesService.getRelativeEventCoords(
            event,
            drawingArea,
        );

        // The coordinates obtained from getRelativeEventCoords are in the SVG's
        // coordinate system *before* the main <g> transform is applied.
        // Since the anchor point will live *inside* the transformed <g>,
        // we need to convert these viewport-relative coordinates into the
        // coordinate system of the transformed <g>.

        const currentScale = this.zoomService.currentScale;
        const currentOffset = this.zoomService.currentOffset;

        // Inverse transform: (viewportX - offsetX) / scale
        const transformedX = (anchor.x - currentOffset.x) / currentScale;
        const transformedY = (anchor.y - currentOffset.y) / currentScale;

        const transformedAnchor = new Point(transformedX, transformedY);

        // Find insertion index (existing logic)
        const polylinePoints = arc.polyLinePointsArray;
        let startIndex = -1;
        const tolerance = 1e-6;
        for(let i = 0; i < polylinePoints.length -1; i++) {
            if (Math.abs(polylinePoints[i].x - lineSegment[0].x) < tolerance &&
                Math.abs(polylinePoints[i].y - lineSegment[0].y) < tolerance &&
                Math.abs(polylinePoints[i+1].x - lineSegment[1].x) < tolerance &&
                Math.abs(polylinePoints[i+1].y - lineSegment[1].y) < tolerance) {
                startIndex = i;
                break;
            }
        }

        // Insert the *transformed* anchor
        if (startIndex !== -1) {
             arc.anchors.splice(startIndex, 0, transformedAnchor);
             console.debug(`Neuer Anker eingefügt für Bogen ${arc.id} an Index ${startIndex}`);
        } else {
             console.warn(`Konnte Segment für neuen Anker in Bogen ${arc.id} nicht finden. Füge am Ende hinzu.`);
             arc.anchors.push(transformedAnchor);
        }

        // Initialize move for the *transformed* anchor
        this.newAnchor = transformedAnchor;
        this.uiService.button = ButtonState.Move;
        // initializeAnchorMove expects screen coordinates for initialMousePos,
        // but the anchor itself is the transformed one.
        this.initializeAnchorMove(event, transformedAnchor);

        // Trigger redraw
        this.dataService.triggerDataChanged();
    }
}
