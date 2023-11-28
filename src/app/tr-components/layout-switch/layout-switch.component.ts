import { Component } from '@angular/core';
import { LayoutSpringEmbedderService } from 'src/app/tr-services/layout-spring-embedder.service';
import { SugyiamaLayoutService } from 'src/app/tr-services/sugyiamaLayout.service';

@Component({
  selector: 'app-layout-switch',
  templateUrl: './layout-switch.component.html',
  styleUrls: ['./layout-switch.component.css']
})
export class LayoutSwitchComponent {
    selected: string = "free";

    constructor(
        private layoutSpringEmebdderService: LayoutSpringEmbedderService,
        private sugyiamaLayoutService: SugyiamaLayoutService
    ) {}

    public layoutSwitchChanged() {
        if (this.selected == "spring-embedder") {
            this.layoutSpringEmebdderService.layoutSpringEmbedder();
        } else if (this.selected == "sugiyama") {
            // call sugiyama layout service
            this.sugyiamaLayoutService.applySugyiamaLayout();
        }
        // do we need to do something if the user selects "free"?
    }
}
