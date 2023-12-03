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

@Component({
    selector: 'app-petri-net',
    templateUrl: './petri-net.component.html',
    styleUrls: ['./petri-net.component.css']
})
export class PetriNetComponent {
    @Output('fileContent') fileContent: EventEmitter<string>;

    constructor(private parserService: ParserService, private httpClient: HttpClient, private fileReaderService: FileReaderService, protected dataService: DataService, protected exportJsonDataService: ExportJsonDataService, protected pnmlService: PnmlService, protected uiService: UiService, protected tokenGameService: TokenGameService, protected editMoveElementsService: EditMoveElementsService) {
        this.httpClient.get("assets/example_more_anchors.json", { responseType: "text" }).subscribe(data => {
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

    // Dispatch methods for display events ************************************

    // SVG
    dispatchSVGClick(event: MouseEvent, drawingArea: HTMLElement) {
        if (this.uiService.button === ButtonState.Place) {
            // example method: can be deleted/replaced with final implementation
            this.addPlace(event, drawingArea);
        }
        if (this.uiService.button === ButtonState.Transition) {
            // Method for adding transition
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

    }

    // Places
    dispatchPlaceClick(event: MouseEvent, place: Place) {

    }

    dispatchPlaceMouseDown(event: MouseEvent, place: Place) {
        if (this.uiService.button === ButtonState.Move) {
            this.editMoveElementsService.initializeNodeMove(event, place);
        }
    }

    dispatchPlaceMouseUp(event: MouseEvent, place: Place) {

    }

    // Transitions
    dispatchTransitionClick(event: MouseEvent, transition: Transition) {
        // Token game: fire transition
        if (this.uiService.tab === TabState.Play) {
            this.tokenGameService.fire(transition);
        }
    }

    dispatchTransitionMouseDown(event: MouseEvent, transition: Transition) {
        if (this.uiService.button === ButtonState.Move) {
            this.editMoveElementsService.initializeNodeMove(event, transition);
        }
    }

    dispatchTransitionMouseUp(event: MouseEvent, transition: Transition) {

    }

    // Arcs
    dispatchArcClick(event: MouseEvent, arc: Arc) {

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

    // Example method: can be deleted
    addPlace(event: MouseEvent, drawingArea: HTMLElement) {
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;
        this.dataService.getPlaces().push(new Place(0, new Point(x, y), 'p' + x + y))
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
