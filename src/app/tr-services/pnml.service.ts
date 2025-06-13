import { Injectable } from '@angular/core';
import { xml2js } from 'xml-js';
import {
    PnmlElement,
    PnmlPetriNet,
} from '../tr-classes/petri-net/pnml-petri-net';
import { Place } from '../tr-classes/petri-net/place';
import { Point } from '../tr-classes/petri-net/point';
import { Transition } from '../tr-classes/petri-net/transition';
import { Node } from '../tr-interfaces/petri-net/node';
import { Arc } from '../tr-classes/petri-net/arc';
import { DataService } from './data.service';
import * as vkbeautify from 'vkbeautify';
import { LayoutSugiyamaService } from './layout-sugiyama.service';

/**
 * -----------------------------------------------------------------------------
 * PnmlService: PNML Import/Export, Mapping, and Data Model Synchronization
 * -----------------------------------------------------------------------------
 * This service is responsible for all logic related to the PNML (Petri Net Markup Language)
 * format, including parsing, serialization, and mapping between the XML-based PNML
 * representation and the application's internal data model (Place, Transition, Arc, Point).
 *
 * Key Responsibilities:
 * - Parsing PNML XML into the app's data structures, handling missing or partial layout data.
 * - Serializing the current Petri net state to valid PNML XML for export or download.
 * - Ensuring that all mapping logic (IDs, labels, positions, weights, anchors) is robust and
 *   future-proof against schema changes or new Petri net features.
 * - Applying a default layout (Sugiyama) if the imported PNML lacks position data, to guarantee
 *   a usable initial visualization.
 * - Maintaining a flag (incompleteLayoutData) to signal when imported PNML is missing layout
 *   information, so that downstream services/components can react accordingly.
 *
 * Design Decisions:
 * - All mapping between PNML and the internal model is centralized here for maintainability.
 * - Uses xml2js for XML parsing and vkbeautify for pretty-printing output.
 * - The parse() method always updates the DataService with the parsed data, ensuring that
 *   the application's state is in sync with the imported file.
 * - The service is stateless except for the incompleteLayoutData flag, which is reset on each parse.
 * - All serialization helpers (getPlaceString, getTransitionString, getArcString) are kept
 *   private to encapsulate PNML formatting logic.
 *
 * Interface Overview:
 * - parse(xmlString): Parses PNML XML and returns [places, transitions, arcs, actions].
 * - writePNML(): Triggers a browser download of the current net as a PNML file.
 * - getPNML(): Returns the current net as a formatted PNML XML string.
 * - getActionsfromTransitions(): Extracts unique action labels from transitions.
 * - All mapping between PNML and the internal model is handled here for maintainability.
 *
 * Example Usage:
 *   // Importing a PNML file:
 *   const [places, transitions, arcs, actions] = pnmlService.parse(xmlString);
 *   // Exporting the current net:
 *   pnmlService.writePNML();
 *
 * Maintenance Notes:
 * - If the PNML schema changes or new elements are needed, update the parse and
 *   serialization logic here. Always keep mapping logic robust to missing/extra fields.
 * - For new Petri net features (e.g., arc types, colored tokens), extend the mapping logic.
 * - Always update the incompleteLayoutData flag if layout information is missing or incomplete.
 * - This service should not contain UI logic; it is for data mapping and file I/O only.
 * - When adding new fields to Place, Transition, or Arc, update both parse and serialization.
 * - If you change the XML library, ensure all edge cases (empty elements, attributes, etc.) are handled.
 *
 * Edge Cases & Hints:
 * - If a PNML file is missing position data, all elements are placed at (0,0) and incompleteLayoutData is set.
 * - If an arc references a non-existent node, it is skipped (no error thrown, but maintainers should log if needed).
 * - All IDs must be unique; if duplicates are found, only the first is used (enforced by find()).
 * - When exporting, all anchors are included as <position> elements under <graphics>.
 * - The XML output is always pretty-printed for readability.
 * -----------------------------------------------------------------------------
 */
