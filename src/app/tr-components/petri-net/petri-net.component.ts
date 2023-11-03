import {Component, OnInit} from '@angular/core';
import {DataService} from "../../tr-services/data.service";

@Component({
  selector: 'app-petri-net',
  templateUrl: './petri-net.component.html',
  styleUrls: ['./petri-net.component.css']
})
export class PetriNetComponent implements OnInit{
  dataService:DataService;

  constructor(dataService:DataService){
      this.dataService = dataService;
  }

    ngOnInit(): void {
        this.dataService.mockData();
    }
}
