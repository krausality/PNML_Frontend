import {HttpClient} from '@angular/common/http';
import {Component} from '@angular/core';
import {ParserService} from 'src/app/tr-services/parser.service';
import {DataService} from "../../tr-services/data.service";

@Component({
    selector: 'app-petri-net',
    templateUrl: './petri-net.component.html',
    styleUrls: ['./petri-net.component.css']
})
export class PetriNetComponent {

    constructor(private parserService: ParserService, private httpClient: HttpClient, protected dataService: DataService) {

        this.httpClient.get("assets/example.json", {responseType: "text"}).subscribe(data => {
            const [places, transitions, arcs] = this.parserService.parse(data);
            this.dataService.places = places;
            this.dataService.transitions = transitions;
            this.dataService.arcs = arcs;
        });
    }
}