@Injectable({
    providedIn: 'root',
})
export class PnmlService {
    constructor(
        private dataService: DataService,
        private layoutSugiyamaService: LayoutSugiyamaService
    ) {}

    incompleteLayoutData: boolean = false;

    /**
     * Parses a PNML XML string and returns the corresponding places, transitions,
     * arcs, and actions.
     *
     * @param xmlString - The PNML XML string to parse.
     * @returns A tuple containing arrays of places, transitions, arcs, and actions.
     * @throws Error if there is a problem parsing the XML string.
     */
    parse(
        xmlString: string,
    ): [Array<Place>, Array<Transition>, Array<Arc>, Array<string>] {
        this.incompleteLayoutData = false;

        try {
            const result = xml2js(xmlString) as PnmlPetriNet;
            const pnml = result.elements.find(
                (element) => element.name === name_pnml,
            );
            const net = pnml?.elements.find(
                (element) => element.name === name_net,
            );

            const pages = net?.elements.filter(
                (element) => element.name === name_page,
            );

            let pnmlPlaces: PnmlElement[] = [];
            let pnmlTransitions: PnmlElement[] = [];
            let pnmlArcs: PnmlElement[] = [];

            if (pages && pages.length > 0) {
                pages.forEach((page) => {
                    const pnmlPlacesPage = page.elements.filter(
                        (element) => element.name === name_place,
                    );
                    if (pnmlPlacesPage) {
                        pnmlPlaces = pnmlPlaces.concat(pnmlPlacesPage);
                    }
                    const pnmlTransitionsPage = page.elements.filter(
                        (element) => element.name === name_transition,
                    );
                    if (pnmlTransitionsPage) {
                        pnmlTransitions =
                            pnmlTransitions.concat(pnmlTransitionsPage);
                    }
                    const pnmlArcsPage = page.elements.filter(
                        (element) => element.name === name_arc,
                    );
                    if (pnmlArcsPage) {
                        pnmlArcs = pnmlArcs.concat(pnmlArcsPage);
                    }
                });
            } else if (net) {
                pnmlPlaces = net.elements.filter(
                    (element) => element.name === name_place,
                );
                pnmlTransitions = net.elements.filter(
                    (element) => element.name === name_transition,
                );
                pnmlArcs = net.elements.filter(
                    (element) => element.name === name_arc,
                );
            }

            let places: Place[] = [];
            let transitions: Transition[] = [];
            let arcs: Arc[] = [];
            let actions: string[] = [];
            if (pnmlPlaces) {
                places = this.parsePnmlPlaces(pnmlPlaces);
            }
            if (pnmlTransitions) {
                transitions = this.parsePnmlTransitions(pnmlTransitions);
                actions = this.getActionsfromTransitions(transitions);
            }
            if (pnmlArcs) {
                arcs = this.parsePnmlArcs(pnmlArcs, places, transitions);
            }

            // Assign parsed data to DataService using public properties
            this.dataService.places = places;
            this.dataService.transitions = transitions;
            this.dataService.arcs = arcs;
            this.dataService.actions = actions;

            // Unconditionally apply Sugiyama layout
            this.layoutSugiyamaService.applySugiyamaLayout();

            return [places, transitions, arcs, actions];
        } catch (error) {
            throw new Error(`Error parsing XML to JSON: ${error}`);
        }
    }

