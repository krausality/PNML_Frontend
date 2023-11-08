import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { Point } from '../tr-classes/petri-net/point';
import { Node } from '../tr-interfaces/petri-net/node';

@Injectable({
    providedIn: 'root'
})
export class LayoutService {

    constructor() { }

    // testing layout with spring-embedder
    layoutSpringEmbedder(dataService: DataService) {
        console.log("spring embedder!");

        // remove anchorpoints
        dataService.getArcs().forEach(arc => arc.anchors.length = 0);

        // parameters needed to make the spring embedder algorithm terminate
        const epsilon = 0.99;
        const maxIterations = 100;

        let iterations = 1;
        let maxForceVectorLength = epsilon + 1;
        while (iterations < maxIterations && maxForceVectorLength > epsilon) {
            // keep track of force vectors to be applied in a map
            const forceVectors: { [id: string]: Point } = {};

            // calculate force vector to be applied for every place and transition
            dataService.getPlaces().forEach(place => forceVectors[place.id] = this.calculateForceVector(place, dataService));
            dataService.getTransitions().forEach(transition => forceVectors[transition.id] = this.calculateForceVector(transition, dataService));

            console.log(forceVectors);

            // add the calculated force vectors to the places and transitions
            // and calculate the maximum force applied while iterating
            maxForceVectorLength = 0;
            dataService.getPlaces().forEach(place => {
                const forceVector = forceVectors[place.id];
                // ((maxIterations - iterations) / maxIterations) is the cooling factor delta(t)
                place.position.x += forceVector.x * ((maxIterations - iterations) / maxIterations);
                place.position.y += forceVector.y * ((maxIterations - iterations) / maxIterations);
                // set the max force vector length if it's greater than current highest one
                const forceVectorLength = this.calculateVectorLength(forceVector);
                if (forceVectorLength > maxForceVectorLength) {
                    maxForceVectorLength = forceVectorLength;
                }
            });
            dataService.getTransitions().forEach(transition => {
                const forceVector = forceVectors[transition.id];
                transition.position.x += forceVector.x * ((maxIterations - iterations) / maxIterations);
                transition.position.y += forceVector.y * ((maxIterations - iterations) / maxIterations);
                const forceVectorLength = this.calculateVectorLength(forceVector);
                if (forceVectorLength > maxForceVectorLength) {
                    maxForceVectorLength = forceVectorLength;
                }
            });

            iterations++;
        }

        console.log(iterations + " " + maxForceVectorLength);
    }

    private calculateForceVector(node: Node, dataService: DataService): Point {
        // initialize force vector
        const forceVector = new Point(0, 0);

        // discover all connected nodes --> can this be done more efficiently
        const connectedNodes: Node[] = [];
        dataService.getArcs().forEach(arc => {
            if (arc.from.id === node.id) {
                connectedNodes.push(arc.to);
            } else if (arc.to.id === node.id) {
                connectedNodes.push(arc.from);
            }
        });

        // calculate repulsion force only towards the other non connected nodes
        dataService.getPlaces().forEach(place => {
            // check that no node in connectedNodes has the id of the current place
            // --> they are not connected
            if (place.id !== node.id && !connectedNodes.some(connectedNode => connectedNode.id === place.id)) {
                const repulsionForce = this.calculateRepulsionForce(node.position, place.position);
                // add the calculated repulsion force to the force vector
                forceVector.x += repulsionForce.x;
                forceVector.y += repulsionForce.y;
            }
        });

        // do the same thing for transitions
        dataService.getTransitions().forEach(transition => {
            if (transition.id !== node.id && !connectedNodes.some(connectedNode => connectedNode.id === transition.id)) {
                const repulsionForce = this.calculateRepulsionForce(node.position, transition.position);
                forceVector.x += repulsionForce.x;
                forceVector.y += repulsionForce.y;
            }
        });

        // calculate the attraction force for all connected nodes
        connectedNodes.forEach(connectedNode => {
            const attractionForce = this.calculateSpringForce(node.position, connectedNode.position);
            forceVector.x += attractionForce.x;
            forceVector.y += attractionForce.y;
        });

        return forceVector;
    }

    // calculate repulsion vector between two nodes (points)
    private calculateRepulsionForce(u: Point, v: Point): Point {
        // repulsion constant --> sensible default value?
        const c = 2;
        const factor = c / this.calculateDistance(u, v); // = c / distance
        const length = this.calculateVectorLength(u);
        return new Point(u.x * factor / length, u.y * factor / length);
    }

    private calculateSpringForce(u: Point, v: Point): Point {
        // spring constant --> sensible default value?
        const c = 1;
        // ideal length of arcs --> sensible default value?
        const l = 1;
        const factor = c * Math.log(this.calculateDistance(u, v) / l);
        const length = this.calculateVectorLength(u);
        return new Point(u.x * factor / length, u.y * factor / length);
    }

    private calculateDistance(u: Point, v: Point): number {
        return Math.sqrt((u.x - v.x) ** 2 + (u.y - v.y) ** 2);
    }

    private calculateVectorLength(p: Point) {
        return Math.sqrt(p.x ** 2 + p.y ** 2);
    }

}
