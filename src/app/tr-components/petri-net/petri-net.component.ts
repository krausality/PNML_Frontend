import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { ParserService } from 'src/app/tr-services/parser.service';
import { catchError, of, take } from 'rxjs';
import { FileReaderService } from "../../services/file-reader.service";
import { DataService } from "../../tr-services/data.service";
import { ExampleFileComponent } from "src/app/components/example-file/example-file.component";

import {
    radius,
    placeIdYOffset,
    transitionWidth,
    transitionHeight,
    transitionXOffset,
    transitionYOffset,
    transitionIdYOffset,
    anchorRadius
} from "../../tr-services/position.constants";
import { PnmlService } from "../../tr-services/pnml.service";
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { mathAbsPipe } from 'src/app/tr-pipes/math-abs.pipe';
import { UiService } from 'src/app/tr-services/ui.service';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Point } from 'src/app/tr-classes/petri-net/point';
import { Transition } from 'src/app/tr-classes/petri-net/transition';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { EditMoveElementsService } from 'src/app/tr-services/edit-move-elements.service';
import { ButtonState, TabState } from 'src/app/tr-enums/ui-state';
import { TokenGameService } from 'src/app/tr-services/token-game.service';
import { MatDialog } from '@angular/material/dialog';
import { SetActionPopupComponent } from '../set-action-popup/set-action-popup.component';
import { Node } from "src/app/tr-interfaces/petri-net/node";

