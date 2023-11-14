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
        // scramble for testing
        // dataService.getPlaces().forEach(place => {
        //     place.position.x = Math.floor(Math.random() * 1000);
        //     place.position.y = Math.floor(Math.random() * 800);
        // });
        // dataService.getTransitions().forEach(place => {
        //     place.position.x = Math.floor(Math.random() * 1000);
        //     place.position.y = Math.floor(Math.random() * 800);
        // });

        // remove anchorpoints
        dataService.getArcs().forEach(arc => arc.anchors.length = 0);

        // combining places and transitions into one array because we don't need to handle them differently in this algorithm
        const nodes: Node[] = [...dataService.getPlaces(), ...dataService.getTransitions()];

        // discover the connected nodes of each node once and keep the map in memory
        // instead of doing it every iteration
        const connectedNodeMap: { [id: string]: Node[] } = {};
        nodes.forEach(n => {
            const connectedNodes: Node[] = [];
            dataService.getArcs().forEach(arc => {
                if (arc.from.id === n.id) {
                    connectedNodes.push(arc.to);
                } else if (arc.to.id === n.id) {
                    connectedNodes.push(arc.from);
                }
            });
            connectedNodeMap[n.id] = connectedNodes;
        });

        // parameters needed to make the spring embedder algorithm terminate
        const epsilon = 0.9;
        const maxIterations = 500;

        let iterations = 1;
        // this is only needed for the first iteration
        let maxForceVectorLength = epsilon + 1;

        // the algorithm terminates after the maximum iterations are reached
        // or if the maximum force applied in one iteration gets to small to really change much in the layout
        while (iterations <= maxIterations && maxForceVectorLength > epsilon) {
            // keep track of force vectors to be applied in a map
            const forceVectors: { [id: string]: Point } = {};

            // calculate force vector to be applied for every node
            nodes.forEach(n => forceVectors[n.id] = this.calculateForceVector(n, nodes, connectedNodeMap[n.id]))

            // console.log(forceVectors);

            // add the calculated force vectors to the places and transitions
            // and calculate the maximum force applied while iterating
            maxForceVectorLength = 0;
            nodes.forEach(n => {
                const forceVector = forceVectors[n.id];
                // TODO?: ((maxIterations - iterations) / maxIterations) is the cooling factor delta(t)
                n.position.x += forceVector.x;
                n.position.y += forceVector.y;
                // set the max force vector length if it's greater than the current highest one
                const forceVectorLength = this.calculateVectorLength(forceVector);
                if (forceVectorLength > maxForceVectorLength) {
                    maxForceVectorLength = forceVectorLength;
                }
            });

            iterations++;
        }

        // console.log(iterations + " " + maxForceVectorLength);
    }

    // calculate the force vector that should be applied to the node in one iteration of the algorithm
    private calculateForceVector(node: Node, nodes: Node[], connectedNodes: Node[]): Point {
        // initialize force vector
        const forceVector = new Point(0, 0);

        // console.log(connectedNodes);

        // calculate repulsion force only towards the other non connected nodes
        nodes.forEach(n => {
            if (n.id !== node.id) {
                const repulsionForce = this.calculateRepulsionForce(node.position, n.position);
                // add the calculated repulsion force to the force vector
                forceVector.x += repulsionForce.x;
                forceVector.y += repulsionForce.y;
                // console.log("rep of " + node.id + " from " + n.id + ": " + repulsionForce.x + ", " + repulsionForce.y);
            }
        });

        // calculate the attraction force for all connected nodes
        connectedNodes.forEach(cn => {
            const attractionForce = this.calculateSpringForce(node.position, cn.position);
            forceVector.x += attractionForce.x;
            forceVector.y += attractionForce.y;
            // console.log("attr of " + node.id + " to " + cn.id + ": " + attractionForce.x + ", " + attractionForce.y);
        });

        return forceVector;
    }

    // calculate repulsion vector between two nodes (points)
    private calculateRepulsionForce(u: Point, v: Point): Point {
        // constant repulsion force
        const c = 20000;
        const factor = c / (this.calculateDistance(v, u) ** 2);
        const unitVector = this.calculateUnitVector(v, u);
        return new Point(unitVector.x * factor, unitVector.y * factor);
    }

    // calculation attraction vector between two points
    private calculateSpringForce(u: Point, v: Point): Point {
        // ideal length of arcs --> sensible default value?
        const l = 150;
        // constant spring force
        const c = 20;
        const factor = c * Math.log10(this.calculateDistance(v, u) / l);
        const unitVector = this.calculateUnitVector(u, v);
        return new Point(unitVector.x * factor, unitVector.y * factor);
    }

    // calculate distance between two points
    private calculateDistance(p1: Point, p2: Point): number {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    // calculate length of one vector (passed as a point)
    private calculateVectorLength(p: Point) {
        return Math.sqrt(p.x ** 2 + p.y ** 2);
    }

    // calculate the unit vector between two points
    private calculateUnitVector(p1: Point, p2: Point) {
        const v = new Point(p2.x - p1.x, p2.y - p1.y);
        const length = this.calculateVectorLength(v);
        return new Point(v.x / length, v.y / length);
    }

}
