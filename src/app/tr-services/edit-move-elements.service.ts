import { Injectable } from '@angular/core';
import { Point } from '../tr-classes/petri-net/point';
import { Arc } from '../tr-classes/petri-net/arc';
import { Node } from '../tr-interfaces/petri-net/node';
import { DataService } from './data.service';
import { UiService } from './ui.service';
import { ButtonState } from '../tr-enums/ui-state';

@Injectable({
    providedIn: 'root'
})
export class EditMoveElementsService {

    // Mouse position before next drag step
    initialMousePos: Point = {x:0, y:0};

    // For moving nodes: Selected node that is moved
    node: Node | null = null;
    // Arcs that start or end at the selected node
    // --> they will be moved automatically with the node
    nodeArcs: Arc[] = [];

    // For moving anchor points: Selected anchor that ist moved
    anchor: Point | null = null;

    // For checking if moved anchor is old or just created
    isNewAnchor: Boolean = false;

    constructor(private dataService: DataService, private uiService: UiService) { }

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

    moveNodeByMousePositionChange(event: MouseEvent){
        // If a node is registered, this node will be moved
        if (this.node) {
            // Shift increment in x and y direction
            const deltaX = event.clientX - this.initialMousePos.x;
            const deltaY = event.clientY - this.initialMousePos.y;

            // Update node position
            this.node.position.x += deltaX;
            this.node.position.y += deltaY;

            // Update position of anchor points of arcs connected to the node
            // TODO: refine algorithm
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

    finalizeMove(){
        // Un-register elements
        this.node = null;
        this.nodeArcs = [];
        this.anchor = null;

        this.initialMousePos = {x:0, y:0};

        // return to 'anchor' mode if it is a newly created anchor
        if (this.isNewAnchor) this.uiService.button = ButtonState.Anchor;
        this.isNewAnchor = false;
    }

    initializeAnchorMove(event: MouseEvent, anchor: Point){
        // Register anchor to be moved
        this.anchor = anchor;

        // Register mouse position
        this.initialMousePos.x = event.clientX;
        this.initialMousePos.y = event.clientY;
    }

    moveAnchorByMousePositionChange(event: MouseEvent){
        // If an anchor is registered, this anchor will be moved
        if (this.anchor) {
            // Shift increment in x and y direction
            const deltaX = event.clientX - this.initialMousePos.x;
            const deltaY = event.clientY - this.initialMousePos.y;

            // Update node position
            this.anchor.x += deltaX;
            this.anchor.y += deltaY;

            // Update initialMousePos for next move increment
            this.initialMousePos.x = event.clientX;
            this.initialMousePos.y = event.clientY;
        }
    }

    insertAnchorStart(event: MouseEvent, arc: Arc, drawingArea: HTMLElement){
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;

        const anchor = new Point(x, y)

        // TODO: refine insertion, so it is in the correct position
        arc.anchors.push(anchor);

        // Change to move mode
        this.uiService.button = ButtonState.Move;
        this.isNewAnchor = true;
        this.initializeAnchorMove(event, anchor);
    }

    insertAnchorIntoLineSegmentStart(event: MouseEvent, arc: Arc, lineSegment: Point[], drawingArea: HTMLElement) {
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;

        const anchor = new Point(x, y)

        // Insert new anchor into the anchors array
        if (arc.anchors.length === 0 || arc.anchors.indexOf(lineSegment[0]) === (arc.anchors.length - 1)) {
            arc.anchors.push(anchor);
        } else {
            const indexLineEnd = arc.anchors.indexOf(lineSegment[1]);
            if (indexLineEnd !== -1) {
                arc.anchors.splice(indexLineEnd, 0, anchor);
            }
        }


        // Change to move mode
        this.uiService.button = ButtonState.Move;
        this.isNewAnchor = true;
        this.initializeAnchorMove(event, anchor);
    }
}