@Component({
    selector: 'app-petri-net',
    templateUrl: './petri-net.component.html',
    styleUrls: ['./petri-net.component.css']
})
export class PetriNetComponent {
    @Output('fileContent') fileContent: EventEmitter<string>;

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
        protected editMoveElementsService: EditMoveElementsService
    ) {
        this.httpClient.get("assets/example.json", { responseType: "text" }).subscribe(data => {
            const [places, transitions, arcs, actions] = parserService.parse(data);
            this.dataService.places = places;
            this.dataService.transitions = transitions;
            this.dataService.arcs = arcs;
            this.dataService.actions = actions;
        });

        // this.httpClient.get("assets/example.pnml", { responseType: "text" }).subscribe(data => {
        //     const [places, transitions, arcs] = pnmlService.parse(data);
        //     this.dataService.places = places;
        //     this.dataService.transitions = transitions;
        //     this.dataService.arcs = arcs;
        // });
        this.fileContent = new EventEmitter<string>();
    }

    startTransition: Transition | undefined;
    startPlace: Place | undefined;

    private parsePetrinetData(content: string | undefined, contentType: string) {
        if (content) {
            // Use pnml parser if file type is pnml
            // we'll try the json parser for all other cases
            if (contentType === 'pnml') {
                const [places, transitions, arcs] = this.pnmlService.parse(content);
                this.dataService.places = places;
                this.dataService.transitions = transitions;
                this.dataService.arcs = arcs;
            } else {
                const [places, transitions, arcs, actions] = this.parserService.parse(content);
                this.dataService.places = places;
                this.dataService.transitions = transitions;
                this.dataService.arcs = arcs;

                this.dataService.actions = actions;
            }
        }
    }

    // Process Drag & Drop using Observables
    public processDropEvent(e: DragEvent) {
        e.preventDefault();

        const fileLocation = e.dataTransfer?.getData(ExampleFileComponent.META_DATA_CODE);

        if (fileLocation) {
            this.fetchFile(fileLocation);
        } else {
            this.readFile(e.dataTransfer?.files);
        }
    }

    private fetchFile(link: string) {
        this.httpClient.get(link, {
            responseType: 'text'
        }).pipe(
            catchError(err => {
                console.error('Error while fetching file from link', link, err);
                return of(undefined);
            }),
            take(1)
        ).subscribe(content => {
            this.parsePetrinetData(content, 'json');
            this.emitFileContent(content);
        })
    }

    private readFile(files: FileList | undefined | null) {
        if (files === undefined || files === null || files.length === 0) {
            return;
        }

        const file = files[0];

        // the file does not have a correct file type set,
        // extract type from file name
        const extension = file.name.split('.').pop();
        const fileType = extension ? extension : '';

        this.fileReaderService.readFile(files[0]).pipe(take(1)).subscribe(content => {
            this.parsePetrinetData(content, fileType);
            this.emitFileContent(content);
        });
    }

    private emitFileContent(content: string | undefined) {
        if (content === undefined) {
            return;
        }
        this.fileContent.emit(content);
    }

    public prevent(e: DragEvent) {
        // dragover must be prevented for drop to work
        e.preventDefault();
    }

    protected onWheelEventPlace(e: WheelEvent, place: Place) {

        if(this.uiService.button === ButtonState.Add) {
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


    // Dispatch methods for display events ************************************

    // SVG
    dispatchSVGClick(event: MouseEvent, drawingArea: HTMLElement) {
        if (this.uiService.button === ButtonState.Place) {
            // example method: can be deleted/replaced with final implementation
            this.addPlace(event, drawingArea);
        }
        if (this.uiService.button === ButtonState.Transition) {
            this.addTransition(event, drawingArea);
        }
    }

    dispatchSVGMouseDown(event: MouseEvent, drawingArea: HTMLElement) {

    }

    dispatchSVGMouseMove(event: MouseEvent, drawingArea: HTMLElement) {
        if (this.uiService.button === ButtonState.Move) {
            this.editMoveElementsService.moveNodeByMousePositionChange(event);
            this.editMoveElementsService.moveAnchorByMousePositionChange(event);
        }
    }

    dispatchSVGMouseUp(event: MouseEvent, drawingArea: HTMLElement) {
        if (this.uiService.button === ButtonState.Move) {
            this.editMoveElementsService.finalizeMove();
        }

        // Reset StartNode when Drag&Drop is cancelled
        if (this.uiService.button === ButtonState.Arc) {
            this.startTransition = undefined;
            this.startPlace = undefined;
        }
    }

    // Places
    dispatchPlaceClick(event: MouseEvent, place: Place) {
        if (this.uiService.button === ButtonState.Add) {
            place.token++;
        }

        if (this.uiService.button === ButtonState.Remove) {
            if(place.token>0) {
                place.token--;
            }
        }

        if (this.uiService.button === ButtonState.Delete) {
            this.dataService.removePlace(place);
        }
    }

    dispatchPlaceMouseDown(event: MouseEvent, place: Place) {
        if (this.uiService.button === ButtonState.Move) {
            this.editMoveElementsService.initializeNodeMove(event, place);
        }

        // Set StartNode for Arc
        if (this.uiService.button === ButtonState.Arc) {
            this.startPlace = place;
        }
    }

    dispatchPlaceMouseUp(event: MouseEvent, place: Place) {
        // Draw Arc with Place as EndNode
        if(this.startTransition && !this.isArcExisting(this.startTransition, place) && this.uiService.button === ButtonState.Arc) {
                const newArc: Arc = new Arc(this.startTransition, place, 1);
                this.startTransition.appendPostArc(newArc);
                this.dataService.getArcs().push(newArc);
                this.startTransition = undefined;
        }
    }

    // Transitions
    dispatchTransitionClick(event: MouseEvent, transition: Transition) {
        // Token game: fire transition
        if (this.uiService.tab === TabState.Play) {
            this.tokenGameService.fire(transition);
        } else if (this.uiService.tab === TabState.Build && this.uiService.button === ButtonState.Select) {
            this.matDialog.open(SetActionPopupComponent, {data: {node: transition}});
        }

        if (this.uiService.button === ButtonState.Delete) {
            this.dataService.removeTransition(transition);
        }

    }

    dispatchTransitionMouseDown(event: MouseEvent, transition: Transition) {
        if (this.uiService.button === ButtonState.Move) {
            this.editMoveElementsService.initializeNodeMove(event, transition);
        }

        // Set StartNode for Arc
        if (this.uiService.button === ButtonState.Arc) {
            this.startTransition = transition;
        }
    }

    dispatchTransitionMouseUp(event: MouseEvent, transition: Transition) {
        // Draw Arc with Transition as EndNode
        if(this.startPlace && !this.isArcExisting(this.startPlace, transition) && this.uiService.button === ButtonState.Arc){
            const newArc: Arc = new Arc(this.startPlace, transition, 1);
            transition.appendPreArc(newArc);
            this.dataService.getArcs().push(newArc);
            this.startPlace = undefined;
        }
    }

    // Arcs
    dispatchArcClick(event: MouseEvent, arc: Arc) {
        // Add Weight to Arc
        if (this.uiService.button === ButtonState.Add) {
            if(arc.weight>0) {
                arc.weight++;
            } else if(arc.weight<0) {
                arc.weight--;
            }
        }

        // Remove Weight from Arc
        if (this.uiService.button === ButtonState.Remove) {
            if(arc.weight>1) {
                arc.weight--;
            } else if(arc.weight<-1) {
                arc.weight++;
            }
        }

        if (this.uiService.button === ButtonState.Delete) {
            this.dataService.removeArc(arc);
        }
    }

    dispatchArcMouseDown(event: MouseEvent, arc: Arc, drawingArea: HTMLElement) {

    }

    dispatchLineSegmentMouseDown(event: MouseEvent, arc: Arc, lineSegment: Point[], drawingArea: HTMLElement) {
        if (this.uiService.button === ButtonState.Anchor) {
            this.editMoveElementsService.insertAnchorIntoLineSegmentStart(event, arc, lineSegment, drawingArea);
        }
    }

    // Anchors
    dispatchAnchorMouseDown(event: MouseEvent, anchor: Point) {
        if (this.uiService.button === ButtonState.Move) {
            this.editMoveElementsService.initializeAnchorMove(event, anchor);
        }
    }

    // ************************************************************************

    addPlace(event: MouseEvent, drawingArea: HTMLElement) {
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;
        let id = ((this.dataService.getPlaces().length) + 1).toString();
        this.dataService.getPlaces().push(new Place(0, new Point(x, y), this.getPlaceId()))
    }

    addTransition(event: MouseEvent, drawingArea: HTMLElement) {
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;
        let id = ((this.dataService.getTransitions().length) + 1).toString();
        this.dataService.getTransitions().push(new Transition(new Point(x, y), this.getTransitionId()));
    }

    getPlaceId(): string{
        let i = 1;
        let found = false;
        let id: string = "";
        let placeIds: string[] = [];
        this.dataService.getPlaces().forEach(place => {
            placeIds.push(place.id);
        });
        while(!found){
            id = "p" + i;
            if(placeIds.indexOf(id) === -1){
                found = true;
            }
            i++;
        }
        return id;
    }

    getTransitionId(): string{
        let i = 1;
        let found = false;
        let id: string = "";
        let transitionIds: string[] = [];
        this.dataService.getTransitions().forEach(transition => {
            transitionIds.push(transition.id);
        });
        while(!found){
            id = "t" + i;
            if(transitionIds.indexOf(id) === -1){
                found = true;
            }
            i++;
        }
        return id;
    }

    isArcExisting(startNode: Node, endNote: Node): boolean {
        return this.dataService.getArcs().some(arc => arc.from === startNode && arc.to === endNote);
    }

    // returns true if the provided place can be edited and should be highlighted
    isPlaceEditable(place: Place): boolean {
        return (this.uiService.button === ButtonState.Move && !this.editMoveElementsService.newAnchor)
            || this.uiService.button === ButtonState.Add
            || (this.uiService.button === ButtonState.Remove && place.token > 0) // tokens can only be removed if the number of tokens in a place is > 0
            || this.uiService.button === ButtonState.Delete
            || (this.uiService.button === ButtonState.Arc && !this.startPlace); // if the user starts dragging an arc from a place he can only finish on a transition --> places are no longer editable
    }

    // returns true if transitions can be edited and should be highlighted
    isTransitionEditable(): boolean {
        return (this.uiService.button === ButtonState.Move && !this.editMoveElementsService.newAnchor)
            || this.uiService.button === ButtonState.Select
            || this.uiService.button === ButtonState.Delete
            || (this.uiService.button === ButtonState.Arc && !this.startTransition); // if the user starts dragging an arc from a transition he can only finish on a place --> transitions no longer editable
    }

    // returns true if the provided arc can be edited and should be highlighted
    isArcEditable(arc: Arc): boolean {
        return (this.uiService.button === ButtonState.Anchor  || this.editMoveElementsService.newAnchor !== undefined)
            || this.uiService.button === ButtonState.Add
            || (this.uiService.button === ButtonState.Remove && Math.abs(arc.weight) > 1) // arc weights can only be decreased if the absolute value is > 1
            || this.uiService.button === ButtonState.Delete;
    }

    protected readonly radius = radius;
    protected readonly placeIdYOffset = placeIdYOffset;

    protected readonly transitionWidth = transitionWidth;
    protected readonly transitionHeight = transitionHeight;
    protected readonly transitionXOffset = transitionXOffset;
    protected readonly transitionYOffset = transitionYOffset;
    protected readonly transitionIdYOffset = transitionIdYOffset;

    protected readonly anchorRadius = anchorRadius;

    protected readonly TabState = TabState;
    protected readonly ButtonState = ButtonState;

}
