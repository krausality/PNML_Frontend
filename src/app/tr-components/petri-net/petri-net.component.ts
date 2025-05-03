import { HttpClient } from '@angular/common/http';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ParserService } from 'src/app/tr-services/parser.service';
import { take } from 'rxjs';
import { FileReaderService } from '../../services/file-reader.service';
import { DataService } from '../../tr-services/data.service';

import {
    anchorRadius,
    placeIdYOffset,
    radius,
    transitionHeight,
    transitionIdYOffset,
    transitionWidth,
    transitionXOffset,
    transitionYOffset,
    transSilentWidth,
    transSilentXOffset,
    lineSeparator,
} from '../../tr-services/position.constants';

import { PnmlService } from '../../tr-services/pnml.service';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { UiService } from 'src/app/tr-services/ui.service';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Point } from 'src/app/tr-classes/petri-net/point';
import { Transition } from 'src/app/tr-classes/petri-net/transition';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { EditMoveElementsService } from 'src/app/tr-services/edit-move-elements.service';
import {
    ButtonState,
    CodeEditorFormat,
    TabState,
} from 'src/app/tr-enums/ui-state';
import { TokenGameService } from 'src/app/tr-services/token-game.service';
import { MatDialog } from '@angular/material/dialog';
import { SetActionPopupComponent } from '../set-action-popup/set-action-popup.component';
import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { MouseConstants } from '../../tr-enums/mouse-constants';
import { ZoomService } from '../../tr-services/zoom.service'; // Import ZoomService
import { showTooltipDelay } from '../../tr-services/position.constants'; // Import showTooltipDelay
import { SvgCoordinatesService } from 'src/app/tr-services/svg-coordinates-service';
import { PlaceInvariantsService } from 'src/app/tr-services/place-invariants.service';
import { PlaceInvariantsTableComponent } from '../place-invariants-table/place-invariants-table.component';
import { DummyArc } from 'src/app/tr-classes/petri-net/dummyArc';
import { ErrorPopupComponent } from '../error-popup/error-popup.component';
import { validateJsonAgainstSchema } from 'src/app/tr-utils/json.utils';
import { LayoutSugiyamaService } from '../../tr-services/layout-sugiyama.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-petri-net',
    templateUrl: './petri-net.component.html',
    styleUrls: ['./petri-net.component.css'],
})
export class PetriNetComponent implements OnInit, OnDestroy {
    @Input() buttonState: ButtonState | undefined;

    // Marks selected node in Blitz tool
    lastNode: Node | null = null;
    // Marks node that will be selected
    nextNode: Node | null = null;
    // Attribute is set when the user tries to connect two nodes of the same type
    addElement: boolean = true;
    public anchorRadius = anchorRadius;
    public lineSeparator = lineSeparator;
    public showTooltipDelay = showTooltipDelay; // Expose tooltip delay constant

    private _subs: Subscription[] = [];
    private _sub?: Subscription;

    constructor(
        private parserService: ParserService,
        private httpClient: HttpClient,
        private fileReaderService: FileReaderService,
        protected dataService: DataService,
        protected exportJsonDataService: ExportJsonDataService,
        protected pnmlService: PnmlService,
        protected uiService: UiService,
        protected tokenGameService: TokenGameService,
        private matDialog: MatDialog,
        public zoomService: ZoomService, // Inject ZoomService
        protected editMoveElementsService: EditMoveElementsService,
        private layoutSugiyamaService: LayoutSugiyamaService,
        protected svgCoordinatesService: SvgCoordinatesService,
        protected placeInvariantsService: PlaceInvariantsService,
    ) {}

    ngOnInit(): void {
        this.uiService.buttonState$.subscribe((buttonState) => {
            if (buttonState !== ButtonState.Blitz) {
                this.dummyArc.points = [];
                this.lastNode = null;
            }
        });
    }

    ngOnDestroy(): void {
        this._subs.forEach((sub) => sub.unsubscribe());
        if (this._sub) {
            this._sub.unsubscribe();
        }
    }

    startTransition: Transition | undefined;
    startPlace: Place | undefined;
    anchorToDelete: Point | undefined;
    dummyArc = new DummyArc();