    private parsePnmlPlaces(list: Array<PnmlElement>): Place[] {
        const places: Place[] = [];
        list.forEach((pnmlPlace) => {
            const id = pnmlPlace.attributes.id;

            const nameText = pnmlPlace.attributes.name;

            const initialMarking = pnmlPlace?.elements.find(
                (element) => element.name === name_initialMarking,
            );
            const initialMarkingTextElement = initialMarking?.elements.find(
                (element) => element.name === text,
            );
            const initialMarkingText = initialMarkingTextElement?.elements.find(
                (element) => element.type === text,
            )?.text;
            let initialMarkingNumber = 0;
            if (initialMarkingText) {
                initialMarkingNumber = parseInt(initialMarkingText);
            }
            const graphics = pnmlPlace.elements.find(
                (element) => element.name === 'graphics',
            );
            const position = graphics?.elements.find(
                (element) => element.name === 'position',
            );

            let point: Point;
            if (position?.attributes?.x && position.attributes?.y) {
                point = new Point(
                    Number(position.attributes.x),
                    Number(position.attributes.y),
                );
            } else {
                this.incompleteLayoutData = true;
                point = new Point(0, 0);
            }
            const place = new Place(initialMarkingNumber, point, id, nameText);
            places.push(place);
        });
        return places;
    }

    private parsePnmlTransitions(list: Array<PnmlElement>): Transition[] {
        const places: Transition[] = [];
        list.forEach((pnmlTransition) => {
            const id = pnmlTransition.attributes.id;

            const nameElement = pnmlTransition.elements.find(
                (element) => element.name === name,
            );
            const nameTextElement = nameElement?.elements.find(
                (element) => element.name === text,
            );
            const nameTextAttribute = nameTextElement?.elements?.find(
                (element) => element.type === text,
            );
            const nameText = nameTextAttribute?.text;

            const graphics = pnmlTransition.elements.find(
                (element) => element.name === 'graphics',
            );
            const position = graphics?.elements.find(
                (element) => element.name === 'position',
            );

            let point: Point;
            if (position?.attributes?.x && position.attributes?.y) {
                point = new Point(
                    Number(position.attributes.x),
                    Number(position.attributes.y),
                );
            } else {
                this.incompleteLayoutData = true;
                point = new Point(0, 0);
            }
            const transition = new Transition(point, id, nameText);
            places.push(transition);
        });
        return places;
    }

    /**
     * Extracts unique action labels from an array of transitions.
     *
     * @param transitions - The array of transitions to extract actions from.
     * @returns An array of unique action labels.
     */
    getActionsfromTransitions(transitions: Array<Transition>): string[] {
        const actions: string[] = [];

        transitions.forEach((transition) => {
            if (transition.label) {
                if (!actions.includes(transition.label)) {
                    actions.push(transition.label);
                }
            }
        });
        return actions;
    }

    private parsePnmlArcs(
        list: Array<PnmlElement>,
        places: Place[],
        transitions: Transition[],
    ): Arc[] {
        const arcs: Arc[] = [];
        list.forEach((pnmlArc) => {
            const sourceId = pnmlArc.attributes.source;
            const targetId = pnmlArc.attributes.target;

            const sourceNode = this.retrieveNode(places, transitions, sourceId);
            const targetNode = this.retrieveNode(places, transitions, targetId);

            const inscription = pnmlArc.elements.find(
                (element) => element.name === name_inscription);
            const inscriptionTextElement = inscription?.elements.find(
                (element) => element.name === text);
            const inscriptionText = inscriptionTextElement?.elements.find(
                (element) => element.type === text);

            let weight = 1;
            if(inscriptionText) {
                weight = Number(inscriptionText.text)
            }


            if (sourceNode && targetNode) {
                const arc = new Arc(sourceNode, targetNode, weight);
                arc.anchors = this.getAnchorPoints(pnmlArc);
                if (sourceNode instanceof Transition) {
                    sourceNode.postArcs.push(arc);
                } else if (targetNode instanceof Transition) {
                    targetNode.preArcs.push(arc);
                }
                arcs.push(arc);
            }
        });
        return arcs;
    }

    private getAnchorPoints(arc: PnmlElement): Point[] {
        const graphics = arc.elements.find(
            (element) => element.name === name_graphics,
        );
        const anchorPointsPNML = graphics?.elements?.filter(
            (element) => element.name === name_position,
        );

        const anchorPoints: Point[] = [];
        anchorPointsPNML?.forEach(anchorPointPNML => {
            const point = new Point(
                Number(anchorPointPNML.attributes.x),
                Number(anchorPointPNML.attributes.y),
            )
            anchorPoints.push(point);
        })
        return anchorPoints;
    }

