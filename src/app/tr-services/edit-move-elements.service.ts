import { Injectable } from '@angular/core';
import { Point } from '../tr-classes/petri-net/point';
import { Arc } from '../tr-classes/petri-net/arc';
import { Node } from '../tr-interfaces/petri-net/node';
import { DataService } from './data.service';
import { UiService } from './ui.service';
import { ButtonState } from '../tr-enums/ui-state';
import { SvgCoordinatesService } from './svg-coordinates-service';

/**
 * @Injectable
 * Provided in 'root', making this service a singleton available throughout the application.
 *
 * @description
 * The `EditMoveElementsService` is responsible for managing the interactive editing
 * operations related to moving Petri net elements on the SVG canvas. This includes
 * moving nodes (places and transitions), arc anchors, and panning the entire Petri net.
 * It orchestrates the state changes during drag operations and interacts with other
 * services to update the data model and UI.
 *
 * Modularity:
 * This service exemplifies a modular design by focusing solely on the logic of
 * element manipulation (moving, dragging, inserting anchors). It achieves this by:
 * - Delegating Petri net data management to {@link DataService}: It retrieves element
 *   information (nodes, arcs) and updates their properties (positions) via `DataService`.
 *   This keeps the core data model concerns separate.
 * - Collaborating with {@link UiService}: It interacts with `UiService` to manage
 *   UI states, such as switching the active tool (e.g., to 'Move' mode after
 *   inserting an anchor). This decouples UI state logic from the element
 *   manipulation logic.
 * - Utilizing {@link SvgCoordinatesService}: It uses `SvgCoordinatesService` to
 *   translate mouse event coordinates into the SVG canvas's coordinate system,
 *   abstracting away the complexities of zoom and pan transformations.
 *
 * This separation of concerns enhances maintainability by making the codebase
 * easier to understand, test, and modify. Each service has a well-defined
 * responsibility.
 */
@Injectable({
    providedIn: 'root',
})
export class EditMoveElementsService {
    /**
     * Stores the mouse position recorded at the beginning of a drag operation
     * or the last processed mouse move event. Used to calculate the delta
     * for subsequent movements.
     */
    initialMousePos: Point = { x: 0, y: 0 };

    /**
     * The Petri net node (Place or Transition) that is currently selected for being moved.
     * It is `null` if no node is being moved.
     */
    node: Node | null = null;
    /**
     * An array of Arcs that are connected (either starting from or ending at)
     * the currently selected `node`. The anchor points of these arcs are
     * adjusted automatically when the `node` is moved.
     */
    nodeArcs: Arc[] = [];

    /**
     * The specific anchor point of an Arc that is currently selected for being moved.
     * It is `null` if no anchor is being moved.
     */
    anchor: Point | null = null;

    /**
     * Temporarily stores a newly created anchor point.
     * This property also serves as an indicator that a new anchor (rather than an
     * existing one) is being moved, which can trigger specific UI behavior,
     * such as automatically switching back to 'Anchor' mode upon finalization.
     * It is `undefined` if no new anchor is currently being handled.
     */
    newAnchor: Point | undefined;

    /**
     * A boolean flag indicating whether a canvas drag (panning of the entire Petri net)
     * is currently in progress.
     * `true` if the canvas is being panned, `false` otherwise.
     */
    isCanvasDragInProcess: Boolean = false;

    /**
     * Constructs the EditMoveElementsService.
     * @param dataService Service for accessing and manipulating Petri net data.
     * @param uiService Service for managing UI states and interactions.
     * @param svgCoordinatesService Service for converting screen to SVG coordinates.
     */
    constructor(
        private dataService: DataService,
        private uiService: UiService,
        private svgCoordinatesService: SvgCoordinatesService,
    ) {}

    /**
     * Initializes the panning operation for the entire Petri net.
     * It records the initial mouse position and sets the flag indicating
     * that a canvas drag is in process.
     * @param event The mouse event that triggered the panning operation (e.g., mousedown on canvas).
     */
    initializePetrinetPanning(event: MouseEvent) {
        // Register initial mouse position
        this.initialMousePos.x = event.clientX;
        this.initialMousePos.y = event.clientY;

        this.isCanvasDragInProcess = true;
    }

    /**
     * Initializes the move operation for a specific Petri net node.
     * It registers the node to be moved, identifies all arcs connected to it,
     * and records the initial mouse position.
     * @param event The mouse event that triggered the node move (e.g., mousedown on a node).
     * @param node The Petri net node (Place or Transition) to be moved.
     */
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

