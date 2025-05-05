import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class PlanningService {
    private apiUrl = `${environment.backendApiUrl}/model-x/planning`;

    constructor(private http: HttpClient) { }

    // Holt die Default-Parameter vom Backend
    getDefaults(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/defaults`)
            .pipe(catchError(this.handleError));
    }

    // Sendet die Planungsdaten an das Backend (POST)
    runPlanning(planningData: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, planningData)
            .pipe(catchError(this.handleError));
    }

    // Beispiel für PUT (falls benötigt)
    updatePlanning(planningData: any): Observable<any> {
        return this.http.put<any>(this.apiUrl, planningData)
           .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Unbekannter Fehler!';
        if (error.error instanceof ErrorEvent) {
            // Client-seitiger oder Netzwerkfehler
            errorMessage = `Fehler: ${error.error.message}`;
        } else {
            // Backend hat einen Fehlercode zurückgegeben
            errorMessage = `Serverfehler: Code ${error.status}, Nachricht: ${error.message}`;
            if (error.error && typeof error.error === 'object') {
                errorMessage += ` Details: ${JSON.stringify(error.error)}`;
            }
        }
        console.error(errorMessage);
        return throwError(() => new Error(errorMessage));
    }
}
