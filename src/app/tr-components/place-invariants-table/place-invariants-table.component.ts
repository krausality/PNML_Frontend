import { Component } from '@angular/core';
import { PlaceInvariantsService } from 'src/app/tr-services/place-invariants.service';

@Component({
    selector: 'app-place-invariants-table',
    templateUrl: './place-invariants-table.component.html',
    styleUrls: ['./place-invariants-table.component.css']
})
export class PlaceInvariantsTableComponent {

    constructor(protected placeInvariantsService: PlaceInvariantsService) {}

}
