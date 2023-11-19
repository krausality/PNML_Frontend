import {Component} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ParserService} from './services/parser.service';
import {DisplayService} from './services/display.service';
import html2canvas from 'html2canvas';
import { HttpClient } from "@angular/common/http";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {

    public textareaFc: FormControl;

    public petrinetCss: string = '';

    constructor(private _parserService: ParserService,
                private _displayService: DisplayService,
                private httpClient: HttpClient) {
        this.textareaFc = new FormControl();
        this.textareaFc.disable();
        this.httpClient.get('assets/petri-net.css', {responseType: 'text'})
            .subscribe(data => {
                // console.log(data),
                this.petrinetCss = data;
                }
            );
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

    public downloadImage(fileType: string, fileName: string) {

        const svgElement = document.getElementById('drawingArea');

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

                }
                ).then((canvas) => {
                let image = canvas.toDataURL(fileType);
                this.saveAs(image, fileName);
            })

            wrapper.remove();
        }
    }

    public downloadSvg() {
        var svgHolder = document.getElementById("drawingArea");

        if(svgHolder) {
            var svgDocument = svgHolder.ownerDocument;
            var style = svgDocument.createElementNS("http://www.w3.org/2000/svg", "style");
            style.textContent = this.petrinetCss;

            var svgElem = svgDocument.querySelector('svg');

            if(svgElem){
                svgElem.insertBefore(style, svgElem.firstChild);
            }

            var serializer = new XMLSerializer();
                if(svgElem) {
                    var source = serializer.serializeToString(svgElem);

                    //add name spaces
                    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
                        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                    }
                    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
                        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
                    }

                    //add xml declaration
                    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
                    //convert svg source to URI data scheme
                    var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

                this.saveAs(url, 'svgExport.svg');
            }
        }
    }
}
