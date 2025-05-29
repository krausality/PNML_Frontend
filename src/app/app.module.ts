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
import { ParameterInputComponent } from './tr-components/parameter-input/parameter-input.component';

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
        MatProgressSpinnerModule,
        TextFieldModule,
        MatSelectModule,
        MatTabsModule,
        MatDialogModule,
        MatListModule,
        MatMenuModule,
        MatTooltipModule,
        ParameterInputComponent,
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
