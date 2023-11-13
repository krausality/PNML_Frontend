import {Component} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ParserService} from './services/parser.service';
import {DisplayService} from './services/display.service';
import html2canvas from 'html2canvas';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {

    public textareaFc: FormControl;

    constructor(private _parserService: ParserService,
                private _displayService: DisplayService) {
        this.textareaFc = new FormControl();
        this.textareaFc.disable();
    }

    public processSourceChange(newSource: string) {
        this.textareaFc.setValue(newSource);
    }

    public saveAs = (blob: string, fileName: string) =>{
        var elem = window.document.createElement('a');
        elem.href = blob;
        elem.download = fileName;
        (document.body || document.documentElement).appendChild(elem);
        if (typeof elem.click === 'function') {
            elem.click();
        } else {
            elem.target = '_blank';
            elem.dispatchEvent(new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
            }));
        }
        URL.revokeObjectURL(elem.href);
        elem.remove()
      }

    public downloadCanvas(fileType: string, fileName: string) {

        const svgElement = document.getElementById('drawingArea');
        console.log(svgElement);

        if(svgElement) {
            let svg = (svgElement as unknown) as SVGGraphicsElement;
            let clonedSvgElement = (svg.cloneNode(true) as any) as HTMLElement;
            let outerHTML = clonedSvgElement.outerHTML;

            const wrapper = document.createElement("div");
            const myHTMLString = outerHTML;
            wrapper.insertAdjacentHTML("afterbegin", myHTMLString);
            document.body.appendChild(wrapper);

            html2canvas(wrapper,
                {
                    logging: true
                }
                ).then((canvas) => {
                let image = canvas.toDataURL(fileType);
                this.saveAs(image, fileName);
            })

            wrapper.remove();
        }
    }
}