    private parsePetrinetData(
        content: string | undefined,
        contentType: CodeEditorFormat | undefined,
    ) {
        if (content) {
            // Variable to parse the data into
            let parsedData: [
                Array<Place>,
                Array<Transition>,
                Array<Arc>,
                Array<string>,
            ];

            try {
                // Use pnml parser if file type is pnml
                // we'll try the json parser for all other cases
                if (contentType === CodeEditorFormat.PNML) {
                    parsedData = this.pnmlService.parse(content);
                } else {
                    parsedData = this.parserService.parse(content);
                }
            } catch (error) {
                this.matDialog.open(ErrorPopupComponent, {
                    data: {
                        parsingError: error,
                        schemaValidationErrors: false,
                    },
                });
                return;
            }

            if (contentType === CodeEditorFormat.JSON) {
                const schemaValidationErrors =
                    validateJsonAgainstSchema(content);

                if (Object.keys(schemaValidationErrors).length) {
                    this.matDialog.open(ErrorPopupComponent, {
                        data: {
                            parsingError: false,
                            schemaValidationErrors: schemaValidationErrors,
                        },
                    });

                    return;
                }
            }

            // Destructure the parsed data and overwrite the corresponding parameters
            // in the data service
            const [places, transitions, arcs, actions] = parsedData;
            this.dataService.places = places;
            this.dataService.transitions = transitions;
            this.dataService.arcs = arcs;
            this.dataService.actions = actions;

            if (
                contentType !== CodeEditorFormat.PNML &&
                this.parserService.incompleteLayoutData
            ) {
                this.layoutSugiyamaService.applySugiyamaLayout();
            }

            if (
                contentType === CodeEditorFormat.PNML &&
                this.pnmlService.incompleteLayoutData
            ) {
                this.layoutSugiyamaService.applySugiyamaLayout();
            }
        }
    }

    // Process Drag & Drop using Observables
    public processDropEvent(event: DragEvent) {
        event.preventDefault(); // Prevent opening of the dragged file in a new tab

        // Drag & Drop imports should only be available in
        // Code & Build Mode to prevent inconsistencies.
        if (![TabState.Code, TabState.Build].includes(this.uiService.tab)) {
            this.matDialog.open(ErrorPopupComponent, {
                data: {
                    error: 'Importing by drag & drop is only available in "Build" and "Code" mode',
                },
            });

            return;
        }

        this.readFile(event.dataTransfer?.files);
    }

    private readFile(files: FileList | undefined | null) {
        if (files === undefined || files === null || files.length === 0) {
            return;
        }

        const file = files[0];

        // Extract type from file name
        const extension = file.name.split('.').pop();
        let fileType: CodeEditorFormat | undefined;

        switch (extension) {
            case 'json':
                fileType = CodeEditorFormat.JSON;
                break;
            case 'pnml':
            case 'xml':
                fileType = CodeEditorFormat.PNML;
                break;
            default:
                fileType = undefined;
                break;
        }

        this.fileReaderService
            .readFile(files[0])
            .pipe(take(1))
            .subscribe((content) => {
                this.parsePetrinetData(content, fileType);
                this.emitFileContent(content);
            });
    }

    private emitFileContent(content: string | undefined) {
        if (content === undefined) {
            return;
        }
        // Instead of emitting the file content we set the current code editor format as
        // next value of the BehaviorSubject in order to have the code editor component
        // load the source code by itself (with our formatting applied)
        this.uiService.codeEditorFormat$.next(
            this.uiService.codeEditorFormat$.value,
        );
    }

    public prevent(e: Event) {
        // Dragover must be prevented for drop to work
        e.preventDefault();
    }

    protected onWheelEventTransition(e: WheelEvent, transition: Transition) {
        if (
            this.uiService.button === ButtonState.Blitz ||
            this.uiService.button === ButtonState.Select
        ) {
            e.preventDefault();
            e.stopPropagation();
            if (e.deltaY < 0) {
                transition.label = this.getNextLabel(transition.label);
            } else {
                transition.label = this.getLastLabel(transition.label);
            }
        }
    }