    /**
     * Triggers a download of the current Petri net as a PNML file.
     *
     * This method generates the PNML content from the current Petri net data and
     * initiates a download in the browser.
     */
    writePNML() {
        const fileName = 'petri-net-with-love.pnml';
        const pnmlContent = this.getPNML();

        // Create Blob (Binary Large OBject)
        const file = new Blob([pnmlContent], {
            type: "'text/xml;charset=utf-8'",
        });

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
            return `      <place id="${place.id}">
        <name>
          <text>${place.label}</text>
        </name>
        <graphics>
          <position x="${place.position.x}" y="${place.position.y}"/>
        </graphics>
        <initialMarking>
          <text>${place.token}</text>
        </initialMarking>
     </place>`;
        } else {
            return `      <place id="${place.id}">
         <graphics>
           <position x="${place.position.x}" y="${place.position.y}"/>
         </graphics>
         <initialMarking>
           <text>${place.token}</text>
         </initialMarking>
      </place>`;
        }
    }

    getTransitionString(transition: Transition): string {
        if (transition.label) {
            return `      <transition id="${transition.id}">
        <name>
          <text>${transition.label}</text>
        </name>
        <graphics>
          <position x="${transition.position.x}" y="${transition.position.y}"/>
        </graphics>
      </transition>`;
        } else {
            return `      <transition id="${transition.id}">
        <graphics>
          <position x="${transition.position.x}" y="${transition.position.y}"/>
        </graphics>
      </transition>`;
        }
    }

    getArcString(arc: Arc): string {
        return `      <arc id="${arc.from.id},${arc.to.id}" source="${arc.from.id}" target = "${arc.to.id}">
         <inscription>
           <text>${Math.abs(arc.weight)}</text>
         </inscription>
         ${this.getArcGraphicsString(arc)}
      </arc>`;
    }

    getArcGraphicsString(arc: Arc): string {
        if (arc.anchors.length === 0) {
            return "<graphics/>"
        } else {
            const positionString = arc.anchors.map(arc => {
                return `<position x="${arc.x}" y="${arc.y}"/>\n`
            })
            return `<graphics>
        ${positionString.join('\n')}
</graphics>
`
        }
    }

    private retrieveNode(
        places: Place[],
        transitions: Transition[],
        id: string,
    ): Node | undefined {
        const foundPlace = places.find((place) => place.id === id);
        const foundTransition = transitions.find(
            (transition) => transition.id === id,
        );
        if (foundPlace) {
            return foundPlace;
        } else if (foundTransition) {
            return foundTransition;
        } else {
            return undefined;
        }
    }

    /**
     * Returns the current Petri net as a formatted PNML XML string.
     *
     * This method retrieves the current places, transitions, and arcs from the
     * data service and generates the PNML XML content. The XML is then
     * pretty-printed for readability.
     *
     * @returns The formatted PNML XML string.
     */
    public getPNML(): string {
        const places = this.dataService.getPlaces();
        const transitions = this.dataService.getTransitions();
        const arcs = this.dataService.getArcs();
        const pnmlContent = `<?xml version="1.0" encoding="UTF-8"?>
  <pnml>
    <net id="net1" type="http://www.informatik.hu-berlin.de/top/pntd/ptNetb">
${places.map((place) => this.getPlaceString(place)).join('\n')}
${transitions
            .map((transition) => this.getTransitionString(transition))
            .join('\n')}
${arcs.map((arc) => this.getArcString(arc)).join('\n')}
    </net>
  </pnml>`;

        return vkbeautify.xml(pnmlContent);
    }
}

const name_pnml = 'pnml';
const name_net = 'net';
const name_page = 'page';

const name_place = 'place';
const name_transition = 'transition';
const name_arc = 'arc';

const name_graphics = 'graphics';
const name_position = 'position';
const name_inscription = 'inscription';

const name_initialMarking = 'initialMarking';

const text = 'text';
const name = 'name';
