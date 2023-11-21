import {Injectable} from '@angular/core';
import {xml2js} from 'xml-js';
import {PnmlElement, PnmlPetriNet} from "../tr-classes/petri-net/pnml-petri-net";
import {Place} from "../tr-classes/petri-net/place";
import {Point} from "../tr-classes/petri-net/point";
import {Transition} from "../tr-classes/petri-net/transition";
import {Node} from "../tr-interfaces/petri-net/node";
import {Arc} from "../tr-classes/petri-net/arc";

@Injectable({
    providedIn: 'root'
})
export class PnmlService {


    constructor() {
    }

    parse(xmlString: string): [Array<Place>, Array<Transition>, Array<Arc>] {
        try {
            const result = xml2js(xmlString) as PnmlPetriNet;
            const pnml = result.elements.find(element => element.name === "pnml");
            const net = pnml?.elements.find(element => element.name === "net");
            const pnmlPlaces = net?.elements.filter(element => element.name === "place");
            const pnmlTransitions = net?.elements.filter(element => element.name === "transition");
            const pnmlArcs = net?.elements.filter(element => element.name === "arc");
            let places: Place[] = [];
            let transitions: Transition[] = [];
            if (pnmlPlaces) {
                places = this.parsePnmlPlaces(pnmlPlaces);
            }
            if (pnmlTransitions) {
                transitions = this.parsePnmlTransitions(pnmlTransitions);
            }
            let arcs: Arc[] = [];
            if (pnmlArcs) {
                arcs = this.parsePnmlArcs(pnmlArcs, places, transitions);
            }
            return [places, transitions, arcs]
        } catch (error) {
            throw new Error(`Error parsing XML to JSON: ${error}`);
        }
    }

    private parsePnmlPlaces(list: Array<PnmlElement>): Place[] {
        const places: Place[] = [];
        list.forEach(pnmlPlace => {
            const id = pnmlPlace.attributes.id;

            const nameText = pnmlPlace.attributes.name;

            const initialMarking = pnmlPlace?.elements.find(element => element.name === 'initialMarking');
            const initialMarkingTextElement = initialMarking?.elements.find(element => element.name === 'text');
            const initialMarkingText = initialMarkingTextElement?.elements.find(element => element.type === 'text')?.text;
            let initialMarkingNumber = 0;
            if (initialMarkingText) {
                initialMarkingNumber = parseInt(initialMarkingText);
            }
            const graphics = pnmlPlace.elements.find(element => element.name === 'graphics');
            const position = graphics?.elements.find(element => element.name === 'position');

            let point: Point;
            if (position?.attributes.x && position.attributes.y) {
                point = new Point(position.attributes.x, position.attributes.y)
            } else {
                point = new Point(0, 0);
            }
            const place = new Place(initialMarkingNumber, point, id, nameText);
            places.push(place);
        })
        return places;
    }

    writePNML(places: Place[], transitions: Transition[], arcs: Arc[]) {
        const fileName = "test.pnml"
        const pnmlContent = `<?xml version="1.0" encoding="UTF-8"?>
  <pnml xmlns="http://www.pnml.org/version-2009/grammar/pnml">
    <net id="net1" type="http://www.pnml.org/version-2009/grammar/ptnet">
${places.map(place => this.getPlaceString(place)).join('\n')}
${transitions.map(transition => this.getTransitionString(transition)).join('\n')}
${arcs.map(arc => this.getArcString(arc)).join('\n')}
    </net>
  </pnml>`;

        const a = document.createElement('a');
        const file = new Blob([pnmlContent], {type: "'text/xml;charset=utf-8'"});
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();

    }

    getPlaceString(place: Place): string {
        if (place.label) {
return       `      <place id="${place.id}">
        <name>
          <text>${place.label}</text>
        </name>
        <graphics>
          <position x="${place.position.x}" y="${place.position.y}"/>
        </graphics>
        <initialMarking>
          <text>${place.token}</text>
        </initialMarking>
      </place>`
        } else {
return       `      <place id="${place.id}">
         <graphics>
           <position x="${place.position.x}" y="${place.position.y}"/>
         </graphics>
         <initialMarking>
           <text>${place.token}</text>
         </initialMarking>
       </place>`
        }

    }

    getTransitionString(transition: Transition): string {
        if (transition.label) {
return       `      <transition id="${transition.id}">
        <name>
          <text>${transition.label}</text>
        </name>
        <graphics>
          <position x="${transition.position.x}" y="${transition.position.y}"/>
        </graphics>
      </transition>`
        } else {
return       `      <transition id="${transition.id}">
        <graphics>
          <position x="${transition.position.x}" y="${transition.position.y}"/>
        </graphics>
      </transition>`
        }

    }

    getArcString(arc: Arc): string {
return       `      <arc id = "${arc.from.id},${arc.to.id}" source="${arc.from.id}" target = "${arc.to.id}"></arc>`
        }

    private parsePnmlTransitions(list: Array<PnmlElement>): Transition[] {
        const places: Transition[] = [];
        list.forEach(pnmlTransition => {
            const id = pnmlTransition.attributes.id;

            const nameText = pnmlTransition.attributes.name;

            const graphics = pnmlTransition.elements.find(element => element.name === 'graphics');
            const position = graphics?.elements.find(element => element.name === 'position');

            let point: Point;
            if (position?.attributes.x && position.attributes.y) {
                point = new Point(position.attributes.x, position.attributes.y)
            } else {
                point = new Point(0, 0);
            }
            const place = new Transition(point, id, nameText);
            places.push(place);
        })
        return places;
    }

    private parsePnmlArcs(list: Array<PnmlElement>, places: Place[], transitions: Transition[]): Arc[] {
        const arcs: Arc[] = [];
        list.forEach(pnmlArc => {
            const sourceId = pnmlArc.attributes.source;
            const targetId = pnmlArc.attributes.target;
            const sourceNode = this.retrieveNode(places, transitions, sourceId);
            const targetNode = this.retrieveNode(places, transitions, targetId);

            if (sourceNode && targetNode) {
                const arc = new Arc(sourceNode, targetNode);
                if(sourceNode instanceof Transition) {
                    sourceNode.postArcs.push(arc);
                } else if(targetNode instanceof Transition) {
                    targetNode.preArcs.push(arc);
                }
                arcs.push(arc);
            }
        })
        return arcs;
    }

    private retrieveNode(places: Place[], transitions: Transition[], id: string): Node | undefined {
        const foundPlace = places.find(place => place.id === id);
        const foundTransition = transitions.find(transition => transition.id === id);
        if (foundPlace) {
            return foundPlace;
        } else if (foundTransition) {
            return foundTransition;
        } else {
            return undefined;
        }
    }
}