    protected onWheelEventPlace(e: WheelEvent, place: Place) {
        // Scrolling is allowed in Both Directions with the Blitz-Tool
        if (this.uiService.button === ButtonState.Blitz) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY < 0) {
                place.token++;
            }
            if (e.deltaY > 0 && place.token > 0) {
                place.token--;
            }
        }
        if (this.uiService.button === ButtonState.Add) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY < 0) {
                place.token++;
            }
        } else if (this.uiService.button === ButtonState.Remove) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY > 0 && place.token > 0) {
                place.token--;
            }
        }
    }

    protected onWheelEventArc(e: WheelEvent, arc: Arc) {
        // Scrolling is allowed in Both Directions with the Blitz-Tool
        if (this.uiService.button === ButtonState.Blitz) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY < 0) {
                // positives Gewicht erhöhen
                if (arc.weight > 0) {
                    arc.weight++;
                } // negatives Gewicht erhöhren
                else if (arc.weight < 0) {
                    arc.weight--;
                }
            }
            if (e.deltaY > 0) {
                // positives Gewicht verringern
                if (arc.weight > 1) {
                    arc.weight--;
                } // negatives Gewicht verringern
                else if (arc.weight < -1) {
                    arc.weight++;
                }
                //Scroll Up
            }
        }
        if (this.uiService.button === ButtonState.Add) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY < 0) {
                // positives Gewicht erhöhen
                if (arc.weight > 0) {
                    arc.weight++;
                } // negatives Gewicht erhöhren
                else if (arc.weight < 0) {
                    arc.weight--;
                }
            }
        } else if (this.uiService.button === ButtonState.Remove) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY > 0) {
                // positives Gewicht verringern
                if (arc.weight > 1) {
                    arc.weight--;
                } // negatives Gewicht verringern
                else if (arc.weight < -1) {
                    arc.weight++;
                }
                //Scroll Up
            }
        }
    }

    /**
     * Handles mouse wheel events on the SVG canvas for zooming.
     * @param event The wheel event.
     */
    onMouseWheelZoom(event: WheelEvent) {
        event.preventDefault(); // Prevent page scrolling
        if (event.deltaY < 0) {
            // Scrolled up (zoom in)
            this.zoomService.zoomIn();
        } else if (event.deltaY > 0) {
            // Scrolled down (zoom out)
            this.zoomService.zoomOut();
        }
    }

    // Dispatch methods for display events ************************************

    // SVG
    dispatchSVGClick(event: MouseEvent, drawingArea: HTMLElement) {
        event.preventDefault();
        if (this.uiService.button === ButtonState.Place) {
            // example method: can be deleted/replaced with final implementation
            this.addPlace(event, drawingArea);
        }
        if (this.uiService.button === ButtonState.Transition) {
            this.addTransition(event, drawingArea);
        }

        if (this.uiService.button === ButtonState.Blitz) {
            if (!this.addElement) {
                this.addElement = true;
                return;
            }
            if (this.nextNode && this.nextNode.position) {
                // Initialising Blitz-Tool by clickling on an existing Node
                if (!this.lastNode) {
                    this.dummyArc = new DummyArc();
                    this.dummyArc.points[0] = this.nextNode.position;
                    this.lastNode = this.nextNode;
                    this.nextNode = null;
                    return;
                }
            }

            if (!this.lastNode) {
                // Initialising Blitz-Tool by clickling on the Canvas
                const place = this.createPlace(event, drawingArea);
                this.dataService.getPlaces().push(place);
                this.lastNode = place;
            } else if (this.lastNode instanceof Place) {
                // Last Node was a Place
                if (this.nextNode instanceof Transition) {
                    // Connecting the Place to an existing Transition
                    const transition = this.nextNode;
                    this.dataService.connectNodes(this.lastNode, transition);
                    this.lastNode = this.nextNode;
                } else if (this.nextNode instanceof Place) {
                    // If a Place is clicked the selected Node is changed
                    this.lastNode = this.nextNode;
                } else if (!this.nextNode) {
                    // Click on the Canvas
                    const transition = this.createTransition(
                        event,
                        drawingArea,
                    );
                    this.dataService.getTransitions().push(transition);
                    this.dataService.connectNodes(this.lastNode, transition);
                    this.lastNode = transition;
                }
            } else if (this.lastNode instanceof Transition) {
                // Last Node was a Transition
                if (this.nextNode instanceof Place) {
                    // Connecting the Transition to an existing Place
                    const place = this.nextNode;
                    this.dataService.connectNodes(this.lastNode, place);
                    this.lastNode = this.nextNode;
                } else if (this.nextNode instanceof Transition) {
                    // If a Transition is clicked the selected Node is changed
                    this.lastNode = this.nextNode;
                } else if (!this.nextNode) {
                    // Click on the Canvas
                    const place = this.createPlace(event, drawingArea);
                    this.dataService.getPlaces().push(place);
                    this.dataService.connectNodes(this.lastNode, place);
                    this.lastNode = place;
                }
            }
            this.dummyArc.points[0] = this.lastNode.position;
            this.nextNode = null;
        }
    }

    dispatchSVGMouseDown(event: MouseEvent, drawingArea: HTMLElement) {
        // Default Panning: Initiate panning only if the click target is the SVG canvas itself
        if (event.target === drawingArea) {
            this.editMoveElementsService.initializePetrinetPanning(event);
        }

        // Existing logic for other button states (Blitz, Arc)
        if (
            this.uiService.button === ButtonState.Blitz &&
            event.button == MouseConstants.Right_Click
        ) {
            this.lastNode = null;
            this.nextNode = null;
            this.dummyArc.points = [];
        }
        if (
            this.uiService.button === ButtonState.Blitz &&
            event.button == MouseConstants.Mouse_Wheel_Click &&
            !this.lastNode
        ) {
            event.preventDefault();
            const transition = this.createTransition(event, drawingArea);
            this.dataService.getTransitions().push(transition);
            this.lastNode = transition;
            this.dummyArc.points[0] = this.lastNode.position;
        }
        if (
            this.uiService.button === ButtonState.Arc &&
            this.dummyArc.points.length === 1
        ) {
            this.dummyArc.points.push(
                this.svgCoordinatesService.getRelativeEventCoords(
                    event,
                    drawingArea,
                ),
            );
        }
    }

    dispatchSVGMouseMove(event: MouseEvent, drawingArea: HTMLElement) {
        // Always delegate to service, it checks internally if panning is active
        if (this.editMoveElementsService.isCanvasDragInProcess) {
            this.editMoveElementsService.movePetrinetPositionByMousePositionChange(
                event,
            );
        } else if (this.uiService.button === ButtonState.Move) {
            // Only move nodes/anchors if explicitly in Move mode
            this.editMoveElementsService.moveNodeByMousePositionChange(event);
            this.editMoveElementsService.moveAnchorByMousePositionChange(event);
        }

        // Existing logic for Arc/Blitz dummy line
        if (
            (this.uiService.button === ButtonState.Arc ||
                this.uiService.button === ButtonState.Blitz) &&
            this.dummyArc?.points.length > 0
        ) {
            // Drawing the drag & drop DummyArc
            this.dummyArc.points[1] =
                this.svgCoordinatesService.getRelativeEventCoords(
                    event,
                    drawingArea,
                );
        }
    }

    dispatchSVGMouseUp(event: MouseEvent, drawingArea: HTMLElement) {
        // Always finalize/reset potential panning/moving state in the service
        this.editMoveElementsService.finalizeMove();

        // Existing logic for Arc/Anchor deletion
        // Reset for both cancellation or finalization (bubble-up) of arc drawing
        if (this.uiService.button === ButtonState.Arc) {
            this.startTransition = undefined;
            this.startPlace = undefined;
            this.dummyArc.points = [];
        }

        // Resed anchorToDelete after both:
        // * A successfull deletion of an anchor: mouse up on the anchor element
        //   bubbles up to the svg element and triggers dispatchSVGMouseUp().
        // * An aborted anchor deletion: mouse up does not occur on the original
        //   anchor but somewhere else on the display area --> the event
        //   is captuered
        //   here as well.

        if (this.anchorToDelete) {
            this.anchorToDelete = undefined;
        }
    }

    // Places
    dispatchPlaceClick(event: MouseEvent, place: Place) {
        if (this.uiService.button === ButtonState.Add) {
            place.token++;
        }

        if (this.uiService.button === ButtonState.Remove) {
            if (place.token > 0) {
                place.token--;
            }
        }

        if (this.uiService.button === ButtonState.Delete) {
            this.dataService.removePlace(place);
        }

        if (
            this.uiService.tab === TabState.Analyze &&
            this.placeInvariantsService.placeInvariantsMatrix
        ) {
            this.openPlaceInvariantsTable(place);
        }
    }

    dispatchPlaceMouseDown(event: MouseEvent, place: Place) {
        if (this.uiService.button === ButtonState.Blitz) {
            if (event.button == MouseConstants.Right_Click) {
                this.dummyArc = new DummyArc();
                this.dataService.removePlace(place);
            } else if (event.button == MouseConstants.Left_Click) {
                // Existing Place is selected as the next Node. Method is called before dispatchSVGClick
                if (this.lastNode instanceof Place) {
                    this.addElement = false;
                } else {
                    this.nextNode = place;
                }
            }
        }

        if (this.uiService.button === ButtonState.Move) {
            // Keep event from bubbling up to canvas and e.g. trigger canvas drag & drop
            event.stopPropagation();
            this.editMoveElementsService.initializeNodeMove(event, place);
        }

        // Set StartNode for Arc
        if (this.uiService.button === ButtonState.Arc) {
            this.startPlace = place;
            this.dummyArc?.points.push(place.position);
        }
    }

    dispatchPlaceMouseUp(event: MouseEvent, place: Place) {
        // Draw Arc with Place as EndNode
        if (
            this.startTransition &&
            !this.isArcExisting(this.startTransition, place) &&
            this.uiService.button === ButtonState.Arc
        ) {
            const newArc: Arc = new Arc(this.startTransition, place, 1);
            this.startTransition.appendPostArc(newArc);
            this.dataService.getArcs().push(newArc);
        }
    }

    // Transitions
    dispatchTransitionClick(event: MouseEvent, transition: Transition) {
        // Token game: fire transition
        if (this.uiService.tab === TabState.Play) {
            this.tokenGameService.fire(transition);
        } else if (
            this.uiService.tab === TabState.Build &&
            this.uiService.button === ButtonState.Select
        ) {
            this.matDialog.open(SetActionPopupComponent, {
                data: { node: transition },
            });
        }

        if (this.uiService.button === ButtonState.Delete) {
            this.dataService.removeTransition(transition);
        }
    }

    dispatchTransitionMouseDown(event: MouseEvent, transition: Transition) {
        if (this.uiService.button === ButtonState.Blitz) {
            if (event.button == MouseConstants.Right_Click) {
                this.dataService.removeTransition(transition);
            } else if (event.button == MouseConstants.Left_Click) {
                // Existing Transition is selected as the next Node. Method is called before dispatchSVGClick
                if (this.lastNode instanceof Transition) {
                    this.addElement = false;
                } else {
                    this.nextNode = transition;
                }
            }
        }

        if (this.uiService.button === ButtonState.Move) {
            // Keep event from bubbling up to canvas and e.g. trigger canvas drag & drop
            event.stopPropagation();
            this.editMoveElementsService.initializeNodeMove(event, transition);
        }

        // Set StartNode for Arc
        if (this.uiService.button === ButtonState.Arc) {
            this.startTransition = transition;
            this.dummyArc?.points.push(transition.position);
        }
    }

    dispatchTransitionMouseUp(event: MouseEvent, transition: Transition) {
        // Draw Arc with Transition as EndNode
        if (
            this.startPlace &&
            !this.isArcExisting(this.startPlace, transition) &&
            this.uiService.button === ButtonState.Arc
        ) {
            const newArc: Arc = new Arc(this.startPlace, transition, 1);
            transition.appendPreArc(newArc);
            this.dataService.getArcs().push(newArc);
        }
    }

    // Arcs
    dispatchArcClick(event: MouseEvent, arc: Arc) {
        // Add Weight to Arc
        if (this.uiService.button === ButtonState.Add) {
            if (arc.weight > 0) {
                arc.weight++;
            } else if (arc.weight < 0) {
                arc.weight--;
            }
        }

        // Remove Weight from Arc
        if (this.uiService.button === ButtonState.Remove) {
            if (arc.weight > 1) {
                arc.weight--;
            } else if (arc.weight < -1) {
                arc.weight++;
            }
        }

        // Remove Arc
        // Check of the field anchorToDelete prevents arc deletion when
        // only an anchor should be deleted.
        if (
            this.uiService.button === ButtonState.Delete &&
            !this.anchorToDelete
        ) {
            this.dataService.removeArc(arc);
        }
    }

    onContextMenu(event: MouseEvent): void {
        if (this.uiService.button === ButtonState.Blitz) {
            event.preventDefault();
        }
    }

    dispatchArcMouseDown(
        event: MouseEvent,
        arc: Arc,
        drawingArea: HTMLElement,
    ) {
        if (
            this.uiService.button === ButtonState.Blitz &&
            event.button == MouseConstants.Right_Click
        ) {
            this.dataService.removeArc(arc);
        }
    }

    dispatchLineSegmentMouseDown(
        event: MouseEvent,
        arc: Arc,
        lineSegment: Point[],
        drawingArea: HTMLElement,
    ) {
        if (this.uiService.button === ButtonState.Anchor) {
            this.editMoveElementsService.insertAnchorIntoLineSegmentStart(
                event,
                arc,
                lineSegment,
                drawingArea,
            );
        }

        if (this.uiService.button === ButtonState.Move) {
            event.stopPropagation();
        }
    }

    // Anchors
    dispatchAnchorMouseDown(event: MouseEvent, anchor: Point) {
        if (this.uiService.button === ButtonState.Move) {
            event.stopPropagation();
            this.editMoveElementsService.initializeAnchorMove(event, anchor);
        }

        if (this.uiService.button === ButtonState.Delete) {
            // Register the anchor to be deleted
            this.anchorToDelete = anchor;
        }
    }

    dispatchAnchorMouseUp(event: MouseEvent, anchor: Point) {
        if (this.anchorToDelete === anchor) {
            this.dataService.removeAnchor(anchor);
        }
    }

    // ************************************************************************

    addPlace(event: MouseEvent, drawingArea: HTMLElement) {
        const place = this.createPlace(event, drawingArea);
        this.dataService.getPlaces().push(place);
    }

    createPlace(event: MouseEvent, drawingArea: HTMLElement): Place {
        const point = this.svgCoordinatesService.getRelativeEventCoords(
            event,
            drawingArea,
        );
        return new Place(0, point, this.getPlaceId());
    }

    addTransition(event: MouseEvent, drawingArea: HTMLElement) {
        const transition = this.createTransition(event, drawingArea);
        this.dataService.getTransitions().push(transition);
    }

    createTransition(event: MouseEvent, drawingArea: HTMLElement): Transition {
        const point = this.svgCoordinatesService.getRelativeEventCoords(
            event,
            drawingArea,
        );
        return new Transition(point, this.getTransitionId());
    }

    getPlaceId(): string {
        let i = 1;
        let found = false;
        let id: string = '';
        let placeIds: string[] = [];
        this.dataService.getPlaces().forEach((place) => {
            placeIds.push(place.id);
        });
        while (!found) {
            id = 'p' + i;
            if (placeIds.indexOf(id) === -1) {
                found = true;
            }
            i++;
        }
        return id;
    }

    getTransitionId(): string {
        let i = 1;
        let found = false;
        let id: string = '';
        let transitionIds: string[] = [];
        this.dataService.getTransitions().forEach((transition) => {
            transitionIds.push(transition.id);
        });
        while (!found) {
            id = 't' + i;
            if (transitionIds.indexOf(id) === -1) {
                found = true;
            }
            i++;
        }
        return id;
    }

    isArcExisting(startNode: Node, endNote: Node): boolean {
        return this.dataService
            .getArcs()
            .some((arc) => arc.from === startNode && arc.to === endNote);
    }

    // Returns true if the provided place can be edited and should be highlighted
    isPlaceEditable(place: Place): boolean {
        const hasPreArcFromStartTransition =
            this.startTransition &&
            this.dataService.getArcs().filter((arc) => {
                return arc.from === this.startTransition && arc.to === place;
            }).length;

        if (this.uiService.button === ButtonState.Blitz) {
            if (!this.lastNode) {
                return true;
            } else {
                return this.dataService.isConnectionPossible(
                    this.lastNode,
                    place,
                );
            }
        }

        return (
            (this.uiService.button === ButtonState.Move &&
                !this.editMoveElementsService.newAnchor) ||
            this.uiService.button === ButtonState.Add ||
            (this.uiService.button === ButtonState.Remove && place.token > 0) || // Tokens can only be removed if the number of tokens in a place is > 0
            this.uiService.button === ButtonState.Delete ||
            (this.uiService.button === ButtonState.Arc &&
                !this.startPlace &&
                !hasPreArcFromStartTransition)
        ); // If the user starts dragging an arc from a place he can only finish on a transition --> places are no longer editable
    }

    // Returns true if transitions can be edited and should be highlighted
    isTransitionEditable(transition: Transition): boolean {
        const hasPreArcFromStartPlace =
            this.startPlace &&
            transition.preArcs.filter((arc) => {
                return arc.from === this.startPlace;
            }).length;

        if (this.uiService.button === ButtonState.Blitz) {
            if (!this.lastNode) {
                return true;
            } else {
                return this.dataService.isConnectionPossible(
                    this.lastNode,
                    transition,
                );
            }
        }

        return (
            (this.uiService.button === ButtonState.Move &&
                !this.editMoveElementsService.newAnchor) ||
            this.uiService.button === ButtonState.Select ||
            this.uiService.button === ButtonState.Delete ||
            (this.uiService.button === ButtonState.Arc &&
                !this.startTransition &&
                !hasPreArcFromStartPlace)
        ); // If the user starts dragging an arc from a transition he can only finish on a place --> transitions no longer editable
    }

    // Returns true if the provided arc can be edited and should be highlighted
    isArcEditable(arc: Arc): boolean {
        return (
            this.uiService.button === ButtonState.Anchor ||
            this.editMoveElementsService.newAnchor !== undefined ||
            this.uiService.button === ButtonState.Add ||
            (this.uiService.button === ButtonState.Remove &&
                Math.abs(arc.weight) > 1) || // Arc weights can only be decreased if the absolute value is > 1
            this.uiService.button === ButtonState.Delete
        );
    }

    openPlaceInvariantsTable(place: Place) {
        this.placeInvariantsService.selectedPlaceForPITable = place;
        this.matDialog.open(PlaceInvariantsTableComponent);
    }

    getNextLabel(label: string | undefined): string | undefined {
        const actions = this.dataService.getActions();
        if (label) {
            const labelIndex = actions.indexOf(label);
            if (labelIndex - 1 < actions.length) {
                return actions[labelIndex + 1];
            }
        } else {
            if (actions.length > 0) {
                return actions[0];
            }
        }
        return;
    }

    getLastLabel(label: string | undefined): string | undefined {
        const actions = this.dataService.getActions();
        if (label) {
            const labelIndex = actions.indexOf(label);
            if (labelIndex !== 0) {
                return actions[labelIndex - 1];
            }
        } else if (actions.length > 0) {
            return actions[actions.length - 1];
        }
        return;
    }

    protected readonly radius = radius;
    protected readonly placeIdYOffset = placeIdYOffset;

    protected readonly transitionWidth = transitionWidth;
    protected readonly transitionHeight = transitionHeight;
    protected readonly transitionXOffset = transitionXOffset;
    protected readonly transitionYOffset = transitionYOffset;
    protected readonly transitionIdYOffset = transitionIdYOffset;
    protected readonly transSilentWidth = transSilentWidth;
    protected readonly transSilentXOffset = transSilentXOffset;

    protected readonly TabState = TabState;
    protected readonly ButtonState = ButtonState;
}
