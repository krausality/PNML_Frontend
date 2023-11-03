import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Transition } from 'src/app/tr-classes/petri-net/transition';
import { ParserService } from 'src/app/tr-services/parser.service';
import { catchError, of, Subscription, take } from 'rxjs';
import { FileReaderService } from "../../services/file-reader.service";

@Component({
  selector: 'app-petri-net',
  templateUrl: './petri-net.component.html',
  styleUrls: ['./petri-net.component.css']
})
export class PetriNetComponent {
  @Output('fileContent') fileContent: EventEmitter<string>;

  places: Place[] = [];
  transitions: Transition[] = [];
  arcs: Arc[] = [];

  constructor(private parserService: ParserService, private httpClient: HttpClient, private fileReaderService: FileReaderService) {
    this.httpClient.get("assets/example.json", { responseType: "text" }).subscribe(data => {
      const [places, transitions, arcs] = parserService.parse(data);
      this.places = places;
      this.transitions = transitions;
      this.arcs = arcs;
    });

    this.fileContent = new EventEmitter<string>();
  }

  private parsePetrinetData(content: string | undefined) {
    console.log('Parsing data');
    if (content) {
      const [places, transitions, arcs] = this.parserService.parse(content);
      this.places = places;
      this.transitions = transitions;
      this.arcs = arcs;
    }
  }

  // Process Drag & Drop using Observables
  public processDropEvent(e: DragEvent) {
    console.log('caught processDropEvent');
    e.preventDefault();

    const fileLocation = e.dataTransfer?.getData("assets/example.json");

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
      this.parsePetrinetData(content);
      this.emitFileContent(content);
    })
  }

  private readFile(files: FileList | undefined | null) {
    if (files === undefined || files === null || files.length === 0) {
      return;
    }
    this.fileReaderService.readFile(files[0]).pipe(take(1)).subscribe(content => {
      this.parsePetrinetData(content);
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
}