    /**
     * Initializes the move operation for a specific arc anchor point.
     * It registers the anchor to be moved and records the initial mouse position.
     * @param event The mouse event that triggered the anchor move (e.g., mousedown on an anchor).
     * @param anchor The anchor point (Point object) to be moved.
     */
    initializeAnchorMove(event: MouseEvent, anchor: Point) {
        // Register anchor to be moved
        this.anchor = anchor;

        // Register mouse position
        this.initialMousePos.x = event.clientX;
        this.initialMousePos.y = event.clientY;
    }

    /**
     * Updates the position of the currently selected node and its connected arc anchors
     * based on the change in mouse position during a drag operation.
     * This method should be called on mousemove events when a node move is active.
     * The connected arc anchors are shifted by half the delta of the node's movement.
     * @param event The mouse event containing the current mouse position.
     */
    moveNodeByMousePositionChange(event: MouseEvent) {
        // If a node is registered, this node will be moved
        if (this.node) {
            // Shift increment in x and y direction
            const deltaX = event.clientX - this.initialMousePos.x;
            const deltaY = event.clientY - this.initialMousePos.y;

            // Update node position
            this.node.position.x += deltaX;
            this.node.position.y += deltaY;

            // Update position of anchor points of arcs connected to the node.
            // They are shifted by half the position change of the node.
            this.nodeArcs.forEach((arc) =>
                arc.anchors.forEach((point) => {
                    point.x += deltaX / 2;
                    point.y += deltaY / 2;
                }),
            );

            // Update initialMousePos for next move increment
            this.initialMousePos.x = event.clientX;
            this.initialMousePos.y = event.clientY;
        }
    }

    /**
     * Updates the position of the currently selected arc anchor based on the change
     * in mouse position during a drag operation.
     * This method should be called on mousemove events when an anchor move is active.
     * @param event The mouse event containing the current mouse position.
     */
    moveAnchorByMousePositionChange(event: MouseEvent) {
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

    /**
     * Pans the entire Petri net by shifting the positions of all nodes and arc anchors
     * based on the change in mouse position during a canvas drag operation.
     * This method should be called on mousemove events when a canvas pan is active.
     * @param event The mouse event containing the current mouse position.
     */
    movePetrinetPositionByMousePositionChange(event: MouseEvent) {
        const deltaX = event.clientX - this.initialMousePos.x;
        const deltaY = event.clientY - this.initialMousePos.y;

        [
            ...this.dataService.getPlaces(),
            ...this.dataService.getTransitions(),
        ].forEach((node) => {
            node.position.x += deltaX;
            node.position.y += deltaY;
        });

        this.dataService.getArcs().forEach((arc) => {
            arc.anchors.forEach((point) => {
                point.x += deltaX;
                point.y += deltaY;
            });
        });

        // Update initialMousePos for next move increment
        this.initialMousePos = { x: event.clientX, y: event.clientY };
    }

    /**
     * Finalizes any ongoing move operation (node, anchor, or canvas pan).
     * It resets the service's state, clearing references to moved elements
     * and drag status. If a newly created anchor was being moved, it may
     * also trigger a UI state change (e.g., back to 'Anchor' mode).
     * This method should typically be called on mouseup events.
     */
    finalizeMove() {
        // Finalizes move of both nodes and anchors

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
    }

    /**
     * Inserts a new anchor point into an existing arc at the clicked position
     * on one of its line segments.
     * After creating the anchor, it automatically switches the UI to 'Move' mode
     * and initializes a move operation for the new anchor, allowing the user
     * to immediately drag it to its final position.
     * @param event The mouse event (e.g., click) on an arc's line segment.
     * @param arc The arc to which the new anchor will be added.
     * @param lineSegment An array of two Points representing the start and end
     *                    of the specific line segment of the arc that was clicked.
     *                    This is used to determine where to insert the new anchor
     *                    within the arc's existing anchors array.
     * @param drawingArea The HTML SVG element representing the drawing area,
     *                    used for coordinate conversion.
     */
    insertAnchorIntoLineSegmentStart(
        event: MouseEvent,
        arc: Arc,
        lineSegment: Point[],
        drawingArea: HTMLElement,
    ) {
        // Create new anchor at mouse coordinate
        const anchor = this.svgCoordinatesService.getRelativeEventCoords(
            event,
            drawingArea,
        );

        // Insert new anchor into the anchors array of the arc that was clicked on
        if (
            arc.anchors.length === 0 ||
            arc.anchors.indexOf(lineSegment[0]) === arc.anchors.length - 1
        ) {
            arc.anchors.push(anchor);
        } else {
            const indexLineEnd = arc.anchors.indexOf(lineSegment[1]);
            if (indexLineEnd !== -1) {
                arc.anchors.splice(indexLineEnd, 0, anchor);
            }
        }

        // Automatic change to 'Move' mode so that the newly created anchor can
        // be dragged to its final position
        this.newAnchor = anchor;
        this.uiService.button = ButtonState.Move;
        this.initializeAnchorMove(event, anchor);
    }
}
