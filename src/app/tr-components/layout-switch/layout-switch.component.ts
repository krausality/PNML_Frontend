import { Component } from '@angular/core';
import { LayoutSpringEmbedderService } from 'src/app/tr-services/layout-spring-embedder.service';
import { LayoutSugyiamaService } from 'src/app/tr-services/layout-sugyiama.service';
import { showTooltipDelay } from 'src/app/tr-services/position.constants';

@Component({
    selector: 'app-layout-switch',
    templateUrl: './layout-switch.component.html',
    styleUrls: ['./layout-switch.component.css'],
})
export class LayoutSwitchComponent {
    protected readonly showTooltipDelay = showTooltipDelay;

    constructor(
        private layoutSpringEmebdderService: LayoutSpringEmbedderService,
        private layoutSugyiamaService: LayoutSugyiamaService,
    ) {}

    public applyLayout(layoutAlgorithm: string) {
        switch (layoutAlgorithm) {
            case 'spring-embedder':
                this.layoutSpringEmebdderService.layoutSpringEmbedder();
                break;
            case 'sugyiama':
                this.layoutSpringEmebdderService.terminate();
                this.layoutSugyiamaService.applySugyiamaLayout();
                break;
            default:
                this.layoutSpringEmebdderService.terminate();
                break;
        }
    }
}
