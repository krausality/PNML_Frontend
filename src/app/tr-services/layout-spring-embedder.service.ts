import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { Point } from '../tr-classes/petri-net/point';
import { Node } from '../tr-interfaces/petri-net/node';

@Injectable({
    providedIn: 'root'
})
export class LayoutSpringEmbedderService {

    // parameters needed to make the spring embedder algorithm terminate
    private epsilon = 0.01;
    private maxIterations = 5000;

    // constant repulsion force
    private cRep = 20000;

    // ideal length of arcs
    private l = 150;
    // constant spring force
    private cSpring = 20;

    // is true while the algorithm is running - will be used later when reapplying the spring embedder on performing an action
    private springEmbedderRunning = false;

    // determines if the spring embedder algorithm sould terminate before the next iteration of calculating and applying forces
    private shouldTerminate = false;

    constructor(private dataService: DataService) { }

    // stops the spring embedder algorithm before the next iteration
    terminate() {
        this.shouldTerminate = true;
    }

    // spring embedder adaptation for layouting our petri net
    // based on Eades spring embedder algorithm
    async layoutSpringEmbedder() {
        // if the algorithm is already running this method should stop and not run a second instance of the spring embedder algorithm
        if (this.springEmbedderRunning) return;

        // persist that the algorithm is running
        this.springEmbedderRunning = true;

        // set shouldTerminate to false -> we explicitly want the algorithm to run
        this.shouldTerminate = false;

        // remove anchorpoints
        this.dataService.getArcs().forEach(arc => arc.anchors.length = 0);

        // combining places and transitions into one array because we don't need to handle them differently in this algorithm
        const nodes: Node[] = [...this.dataService.getPlaces(), ...this.dataService.getTransitions()];

        // discover the connected nodes of each node once and keep the map in memory
        // instead of doing it every iteration
        const connectedNodeMap: { [id: string]: Node[] } = {};
        nodes.forEach(n => {
            const connectedNodes: Node[] = [];
            this.dataService.getArcs().forEach(arc => {
                if (arc.from.id === n.id) {
                    connectedNodes.push(arc.to);
                } else if (arc.to.id === n.id) {
                    connectedNodes.push(arc.from);
                }
            });
            connectedNodeMap[n.id] = connectedNodes;
        });

        let iterations = 1;
        // this is only needed for the first iteration
        let maxForceVectorLength = this.epsilon + 1;

        // the algorithm terminates after the maximum iterations are reached
        // or if the maximum force applied in one iteration gets to small to really change much in the layout
        // of if it should terminate as indicated by shouldTerminate
        while (!this.shouldTerminate && iterations <= this.maxIterations && maxForceVectorLength > this.epsilon) {
            // keep track of force vectors to be applied in a map
            const forceVectors: { [id: string]: Point } = {};

            // calculate force vector to be applied for every node
            nodes.forEach(n => forceVectors[n.id] = this.calculateForceVector(n, nodes, connectedNodeMap[n.id]))

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

            // sleep for a few ms each iteration to visualize layouting via spring forces
            await this.sleep(10);

            iterations++;
        }

        // persist that the spring embedder has terminated and is not running anymore
        this.springEmbedderRunning = false;
    }

    private sleep(ms: number) {
        return new Promise(r => setTimeout(r, ms));
    }

    // calculate the force vector that should be applied to the node in one iteration of the algorithm
    private calculateForceVector(node: Node, nodes: Node[], connectedNodes: Node[]): Point {
        // initialize force vector
        const forceVector = new Point(0, 0);

        // calculate repulsion force from all other nodes
        nodes.forEach(n => {
            if (n.id !== node.id) {
                const repulsionForce = this.calculateRepulsionForce(node.position, n.position);
                // add the calculated repulsion force to the force vector
                forceVector.x += repulsionForce.x;
                forceVector.y += repulsionForce.y;
            }
        });

        // calculate the spring force from all connected nodes
        connectedNodes.forEach(cn => {
            const attractionForce = this.calculateSpringForce(node.position, cn.position);
            forceVector.x += attractionForce.x;
            forceVector.y += attractionForce.y;
        });

        return forceVector;
    }

    // calculate repulsion vector between two nodes (points)
    private calculateRepulsionForce(u: Point, v: Point): Point {
        const factor = this.cRep / (this.calculateDistance(v, u) ** 2);
        const unitVector = this.calculateUnitVector(v, u);
        return new Point(unitVector.x * factor, unitVector.y * factor);
    }

    // calculation attraction vector between two points
    private calculateSpringForce(u: Point, v: Point): Point {
        const factor = this.cSpring * Math.log10(this.calculateDistance(v, u) / this.l);
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
