/**
 * @file app.module.ts
 * @description This file defines the root module of the PNML_Frontend application.
 * It imports and declares all the necessary Angular Material modules, custom components,
 * services, and pipes required for the application to function.
 *
 * The application is structured modularly to enhance maintainability and scalability.
 * Key modules and their roles:
 * - **BrowserModule**: Essential for running Angular applications in a browser.
 * - **FlexLayoutModule**: Provides a flexible layout system for arranging components.
 * - **BrowserAnimationsModule**: Enables Angular animations.
 * - **HttpClientModule**: Allows the application to make HTTP requests.
 * - **ReactiveFormsModule**: Supports reactive forms for handling user input.
 * - **Angular Material Modules (MatFormFieldModule, MatInputModule, etc.)**:
 *   Provide a rich set of UI components following Material Design principles.
 *
 * Custom components are organized into logical groups:
 * - `components`: Contains general-purpose UI components like `DisplayComponent` and `FooterComponent`.
 * - `tr-components`: Contains components specific to the Petri Net functionality,
 *   such as `PetriNetComponent`, `ButtonBarComponent`, and various pop-up dialogs.
 *
 * Services are grouped under `services` and `tr-services`:
 * - `services`: General application services like `FileReaderService`.
 * - `tr-services`: Services dedicated to Petri Net logic, including parsing, layout,
 *   export, and the token game. This separation helps in isolating core business logic.
 *
 * Pipes, like `mathAbsPipe`, are located in `tr-pipes` and provide custom data transformations.
 *
 * This modular structure allows for:
 * - **Clear Separation of Concerns**: Different functionalities are encapsulated in their respective modules/components/services.
 * - **Improved Reusability**: Components and services can be reused across different parts of the application.
 * - **Easier Maintenance**: Changes in one module are less likely to affect others, simplifying debugging and updates.
 * - **Scalability**: New features can be added as new modules or components without significantly impacting existing code.
 */

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { DisplayComponent } from './components/display/display.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule } from '@angular/forms';
import { FooterComponent } from './components/footer/footer.component';
import { ExampleFileComponent } from './components/example-file/example-file.component';
import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ExampleButtonComponent } from './components/example-button/example-button.component';
import { PetriNetComponent } from './tr-components/petri-net/petri-net.component';
import { ButtonBarComponent } from './tr-components/button-bar/button-bar.component';
import { mathAbsPipe } from './tr-pipes/math-abs.pipe';
import { ManageActionsPopupComponent } from './tr-components/manage-actions-popup/manage-actions-popup.component';
import { SetActionPopupComponent } from './tr-components/set-action-popup/set-action-popup.component';
import { ClearPopupComponent } from './tr-components/clear-popup/clear-popup.component';
import { PlaceInvariantsTableComponent } from './tr-components/place-invariants-table/place-invariants-table.component';
import { CodeEditorComponent } from './tr-components/code-editor/code-editor.component';
import { ErrorPopupComponent } from './tr-components/error-popup/error-popup.component';
import { HelpPopupComponent } from './tr-components/help-popup/help-popup.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TextFieldModule } from '@angular/cdk/text-field';
import { ParameterInputComponent } from './tr-components/parameter-input/parameter-input.component'; // Import ParameterInputComponent
import { MatSliderModule } from '@angular/material/slider'; // Import MatSliderModule
import { TimelineComponent } from './tr-components/timeline/timeline.component'; // Import TimelineComponent
import { FormsModule as AngularFormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import { SpeedControlComponent } from './tr-components/speed-control/speed-control.component'; // Import SpeedControlComponent
import { OffshoreViewComponent } from './tr-components/offshore-view/offshore-view.component';
import { PlaybackControlsComponent } from './tr-components/playback-controls/playback-controls.component'; // Import PlaybackControlsComponent
import { TransitionFiringInfoPopupComponent } from './tr-components/transition-firing-info-popup/transition-firing-info-popup.component';
import { HeaderComponent } from './components/header/header.component';

@NgModule({
    declarations: [
        AppComponent,
        DisplayComponent,
        FooterComponent,
        ExampleFileComponent,
        ExampleButtonComponent,
        PetriNetComponent,
        ButtonBarComponent,
        mathAbsPipe,
        ManageActionsPopupComponent,
        HelpPopupComponent,
        SetActionPopupComponent,
        ClearPopupComponent,
        PlaceInvariantsTableComponent,
        CodeEditorComponent,
        ErrorPopupComponent,
        TimelineComponent, // Add TimelineComponent
        SpeedControlComponent, // Add SpeedControlComponent
        OffshoreViewComponent,
        PlaybackControlsComponent, // Add PlaybackControlsComponent
        TransitionFiringInfoPopupComponent, HeaderComponent,
    ],
    imports: [
        BrowserModule,
        FlexLayoutModule,
        BrowserAnimationsModule,
        HttpClientModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatTabsModule,
        MatDialogModule,
        MatListModule,
        MatMenuModule,
        MatTooltipModule,
        ReactiveFormsModule,
        AngularFormsModule, // Add FormsModule here for ngModel if not already present
        MatSliderModule, // Add MatSliderModule here
        MatProgressSpinnerModule,
        TextFieldModule,
        ParameterInputComponent, // Add standalone ParameterInputComponent here
    ],
    providers: [
        {
            provide: APP_BASE_HREF,
            useFactory: (s: PlatformLocation) => s.getBaseHrefFromDOM(),
            deps: [PlatformLocation],
        },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}

