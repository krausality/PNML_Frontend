import {Injectable} from '@angular/core';
import {xml2js} from 'xml-js';
import {PnmlElement, PnmlPetriNet} from '../tr-classes/petri-net/pnml-petri-net';
import {Place} from '../tr-classes/petri-net/place';
import {Point} from '../tr-classes/petri-net/point';
import {Transition} from '../tr-classes/petri-net/transition';
import {Node} from '../tr-interfaces/petri-net/node';
import {Arc} from '../tr-classes/petri-net/arc';
import {DataService} from "./data.service";

@Injectable({
    providedIn: 'root'
})
export class PnmlService {


    constructor(private dataServive: DataService) {
    }

    parse(xmlString: string): [Array<Place>, Array<Transition>, Array<Arc>] {
        try {
            const result = xml2js(xmlString) as PnmlPetriNet;
            const pnml = result.elements.find(element => element.name === name_pnml);
            const net = pnml?.elements.find(element => element.name === name_net);
            const pnmlPlaces = net?.elements.filter(element => element.name === name_place);
            const pnmlTransitions = net?.elements.filter(element => element.name === name_transition);
            const pnmlArcs = net?.elements.filter(element => element.name === name_arc);
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

            const initialMarking = pnmlPlace?.elements.find(element => element.name === name_initialMarking);
            const initialMarkingTextElement = initialMarking?.elements.find(element => element.name === text);
            const initialMarkingText = initialMarkingTextElement?.elements.find(element => element.type === text)?.text;
            let initialMarkingNumber = 0;
            if (initialMarkingText) {
                initialMarkingNumber = parseInt(initialMarkingText);
            }
            const graphics = pnmlPlace.elements.find(element => element.name === 'graphics');
            const position = graphics?.elements.find(element => element.name === 'position');

            let point: Point;
            if (position?.attributes.x && position.attributes.y) {
                point = new Point(Number(position.attributes.x), Number(position.attributes.y))
            } else {
                point = new Point(0, 0);
            }
            const place = new Place(initialMarkingNumber, point, id, nameText);
            places.push(place);
        })
        return places;
    }

    private parsePnmlTransitions(list: Array<PnmlElement>): Transition[] {
        const places: Transition[] = [];
        list.forEach(pnmlTransition => {
            const id = pnmlTransition.attributes.id;

            const nameElement = pnmlTransition.elements.find(element => element.name === name);
            const nameTextElement = nameElement?.elements.find(element => element.name === text);
            const nameTextAttribute = nameTextElement?.elements.find(element => element.type === text);
            const nameText = nameTextAttribute?.text;

            const graphics = pnmlTransition.elements.find(element => element.name === 'graphics');
            const position = graphics?.elements.find(element => element.name === 'position');

            let point: Point;
            if (position?.attributes.x && position.attributes.y) {
                point = new Point(Number(position.attributes.x), Number(position.attributes.y))
            } else {
                point = new Point(0, 0);
            }
            const transition = new Transition(point, id, nameText);
            places.push(transition);
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

    writePNML() {
        const places = this.dataServive.getPlaces();
        const transitions = this.dataServive.getTransitions();
        const arcs = this.dataServive.getArcs();
        const fileName = "petri-net-with-love.pnml"
        const pnmlContent = `<?xml version="1.0" encoding="UTF-8"?>
  <pnml xmlns="http://www.pnml.org/version-2009/grammar/pnml">
    <net id="net1" type="http://www.pnml.org/version-2009/grammar/ptnet">
${places.map(place => this.getPlaceString(place)).join('\n')}
${transitions.map(transition => this.getTransitionString(transition)).join('\n')}
${arcs.map(arc => this.getArcString(arc)).join('\n')}
    </net>
  </pnml>`;

        // Create Blob (Binary Large OBject)
        const file = new Blob([pnmlContent], {type: "'text/xml;charset=utf-8'"});

        // Create anchor element with url to the Blob object and programmatically
        // trigger a click event on the anchor to initiate the download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = fileName;
        link.click();

        // Free up resources
        URL.revokeObjectURL(link.href);

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

const name_pnml = "pnml";
const name_net = "net";

const name_place = "place";
const name_transition = "transition";
const name_arc = "arc";

const name_initialMarking = "initialMarking";

const text = "text";
const name = "name";


