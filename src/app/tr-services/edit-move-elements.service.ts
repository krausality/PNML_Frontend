import { Injectable } from '@angular/core';
import { Point } from '../tr-classes/petri-net/point';
import { Arc } from '../tr-classes/petri-net/arc';
import { Node } from '../tr-interfaces/petri-net/node';
import { DataService } from './data.service';
import { UiService } from './ui.service';
import { ButtonState } from '../tr-enums/ui-state';
import { SvgCoordinatesService } from './svg-coordinates-service';

@Injectable({
    providedIn: 'root'
})
export class EditMoveElementsService {

    // Mouse position before next drag step
    initialMousePos: Point = {x:0, y:0};

    // For moving nodes: Node which will be moved
    node: Node | null = null;
    // Arcs that start or end at the selected node
    // -->  anchor points of these arcs will be moved automatically with the node
    nodeArcs: Arc[] = [];

    // For moving anchor points: anchor which will be moved
    anchor: Point | null = null;

    // Temporary storage of new anchor.
    // Also an indicator that a new anchor is moved instead of an existing one
    // when automatic switch to 'move' mode occurs.
    newAnchor: Point | undefined;

    constructor(
        private dataService: DataService, 
        private uiService: UiService,
        private svgCoordinatesService: SvgCoordinatesService,
    ) { }

    initializeNodeMove(event: MouseEvent, node: Node){
        // Register node to be moved
        this.node = node;

        // Register arcs connected to the node
        this.dataService.getArcs().forEach(arc => {
            if (arc.from === node || arc.to === node) this.nodeArcs.push(arc);
        })

        // Register mouse position
        this.initialMousePos.x = event.clientX;
        this.initialMousePos.y = event.clientY;
    }

    initializeAnchorMove(event: MouseEvent, anchor: Point){
        // Register anchor to be moved
        this.anchor = anchor;

        // Register mouse position
        this.initialMousePos.x = event.clientX;
        this.initialMousePos.y = event.clientY;
    }

    moveNodeByMousePositionChange(event: MouseEvent){
        // If a node is registered, this node will be moved
        if (this.node) {
            // Shift increment in x and y direction
            const deltaX = event.clientX - this.initialMousePos.x;
            const deltaY = event.clientY - this.initialMousePos.y;

            // Update node position
            this.node.position.x += deltaX;
            this.node.position.y += deltaY;

            // Update position of anchor points of arcs connected to the node.
            // They are shifted by halv the position change of the node.
            this.nodeArcs.forEach(arc =>
                arc.anchors.forEach(point => {
                    point.x += deltaX/2;
                    point.y +=deltaY/2;
                }));

            // Update initialMousePos for next move increment
            this.initialMousePos.x = event.clientX;
            this.initialMousePos.y = event.clientY;
        }
    }

    moveAnchorByMousePositionChange(event: MouseEvent){
        // If an anchor is registered, this anchor will be moved
        if (this.anchor) {
            // Shift increment in x and y direction
            const deltaX = event.clientX - this.initialMousePos.x;
            const deltaY = event.clientY - this.initialMousePos.y;

            // Update anchor position
            this.anchor.x += deltaX;
            this.anchor.y += deltaY;

            // Update initialMousePos for next move increment
            this.initialMousePos.x = event.clientX;
            this.initialMousePos.y = event.clientY;
        }
    }

    finalizeMove(){
        // Finalizes move of both nodes and anchors

        // Un-register elements of move of existing nodes/anchors
        this.node = null;
        this.nodeArcs = [];
        this.anchor = null;

        this.initialMousePos = {x:0, y:0};

        // return to 'anchor' mode if a newly created anchor was moved
        if (this.newAnchor) this.uiService.button = ButtonState.Anchor;
        // Un-register new anchor
        this.newAnchor = undefined;
    }

    insertAnchorIntoLineSegmentStart(event: MouseEvent, arc: Arc, lineSegment: Point[], drawingArea: HTMLElement) {
        // Create new anchor at mouse coordinate
        const anchor = this.svgCoordinatesService.getRelativeEventCoords(event, drawingArea);

        // Insert new anchor into the anchors array of the arc that was clicked on
        if (arc.anchors.length === 0 || arc.anchors.indexOf(lineSegment[0]) === (arc.anchors.length - 1)) {
            arc.anchors.push(anchor);
        } else {
            const indexLineEnd = arc.anchors.indexOf(lineSegment[1]);
            if (indexLineEnd !== -1) {
                arc.anchors.splice(indexLineEnd, 0, anchor);
            }
        }

        // Automatic change to 'move' mode so that the newly created anchor can
        // be dragged to its final position
        this.newAnchor = anchor;
        this.uiService.button = ButtonState.Move;
        this.initializeAnchorMove(event, anchor);
    }
}
