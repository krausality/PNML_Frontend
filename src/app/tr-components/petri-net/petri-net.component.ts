import { HttpClient } from '@angular/common/http';
import {
    Component,
    Input,
    OnDestroy,
    OnInit,
    ViewChild, // Import ViewChild
    ElementRef, // Import ElementRef
    AfterViewInit, // Import AfterViewInit
} from '@angular/core';
import { ParserService } from 'src/app/tr-services/parser.service';
import { take, Subscription } from 'rxjs';
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
    showTooltipDelay,
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
import { SvgCoordinatesService } from 'src/app/tr-services/svg-coordinates-service';
import { PlaceInvariantsService } from 'src/app/tr-services/place-invariants.service';
import { PlaceInvariantsTableComponent } from '../place-invariants-table/place-invariants-table.component';
import { DummyArc } from 'src/app/tr-classes/petri-net/dummyArc';
import { ErrorPopupComponent } from '../error-popup/error-popup.component';
import { validateJsonAgainstSchema } from 'src/app/tr-utils/json.utils';
import { LayoutSugiyamaService } from '../../tr-services/layout-sugiyama.service';

@Component({
    selector: 'app-petri-net',
    templateUrl: './petri-net.component.html',
    styleUrls: ['./petri-net.component.css'],
})
export class PetriNetComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() buttonState: ButtonState | undefined;

    // Marks selected node in Blitz tool
    lastNode: Node | null = null;
    // Marks node that will be selected
    nextNode: Node | null = null;
    // Attribute is set when the user tries to connect two nodes of the same type
    addElement: boolean = true;

    /**
     * Radius für Ankerpunkte auf Kanten. Beeinflusst die Größe der klickbaren/sichtbaren Bereiche
     * für die Manipulation von Kantenverläufen.
     * Wird vermutlich durch eine importierte Konstante initialisiert.
     */
    public anchorRadius = anchorRadius;

    /**
     * Trennzeichen, das in Beschriftungen verwendet wird, um Zeilenumbrüche zu signalisieren.
     * Nützlich für die Darstellung von mehrzeiligen Namen oder Bezeichnern.
     * Wird vermutlich durch eine importierte Konstante initialisiert.
     */
    public lineSeparator = lineSeparator;

    /**
     * Verzögerungszeit in Millisekunden, bevor ein Tooltip angezeigt wird, wenn der Benutzer
     * mit der Maus über ein Element fährt. Verhindert störendes Aufblitzen bei schnellen Mausbewegungen.
     * Wird vermutlich durch eine importierte Konstante initialisiert.
     */
    public showTooltipDelay = showTooltipDelay; // Expose tooltip delay constant

    @ViewChild('drawingArea') drawingArea!: ElementRef<SVGElement>; // Added for type safety    // Simulation related variables
    simulationFiringSeq: any | null = null;
    simulationDetailedLog: any | null = null;
    currentSimulationStep: number = 0;
    isSimulating: boolean = false;

    // Local data copies for animation (to prevent data service errors)
    private animationPlaces: Place[] = [];
    private animationTransitions: Transition[] = [];
    private animationArcs: Arc[] = [];
    private initialMarkings: Map<string, number> = new Map();
    private currentStepBeingDisplayed: number = -1; // To avoid re-processing the same step
    private animationTimer: any = null; // Added to manage setTimeout
    private readonly ANIMATION_DELAY = 1000; // Example delay

    private _subs: Subscription[] = [];
    private viewInitialized = false; // Flag to track if view is initialized

    // --- Animation State (Vorbereitung für PNML-Animation) ---
    // private animationFiringSeq: any = null; // Duplicate, remove this line
    // private animationDetailedLog: any = null; // Duplicate, remove this line
    // private animationStepIndex: number = 0; // Duplicate, remove this line
    // private animationTimerId: any = null; // Duplicate, remove this line
    // private isAnimationRunning: boolean = false; // Duplicate, remove this line
    // private animationSubscriptions: Subscription[] = []; // Duplicate, remove this line
    // --------------------------------------------------------

    constructor(
        private parserService: ParserService,
        private httpClient: HttpClient,
        private fileReaderService: FileReaderService,
        protected dataService: DataService,
        protected exportJsonDataService: ExportJsonDataService,
        protected pnmlService: PnmlService,
        public uiService: UiService, // Ensure UiService is public if accessed in template, or use getter
        protected tokenGameService: TokenGameService,
        private matDialog: MatDialog,
        public zoomService: ZoomService,
        protected editMoveElementsService: EditMoveElementsService,
        private layoutSugiyamaService: LayoutSugiyamaService,
        protected svgCoordinatesService: SvgCoordinatesService,
        protected placeInvariantsService: PlaceInvariantsService,
    ) {
        // Log constructor call
        console.log('PetriNetComponent Constructed');
    }

    ngOnInit(): void {
        this.uiService.buttonState$.subscribe((buttonState) => {
            if (buttonState !== ButtonState.Blitz) {
                this.dummyArc.points = [];
                this.lastNode = null;
            }
        });
        this._subs.push(
            this.dataService.dataChanged$.subscribe(() => {
                console.log('Data changed, view initialized:', this.viewInitialized); // Log data change
                if (this.viewInitialized) {
                    this.fitContentToView();
                }
            })
        );
        this._subs.push(
            this.uiService.simulationResults$.subscribe(results => {
                if (results && results.firing_seq) {
                    console.log('PetriNetComponent: Received simulation results from UiService', results);
                    this.initializeAnimationAndTimeline(results); // Method name was startAnimation, changed to initializeAnimationAndTimeline
                } else if (!results) {
                    console.log('PetriNetComponent: Simulation results cleared.');
                    this.uiService.resetSimulationSteps();
                    this.isSimulating = false;
                    this.simulationFiringSeq = null;
                    this.simulationDetailedLog = null;
                    this.initialMarkings.clear();
                    this.currentStepBeingDisplayed = -1;
                    this.clearAllTransitionHighlights();
                    this.dataService.triggerDataChanged();
                }
            })
        );

        // Subscribe to animation state to start/stop autoplay
        this._subs.push(
            this.uiService.getAnimationState$().subscribe(isRunning => {
                if (isRunning && this.uiService.tab === TabState.Play && this.isSimulating) {
                    console.log('PetriNetComponent: Starting/Resuming autoplay animation');
                    this.animateNextStep();
                } else if (!isRunning) {
                    console.log('PetriNetComponent: Animation state is false.');
                    if (this.animationTimer) {
                        clearTimeout(this.animationTimer);
                        this.animationTimer = null;
                    }
                }
            })
        );

        // Subscribe to currentTimelineStep$ from UiService to update display on scrub/step
        this._subs.push(
            this.uiService.currentSimulationStep$.subscribe(step => {
                if (this.uiService.hasSimulationData() && !this.uiService.isAnimationRunning() && step !== this.currentStepBeingDisplayed) {
                    console.log(`PetriNetComponent: currentSimulationStep$ changed to ${step} via UI, updating display.`);
                    this.displayStateForStep(step);
                }
            })
        );
    }

    ngAfterViewInit(): void {
        this.viewInitialized = true;
        console.log('View initialized.'); // Log view init
        // Fit content initially if data is already present and view is ready
        if (!this.dataService.isEmpty()) {
            console.log('View initialized with existing data, fitting content.'); // Log initial fit
            this.fitContentToView();
        }
    }    ngOnDestroy(): void {
        this._subs.forEach((sub) => sub.unsubscribe());
        
        // Clean up animation if running
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
        
        // Stop any running animation
        if (this.uiService.isAnimationRunning()) {
            this.uiService.stopAnimation();
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
        console.log('parsePetrinetData: Started', { contentType }); // Log start
        if (content) {
            console.log('parsePetrinetData: Content exists'); // Log content check
            // Variable to parse the data into
            let parsedData: [
                Array<Place>,
                Array<Transition>,
                Array<Arc>,
                Array<string>,
            ];

            try {
                console.log('parsePetrinetData: Entering parsing try block'); // Log try block
                // Use pnml parser if file type is pnml
                // we'll try the json parser for all other cases
                if (contentType === CodeEditorFormat.PNML) {
                    console.log('parsePetrinetData: Using PnmlService.parse'); // Log PNML parse
                    parsedData = this.pnmlService.parse(content);
                } else {
                    console.log('parsePetrinetData: Using ParserService.parse'); // Log JSON parse
                    parsedData = this.parserService.parse(content);
                }
                console.log('parsePetrinetData: Parsing successful'); // Log parse success
            } catch (error) {
                console.error('parsePetrinetData: Parsing error caught', error); // Log error
                this.matDialog.open(ErrorPopupComponent, {
                    data: {
                        parsingError: error,
                        schemaValidationErrors: false,
                    },
                });
                console.log('parsePetrinetData: Exiting due to parsing error', error); // Log exit on error
                return; // Exit if parsing fails
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

            console.log('parsePetrinetData: Destructuring parsed data'); // Log data assignment
            // Destructure the parsed data and overwrite the corresponding parameters
            // in the data service
            const [places, transitions, arcs, actions] = parsedData;
            this.dataService.places = places;
            this.dataService.transitions = transitions;
            this.dataService.arcs = arcs;
            this.dataService.actions = actions;
            console.log(`parsePetrinetData: DataService updated with ${places.length}p, ${transitions.length}t, ${arcs.length}a`); // Log data update

            // Apply layout if needed
            let layoutApplied = false;
            console.log('parsePetrinetData: Checking if layout is needed'); // Log layout check
            if (
                contentType !== CodeEditorFormat.PNML &&
                this.parserService.incompleteLayoutData
            ) {
                console.log('parsePetrinetData: Applying Sugiyama layout (JSON incomplete)'); // Log layout apply (JSON)
                this.layoutSugiyamaService.applySugiyamaLayout();
                layoutApplied = true;
            }

            if (
                contentType === CodeEditorFormat.PNML &&
                this.pnmlService.incompleteLayoutData
            ) {
                console.log('parsePetrinetData: Applying Sugiyama layout (PNML incomplete)'); // Log layout apply (PNML)
                this.layoutSugiyamaService.applySugiyamaLayout();
                layoutApplied = true;
            }
            console.log('parsePetrinetData: Layout check complete. Layout applied:', layoutApplied); // Log layout result

            // Trigger data changed event AFTER potential layout changes
            // This will trigger fitContentToView via the subscription
            console.log('parsePetrinetData: About to call triggerDataChanged()'); // Log before trigger
            this.dataService.triggerDataChanged();
            console.log('parsePetrinetData: triggerDataChanged() called successfully'); // Log after trigger

        } else {
            console.warn('parsePetrinetData: Content was empty or undefined'); // Log empty content case
            // If content is empty/undefined, clear data and trigger change
            this.dataService.clearAll(); // clearAll already triggers dataChanged
        }
        console.log('parsePetrinetData: Finished'); // Log end
    }

    /**
     * Calls the ZoomService to fit the content to the current view dimensions.
     */
    private fitContentToView(): void {
        console.log('Attempting fitContentToView...'); // Log entry
        // Ensure the drawing area element is available and view is initialized
        if (this.drawingArea?.nativeElement && this.viewInitialized) {
            const rect = this.drawingArea.nativeElement.getBoundingClientRect();
            console.log('Drawing area rect:', rect.width, 'x', rect.height); // Log dimensions
            if (rect.width > 0 && rect.height > 0) {
                this.zoomService.fitContent(rect.width, rect.height);
            } else {
                console.log('Drawing area dimensions are 0, using requestAnimationFrame fallback.'); // Log fallback
                // Fallback or retry logic if dimensions are 0 initially
                // For example, use setTimeout to try again shortly after
                // Use requestAnimationFrame for better timing related to rendering
                requestAnimationFrame(() => {
                    if (this.drawingArea?.nativeElement) {
                        const currentRect = this.drawingArea.nativeElement.getBoundingClientRect();
                        console.log('Drawing area rect (fallback):', currentRect.width, 'x', currentRect.height); // Log fallback dimensions
                        if (currentRect.width > 0 && currentRect.height > 0) {
                            this.zoomService.fitContent(currentRect.width, currentRect.height);
                        } else {
                            console.error('Drawing area dimensions still 0 in fallback.'); // Log error if still 0
                        }
                    }
                });
            }
        } else {
            console.warn('fitContentToView called but drawingArea or view not ready.', this.drawingArea, this.viewInitialized); // Log warning if called too early
        }
    }

    /**
     * Resets the view by fitting the current content to the drawing area.
     * Called by the reset button.
     */
    public resetViewToFitContent(): void {
        console.log('PetriNetComponent: resetViewToFitContent() called by button.'); // Log button click
        this.fitContentToView();
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
        console.log('PetriNetComponent.readFile: Called with files:', files); // Log entry
        if (files === undefined || files === null || files.length === 0) {
            console.warn('PetriNetComponent.readFile: No files provided.'); // Log no files
            return;
        }

        const file = files[0];
        console.log('PetriNetComponent.readFile: Processing file:', file.name, file.type); // Log file info

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
        console.log('PetriNetComponent.readFile: Determined fileType:', fileType); // Log file type

        console.log('PetriNetComponent.readFile: Calling FileReaderService.readFile'); // Log before service call
        this.fileReaderService
            .readFile(files[0])
            .pipe(take(1))
            .subscribe({
                next: (content) => {
                    console.log('PetriNetComponent.readFile: FileReaderService emitted content (length:', content?.length, ')'); // Log success
                    this.parsePetrinetData(content, fileType);
                    this.emitFileContent(content);
                },
                error: (err) => {
                    console.error('PetriNetComponent.readFile: FileReaderService threw error:', err); // Log error
                },
                complete: () => {
                    console.log('PetriNetComponent.readFile: FileReaderService completed.'); // Log completion
                }
            });
        console.log('PetriNetComponent.readFile: Subscription to FileReaderService set up.'); // Log subscription setup
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
                this.dataService.triggerDataChanged(); // Trigger change after adding place
                this.lastNode = place;
            } else if (this.lastNode instanceof Place) {
                // Last Node was a Place
                if (this.nextNode instanceof Transition) {
                    // Connecting the Place to an existing Transition
                    const transition = this.nextNode;
                    this.dataService.connectNodes(this.lastNode, transition);
                    this.dataService.triggerDataChanged(); // Trigger change after adding arc
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
                    this.dataService.triggerDataChanged(); // Trigger change after adding transition
                    this.dataService.connectNodes(this.lastNode, transition);
                    this.dataService.triggerDataChanged(); // Trigger change after adding arc
                    this.lastNode = transition;
                }
            } else if (this.lastNode instanceof Transition) {
                // Last Node was a Transition
                if (this.nextNode instanceof Place) {
                    // Connecting the Transition to an existing Place
                    const place = this.nextNode;
                    this.dataService.connectNodes(this.lastNode, place);
                    this.dataService.triggerDataChanged(); // Trigger change after adding arc
                    this.lastNode = this.nextNode;
                } else if (this.nextNode instanceof Transition) {
                    // If a Transition is clicked the selected Node is changed
                    this.lastNode = this.nextNode;
                } else if (!this.nextNode) {
                    // Click on the Canvas
                    const place = this.createPlace(event, drawingArea);
                    this.dataService.getPlaces().push(place);
                    this.dataService.triggerDataChanged(); // Trigger change after adding place
                    this.dataService.connectNodes(this.lastNode, place);
                    this.dataService.triggerDataChanged(); // Trigger change after adding arc
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
            this.dataService.triggerDataChanged(); // Trigger change after adding transition
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
            this.dataService.triggerDataChanged(); // Trigger change after adding arc
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
            this.dataService.triggerDataChanged(); // Trigger change after adding arc
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
            this.dataService.triggerDataChanged(); // Trigger change after adding anchor
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
            this.dataService.removeAnchor(anchor); // removeAnchor already triggers dataChanged
        }
    }

    // ************************************************************************

    addPlace(event: MouseEvent, drawingArea: HTMLElement) {
        const place = this.createPlace(event, drawingArea);
        this.dataService.getPlaces().push(place);
        this.dataService.triggerDataChanged(); // Trigger change after adding place
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
        this.dataService.triggerDataChanged(); // Trigger change after adding transition
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
            if (labelIndex + 1 < actions.length) { // Corrected boundary check
                return actions[labelIndex + 1];
            }
        } else {
            if (actions.length > 0) {
                return actions[0];
            }
        }
        return; // Return undefined if no next label
    }

    getLastLabel(label: string | undefined): string | undefined {
        const actions = this.dataService.getActions();
        if (label) {
            const labelIndex = actions.indexOf(label);
            if (labelIndex > 0) { // Corrected boundary check
                return actions[labelIndex - 1];
            }
        } else if (actions.length > 0) {
            return actions[actions.length - 1];
        }
        return; // Return undefined if no previous label
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
    protected readonly ButtonState = ButtonState;    // Method to start the simulation animation
    // Renamed to initializeAnimationAndTimeline to avoid conflict and match usage
    private initializeAnimationAndTimeline(results: { firing_seq: any, detailed_log: any }): void {
        console.log('PetriNetComponent: initializeAnimationAndTimeline called with', results);

        let firingSeqArray: { transition_id: string }[] = [];
        const transitions = this.dataService.getTransitions();

        if (Array.isArray(results.firing_seq)) {
            firingSeqArray = results.firing_seq.map((step: any) => {
                if (typeof step === 'string') return transitions.find(t => t.id === step) ? { transition_id: step } : null;
                if (typeof step === 'number' && transitions[step]) return { transition_id: transitions[step].id };
                if (step && typeof step === 'object' && step.transition_id && transitions.find(t => t.id === step.transition_id)) return step;
                return null;
            }).filter((s: any): s is { transition_id: string } => s !== null);
        } else if (results.firing_seq && typeof results.firing_seq === 'object') {
            const keys = Object.keys(results.firing_seq).sort((a, b) => Number(a) - Number(b));
            firingSeqArray = keys.map(key => {
                const val = results.firing_seq[key];
                if (typeof val === 'string' && transitions.find(t => t.id === val)) return { transition_id: val };
                if (typeof val === 'number' && transitions[val]) return { transition_id: transitions[val].id };
                return null;
            }).filter((s: any): s is { transition_id: string } => s !== null);
        } else {
            console.error('Invalid firing_seq format:', results.firing_seq);
            this.uiService.resetSimulationSteps();
            return;
        }

        this.simulationFiringSeq = firingSeqArray;
        this.simulationDetailedLog = results.detailed_log;
        this.isSimulating = true;

        this.initialMarkings.clear();
        this.dataService.getPlaces().forEach(place => {
            this.initialMarkings.set(place.id, place.token);
        });
        console.log('PetriNetComponent: Initial markings stored:', this.initialMarkings);

        this.uiService.setTotalSimulationSteps(this.simulationFiringSeq.length);
        this.uiService.setCurrentSimulationStep(0);
        this.currentStepBeingDisplayed = -1; 
        this.displayStateForStep(0);

        console.log('PetriNetComponent: Simulation data initialized for timeline and animation.');
    }    private createAnimationDataCopies(): void {
        console.log('PetriNetComponent: Creating local data copies for animation');
        try {
            // Deep copy places with their current token state
            this.animationPlaces = this.dataService.getPlaces().map(place => {
                const copy = new Place(place.token, place.position, place.id, place.label);
                return copy;
            });

            // Deep copy transitions 
            this.animationTransitions = this.dataService.getTransitions().map(transition => {
                const copy = new Transition(transition.position, transition.id, transition.label);
                return copy;
            });

            // Deep copy arcs
            this.animationArcs = this.dataService.getArcs().map(arc => {
                const copy = new Arc(arc.from, arc.to, arc.weight);
                copy.anchors = [...arc.anchors];
                return copy;
            });

            console.log('PetriNetComponent: Animation data copies created successfully');
        } catch (error) {
            console.error('PetriNetComponent: Error creating animation data copies:', error);
        }
    }

    startAutoplayAnimation(): void {
        console.log('PetriNetComponent: startAutoplayAnimation called');
        if (!this.simulationFiringSeq || !this.isSimulating) {
            console.warn('PetriNetComponent: No simulation data available for autoplay');
            return;
        }

        if (this.uiService.tab !== TabState.Play) {
            console.warn('PetriNetComponent: Autoplay can only run in Play tab');
            return;
        }

        // Reset to beginning
        this.currentSimulationStep = 0;
        console.log('PetriNetComponent: Starting autoplay animation from step 0');
        this.animateNextStep();
    }

    private animateNextStep(): void {
        if (!this.isSimulating || !this.uiService.isAnimationRunning() || !this.simulationFiringSeq) {
            this.uiService.stopAnimation(); 
            return;
        }

        const currentStep = this.uiService.getCurrentSimulationStep(); // Use getter
        const totalSteps = this.uiService.getTotalSimulationSteps(); // Use getter

        if (currentStep >= totalSteps) {
            console.log('PetriNetComponent: Animation complete.');
            this.uiService.stopAnimation();
            if (totalSteps > 0) {
                this.displayStateForStep(totalSteps - 1, true);
            }
            return;
        }

        console.log(`PetriNetComponent: Animating step ${currentStep + 1}/${totalSteps}`);
        this.displayStateForStep(currentStep, false);
        this.currentStepBeingDisplayed = currentStep;


        this.animationTimer = setTimeout(() => {
            if (!this.uiService.isAnimationRunning()) return;

            const stepData = this.simulationFiringSeq![currentStep]; 
            if (stepData && stepData.transition_id) {
                const transitionToFire = this.dataService.getTransitions().find(t => t.id === stepData.transition_id);
                if (transitionToFire) {
                    this.applyTransitionFiringToMarkings(transitionToFire);
                }
            }
            this.dataService.triggerDataChanged();

            const nextStepIndex = currentStep + 1;
            this.uiService.setCurrentSimulationStep(nextStepIndex); 

            if (nextStepIndex < totalSteps) {
                this.animateNextStep();
            } else {
                console.log('PetriNetComponent: Animation reached end.');
                this.uiService.stopAnimation();
                 this.displayStateForStep(totalSteps - 1, true);
            }
        }, this.ANIMATION_DELAY);
    }

    private displayStateForStep(stepIndex: number, isFinalStateAfterFiring: boolean = false): void {
        // ...  
        if (!this.isSimulating || !this.simulationFiringSeq || !this.simulationDetailedLog) {
            console.warn('PetriNetComponent: displayStateForStep called without simulation data.');
            return;
        }
        // Prevent re-rendering the same state if called multiple times for the same step
        // However, allow if isFinalStateAfterFiring changes, as that implies a different highlight logic
        if (stepIndex === this.currentStepBeingDisplayed && !isFinalStateAfterFiring && this._lastIsFinalState === isFinalStateAfterFiring) {
            // console.log(`PetriNetComponent: displayStateForStep already displayed step ${stepIndex}. Final: ${isFinalStateAfterFiring}`);
            // return;
        }

        console.log(`PetriNetComponent: Displaying state for step ${stepIndex}. Final state: ${isFinalStateAfterFiring}`);
        this.currentStepBeingDisplayed = stepIndex;
        this._lastIsFinalState = isFinalStateAfterFiring;


        this.dataService.getPlaces().forEach(place => {
            place.token = this.initialMarkings.get(place.id) ?? 0;
        });

        const simulateUpTo = isFinalStateAfterFiring ? stepIndex : stepIndex - 1;
        for (let i = 0; i <= simulateUpTo; i++) {
            if (i < this.simulationFiringSeq.length) {
                const stepData = this.simulationFiringSeq[i];
                const transitionToFire = this.dataService.getTransitions().find(t => t.id === stepData.transition_id);
                if (transitionToFire) {
                    this.applyTransitionFiringToMarkings(transitionToFire);
                } else {
                     console.warn(`Transition with ID ${stepData.transition_id} not found for step ${i}`);
                }
            }
        }

        this.clearAllTransitionHighlights();
        const detailedLogKey = String(stepIndex);
        const detailedLogEntry = this.simulationDetailedLog[detailedLogKey];

        if (detailedLogEntry) {
            const transitionToFireId = detailedLogEntry.transition_to_fire || (this.simulationFiringSeq[stepIndex] ? this.simulationFiringSeq[stepIndex].transition_id : null);

            if (!isFinalStateAfterFiring && transitionToFireId) {
                this.highlightTransition(transitionToFireId, 'next-to-fire');
            } else if (isFinalStateAfterFiring && stepIndex >= 0 && stepIndex < this.simulationFiringSeq.length) {
                 // Highlight the transition that *just* fired at stepIndex
                const firedTransitionId = this.simulationFiringSeq[stepIndex].transition_id;
                if(firedTransitionId) this.highlightTransition(firedTransitionId, 'fired');
            }


            if (!isFinalStateAfterFiring && detailedLogEntry.enabled_transitions && Array.isArray(detailedLogEntry.enabled_transitions)) {
                detailedLogEntry.enabled_transitions.forEach((id: string) => {
                    if (id !== transitionToFireId) {
                        this.highlightTransition(id, 'enabled');
                    }
                });
            }
        } else if (stepIndex === 0 && !isFinalStateAfterFiring) {
            const initialLogEntry = this.simulationDetailedLog["0"];
            if(initialLogEntry && initialLogEntry.enabled_transitions && Array.isArray(initialLogEntry.enabled_transitions)) {
                const transitionToFireId = initialLogEntry.transition_to_fire || (this.simulationFiringSeq[0] ? this.simulationFiringSeq[0].transition_id : null);
                initialLogEntry.enabled_transitions.forEach((id: string) => {
                   this.highlightTransition(id, id === transitionToFireId ? 'next-to-fire' : 'enabled');
                });
            }
        } else if (isFinalStateAfterFiring && stepIndex >= 0 && stepIndex < this.simulationFiringSeq.length) {
             // This case is for showing the state *after* transition at stepIndex fired.
             const firedTransitionId = this.simulationFiringSeq[stepIndex].transition_id;
             this.highlightTransition(firedTransitionId, 'fired');
        }


        this.dataService.triggerDataChanged();
    }
    private _lastIsFinalState: boolean | undefined = undefined; // Helper for displayStateForStep re-entry check


    private applyTransitionFiringToMarkings(transition: Transition): void {
        // ...  
        if (!transition) return;
        transition.preArcs.forEach(arc => {
            const place = arc.from as Place;
            const placeFromDs = this.dataService.getPlaces().find(p => p.id === place.id);
            if (placeFromDs) {
                placeFromDs.token = Math.max(0, placeFromDs.token + arc.weight);
            }
        });
        transition.postArcs.forEach(arc => {
            const place = arc.to as Place;
            const placeFromDs = this.dataService.getPlaces().find(p => p.id === place.id);
            if (placeFromDs) {
                placeFromDs.token += arc.weight;
            }
        });
    }

    public stopAnimation(): void {
        console.log('PetriNetComponent: stopAnimation called directly');
        this.uiService.stopAnimation(); 
        const currentStep = this.uiService.getCurrentSimulationStep(); // Use getter
        if (this.uiService.hasSimulationData() && currentStep !== this.currentStepBeingDisplayed) {
             this.displayStateForStep(currentStep);
        } else if (this.uiService.hasSimulationData()) {
            this.displayStateForStep(currentStep, false); 
        }
    }

    public onTimelineStepChanged(newStep: number): void {
        console.log(`PetriNetComponent: Timeline step changed to ${newStep}`);
        if (this.uiService.isAnimationRunning()) {
            this.uiService.stopAnimation();
        }
        this.uiService.setCurrentSimulationStep(newStep);
        // The subscription to uiService.currentSimulationStep$ will call displayStateForStep
        // if the step is different and animation is not running.
        // Explicitly call if the subscription might not catch it or to ensure immediate update:
        if (!this.uiService.isAnimationRunning()) {
             this.displayStateForStep(newStep);
        }
    }

    private highlightTransition(transitionId: string, state: 'enabled' | 'fired' | 'next-to-fire'): void {
        // ... (implementation from email, ensure all states are handled in CSS)
        const transitionElement = document.querySelector(`rect[data-transition-id="${transitionId}"]`);
        if (transitionElement) {
            transitionElement.classList.remove('animation-enabled', 'animation-fired', 'animation-next-to-fire');
            if (state === 'enabled') {
                transitionElement.classList.add('animation-enabled');
            } else if (state === 'fired') {
                transitionElement.classList.add('animation-fired');
            } else if (state === 'next-to-fire') {
                transitionElement.classList.add('animation-next-to-fire');
            }
        } else {
            // console.warn(`Transition element with ID ${transitionId} not found for highlighting.`);
        }
    }

    clearAllTransitionHighlights(): void {
        // ...  
        const highlighted = document.querySelectorAll('.animation-enabled, .animation-fired, .animation-next-to-fire');
        highlighted.forEach(el => {
            el.classList.remove('animation-enabled', 'animation-fired', 'animation-next-to-fire');
        });
    }
    // ... other existing methods ...
}
