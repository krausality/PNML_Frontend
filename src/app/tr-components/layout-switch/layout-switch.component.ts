import { Component } from '@angular/core';

@Component({
  selector: 'app-layout-switch',
  templateUrl: './layout-switch.component.html',
  styleUrls: ['./layout-switch.component.css']
})
export class LayoutSwitchComponent {
    selected: string = "free";

    constructor(/* layout services go here */) {}

    public layoutSwitchChanged() {
        if (this.selected == "spring-embedder") {
            // call spring embedder layout service
        } else if (this.selected == "sugiyama") {
            // call sugiyama layout service
        }
        // do we need to do something if the user selects "free"?
    }
}
