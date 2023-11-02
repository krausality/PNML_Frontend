import { Component } from '@angular/core';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Point } from 'src/app/tr-classes/petri-net/point';
import { Transition } from 'src/app/tr-classes/petri-net/transition';
import {DataService} from "../../services/data.service";

@Component({
  selector: 'app-petri-net',
  templateUrl: './petri-net.component.html',
  styleUrls: ['./petri-net.component.css']
})
export class PetriNetComponent {
  places: Place[] = [];
  transitions: Transition[] = [];
  arcs: Arc[] = [];
  dataService:DataService;

  constructor(dataService:DataService){
      this.dataService = dataService;


    dataService.mockData();

    this.places = dataService.getPlaces();
    this.transitions = dataService.getTransitions();
    this.arcs = dataService.getArcs();
  }
}
