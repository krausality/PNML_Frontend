import { Component } from '@angular/core';
import { LayoutSpringEmbedderService } from 'src/app/tr-services/layout-spring-embedder.service';

@Component({
  selector: 'app-layout-switch',
  templateUrl: './layout-switch.component.html',
  styleUrls: ['./layout-switch.component.css']
})
export class LayoutSwitchComponent {
    selected: string = "free";

    constructor(private layoutSpringEmebdderService: LayoutSpringEmbedderService /* layout services go here */) {}

    public layoutSwitchChanged() {
        if (this.selected == "spring-embedder") {
            this.layoutSpringEmebdderService.layoutSpringEmbedder();
        } else if (this.selected == "sugiyama") {
            // call sugiyama layout service
        }
        // do we need to do something if the user selects "free"?
    }
}
