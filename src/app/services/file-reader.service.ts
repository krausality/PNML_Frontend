import {Injectable} from "@angular/core";
import {Observable, ReplaySubject} from "rxjs";

/**
 * @service FileReaderService
 * @description This service provides a way to read the content of a file.
 * It encapsulates the HTML5 FileReader API into an Observable-based service.
 * This makes it easy to integrate file reading capabilities into other services
 * or components in a reactive way.
 */
@Injectable({
    providedIn: 'root'
})
export class FileReaderService {

    /**
     * @description Reads the content of a given file as a string.
     * @param file The File object to read.
     * @returns An Observable that emits the file content as a string upon successful reading,
     * or completes without emitting if an error occurs.
     */
    public readFile(file: File): Observable<string> {
        const reader = new FileReader();
        const result = new ReplaySubject<string>(1);
        reader.onerror = (e) => {
            console.error('Error while reading file content', file, e);
            result.complete();
        };
        reader.onloadend = () => {
            result.next(reader.result as string);
            result.complete();
        }
        reader.readAsText(file);
        return result.asObservable();
    }

}
