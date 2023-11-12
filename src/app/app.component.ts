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
        console.log('SaveAs Begin');
        var elem = window.document.createElement('a');
        console.log(elem);
        elem.href = blob;
        elem.download = fileName;
        // elem.style = 'display:none;';
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

    public downloadPng() {

        const svgElement = document.getElementById('drawingArea');
        console.log(svgElement);

        if(svgElement) {
            let svg = (svgElement as unknown) as SVGGraphicsElement;
            // let {width, height} = svg.getBBox();

            let clonedSvgElement = (svg.cloneNode(true) as any) as HTMLElement;
            console.log(clonedSvgElement);
            let outerHTML = clonedSvgElement.outerHTML;

            const wrapper = document.createElement("div");
            const myHTMLString = outerHTML;
            console.log("myHTMLString: ",myHTMLString);
            wrapper.insertAdjacentHTML("afterbegin", myHTMLString);
            console.log("wrapper: ", wrapper);

            document.body.appendChild(wrapper);

            html2canvas(wrapper,
                {
                    logging: true
                }
                ).then((canvas) => {
                let image = canvas.toDataURL('image/png', 1.0);
                console.log('Image: ', image);
                this.saveAs(image, 'pngExport.png');
            })

            // Comment for Debugging
            // wrapper.remove();
        }
    }
}
