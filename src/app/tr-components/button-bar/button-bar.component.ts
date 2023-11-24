import { Component } from '@angular/core';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';
import { UiService } from 'src/app/tr-services/ui.service';
import html2canvas from 'html2canvas';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.css']
})
export class ButtonBarComponent {

    public petrinetCss: string = '';

    constructor(protected uiService: UiService, protected exportJsonDataService: ExportJsonDataService, protected pnmlService: PnmlService, private httpClient: HttpClient) {
        // ----------------------------------------------------------------------------------
        // used for svg and png export
        // should be refactored into its own service
        this.httpClient.get('assets/petri-net.component.css', {responseType: 'text'})
        .subscribe(data => {
            // console.log(data),
            this.petrinetCss = data;
            }
        );
        // ----------------------------------------------------------------------------------
    }

    // gets called when a tab is clicked
    // sets the "tab" property in the uiService
    // empties the "button" property in the uiService
    tabClicked(tab: string) {
        this.uiService.tab = tab;
        this.uiService.button = "";
    }

    // gets called when a button is clicked that needs its state saved globally
    // sets the "button" property in the uiService
    buttonClicked(button: string) {
        this.uiService.button = button;
    }

    // ----------------------------------------------------------------------------------
    // methods used for exporting as png and svg
    // taken from app.component.ts --> should be refactored into its own service

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
        var svg = document.getElementById("drawingArea");
        if (svg) {
            var style = document.createElementNS("http://www.w3.org/2000/svg", "style");
            style.textContent = this.petrinetCss;
            if (svg) {
                svg.insertBefore(style, svg.firstChild);
            }
            var serializer = new XMLSerializer();
                if(svg) {
                    var source = serializer.serializeToString(svg);
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

    // ----------------------------------------------------------------------------------
    
}
