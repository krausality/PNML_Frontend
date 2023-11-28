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
    transitionIdYOffset
} from "../../tr-services/position.constants";
import { PnmlService } from "../../tr-services/pnml.service";
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { mathAbsPipe } from 'src/app/tr-pipes/math-abs.pipe';
import { UiService } from 'src/app/tr-services/ui.service';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Point } from 'src/app/tr-classes/petri-net/point';
import { Transition } from 'src/app/tr-classes/petri-net/transition';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { TokenGameService } from 'src/app/tr-services/token-game.service';

@Component({
    selector: 'app-petri-net',
    templateUrl: './petri-net.component.html',
    styleUrls: ['./petri-net.component.css']
})
export class PetriNetComponent {
    @Output('fileContent') fileContent: EventEmitter<string>;

    constructor(private parserService: ParserService, private httpClient: HttpClient, private fileReaderService: FileReaderService, protected dataService: DataService, protected exportJsonDataService: ExportJsonDataService, protected pnmlService: PnmlService, protected uiService: UiService, protected tokenGameService: TokenGameService) {
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
        if (this.uiService.button === "place") {
            // example method: can be deleted/replaced with final implementation
            this.addPlace(event, drawingArea);
        }
        if (this.uiService.button === "transition") {
            this.addTransition(event, drawingArea);
        }
    }

    dispatchSVGMouseDown(event: MouseEvent, drawingArea: HTMLElement) {

    }

    dispatchSVGMouseMove(event: MouseEvent, drawingArea: HTMLElement) {

    }

    dispatchSVGMouseUp(event: MouseEvent, drawingArea: HTMLElement) {

    }

    // Places
    dispatchPlaceClick(event: MouseEvent, place: Place) {
        if (this.uiService.tab === 'build') {
            let placeNode = place;
            // hardcoded place for testing
            // let placeNode = this.dataService.getPlaces()[0];
            // this.dataService.getArcs().push(new Arc(transitionNode, placeNode))

        }
    }

    dispatchPlaceMouseDown(event: MouseEvent, place: Place) {

    }

    dispatchPlaceMouseUp(event: MouseEvent, place: Place) {

    }

    // Transitions
    dispatchTransitionClick(event: MouseEvent, transition: Transition) {
        // Token game: fire transition
        if (this.uiService.tab === 'play') {
            this.tokenGameService.fire(transition);
        }
        // Add Arc:
        if (this.uiService.tab === 'build') {
            let transitionNode = transition;
            // hardcoded place for testing
            let placeNode = this.dataService.getPlaces()[0];
            this.dataService.getArcs().push(new Arc(transitionNode, placeNode))

        }
    }

    dispatchTransitionMouseDown(event: MouseEvent, transition: Transition) {

    }

    dispatchTransitionMouseUp(event: MouseEvent, transition: Transition) {

    }

    // Arcs
    dispatchArcClick(event: MouseEvent, arc: Arc) {

    }

    // ************************************************************************

    // Example method: can be deleted
    addPlace(event: MouseEvent, drawingArea: HTMLElement) {
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;
        let id = ((this.dataService.getPlaces().length) + 1).toString();
        this.dataService.getPlaces().push(new Place(0, new Point(x, y), "p" + id));
    }

    addTransition(event: MouseEvent, drawingArea: HTMLElement) {
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;
        let id = ((this.dataService.getTransitions().length) + 1).toString();
        this.dataService.getTransitions().push(new Transition(new Point(x, y), "t" + id));
    }

    // addArc(event: MouseEvent, drawingArea: HTMLElement) {
    //     const svgRect = drawingArea.getBoundingClientRect();
    //     let x = event.clientX - svgRect.left;
    //     let y = event.clientY - svgRect.top;
    //     let id = ((this.dataService.getTransitions().length) + 1).toString();
    //     this.dataService.getArcs().push(new Arc(new Point(x, y), "t" + id));
    // }

    protected readonly radius = radius;
    protected readonly placeIdYOffset = placeIdYOffset;

    protected readonly transitionWidth = transitionWidth;
    protected readonly transitionHeight = transitionHeight;
    protected readonly transitionXOffset = transitionXOffset;
    protected readonly transitionYOffset = transitionYOffset;
    protected readonly transitionIdYOffset = transitionIdYOffset;

}
