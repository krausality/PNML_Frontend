import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { Point } from '../tr-classes/petri-net/point';
import { Node } from '../tr-interfaces/petri-net/node';

@Injectable({
    providedIn: 'root',
})
export class LayoutSpringEmbedderService {
    // Parameters needed to make the spring embedder algorithm terminate
    private epsilon = 0.01;
    private maxIterations = 5000;

    // Constant repulsion force
    private cRep = 20000;

    // Ideal length of arcs
    private l = 150;
    // Constant spring force
    private cSpring = 20;

    // Is true while the algorithm is running - will be used later when reapplying the spring embedder on performing an action
    private springEmbedderRunning = false;

    // determines if the spring embedder algorithm sould terminate before the next iteration of calculating and applying forces
    private shouldTerminate = false;

    constructor(private dataService: DataService) {}

    // Stops the spring embedder algorithm before the next iteration
    terminate() {
        this.shouldTerminate = true;
    }

    // Spring embedder adaptation for layouting our petri net
    // based on Eades spring embedder algorithm
    async layoutSpringEmbedder() {
        // If the algorithm is already running this method should stop and not run a second instance of the spring embedder algorithm
        if (this.springEmbedderRunning) return;

        // Persist that the algorithm is running
        this.springEmbedderRunning = true;

        // Set shouldTerminate to false -> we explicitly want the algorithm to run
        this.shouldTerminate = false;

        // Remove anchorpoints
        this.dataService.getArcs().forEach((arc) => (arc.anchors.length = 0));

        // Combining places and transitions into one array because we don't need to handle them differently in this algorithm
        const combinedNodes: Node[] = [
            ...this.dataService.getPlaces(),
            ...this.dataService.getTransitions(),
        ];

        // All nodes that will be modified during the alogrithm
        const nodes: Node[] = [];

        // Discover the connected nodes of each node once and keep the map in memory
        // instead of doing it every iteration
        const connectedNodeMap: { [id: string]: Node[] } = {};
        combinedNodes.forEach((n) => {
            const connectedNodes: Node[] = [];
            this.dataService.getArcs().forEach((arc) => {
                if (arc.from.id === n.id) {
                    connectedNodes.push(arc.to);
                } else if (arc.to.id === n.id) {
                    connectedNodes.push(arc.from);
                }
            });
            // Only add the node to the connectedNodeMap if it actually has connected nodes
            // As of FP-101 we don't want to apply forces to orphan nodes
            // Also only append nodes which are connected to other nodes onto the pool of
            // of nodes to layout
            if (connectedNodes.length > 0) {
                connectedNodeMap[n.id] = connectedNodes;
                nodes.push(n);
            }
        });

        // Handle nodes with the same position
        this.shiftSamePositionNodes(nodes);

        let iterations = 1;
        // This is only needed for the first iteration
        let maxForceVectorLength = this.epsilon + 1;

        // The algorithm terminates after the maximum iterations are reached
        // or if the maximum force applied in one iteration gets to small to really change much in the layout
        // of if it should terminate as indicated by shouldTerminate
        while (
            !this.shouldTerminate &&
            iterations <= this.maxIterations &&
            maxForceVectorLength > this.epsilon
        ) {
            // Keep track of force vectors to be applied in a map
            const forceVectors: { [id: string]: Point } = {};

            // Calculate force vector to be applied for every node
            nodes.forEach(
                (n) =>
                    (forceVectors[n.id] = this.calculateForceVector(
                        n,
                        nodes,
                        connectedNodeMap[n.id],
                    )),
            );

            // Add the calculated force vectors to the places and transitions
            // and calculate the maximum force applied while iterating
            maxForceVectorLength = 0;
            nodes.forEach((n) => {
                const forceVector = forceVectors[n.id];
                n.position.x += forceVector.x;
                n.position.y += forceVector.y;
                // Set the max force vector length if it's greater than the current highest one
                const forceVectorLength =
                    this.calculateVectorLength(forceVector);
                if (forceVectorLength > maxForceVectorLength) {
                    maxForceVectorLength = forceVectorLength;
                }
            });

            // Sleep for a few ms each iteration to visualize layouting via spring forces
            await this.sleep(1);

            iterations++;
        }

        // Persist that the spring embedder has terminated and is not running anymore
        this.springEmbedderRunning = false;
    }

    private sleep(ms: number) {
        return new Promise((r) => setTimeout(r, ms));
    }

    // Calculate the force vector that should be applied to the node in one iteration of the algorithm
    private calculateForceVector(
        node: Node,
        nodes: Node[],
        connectedNodes: Node[],
    ): Point {
        // Initialize force vector
        const forceVector = new Point(0, 0);

        // Calculate repulsion force from all other nodes
        nodes.forEach((n) => {
            if (n.id !== node.id) {
                const repulsionForce = this.calculateRepulsionForce(
                    node.position,
                    n.position,
                );
                // Add the calculated repulsion force to the force vector
                forceVector.x += repulsionForce.x;
                forceVector.y += repulsionForce.y;
            }
        });

        // Calculate the spring force from all connected nodes
        connectedNodes.forEach((cn) => {
            const attractionForce = this.calculateSpringForce(
                node.position,
                cn.position,
            );
            forceVector.x += attractionForce.x;
            forceVector.y += attractionForce.y;
        });

        return forceVector;
    }

    // Calculate repulsion vector between two nodes (points)
    private calculateRepulsionForce(u: Point, v: Point): Point {
        const factor = this.cRep / this.calculateDistance(v, u) ** 2;
        const unitVector = this.calculateUnitVector(v, u);
        return new Point(unitVector.x * factor, unitVector.y * factor);
    }

    // Calculate spring force (attraction/repulsion) vector between two points
    private calculateSpringForce(u: Point, v: Point): Point {
        const factor =
            this.cSpring * Math.log10(this.calculateDistance(v, u) / this.l);
        const unitVector = this.calculateUnitVector(u, v);
        return new Point(unitVector.x * factor, unitVector.y * factor);
    }

    // Calculate distance between two points
    private calculateDistance(p1: Point, p2: Point): number {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    // Calculate length of one vector (passed as a point)
    private calculateVectorLength(p: Point) {
        return Math.sqrt(p.x ** 2 + p.y ** 2);
    }

    // Calculate the unit vector between two points
    private calculateUnitVector(p1: Point, p2: Point) {
        const v = new Point(p2.x - p1.x, p2.y - p1.y);
        const length = this.calculateVectorLength(v);
        return new Point(v.x / length, v.y / length);
    }

    // The spring embedder algorithm cannot handle a situation where two nodes are
    // in the exact same place because we eventually end up dividing by 0 while calculating
    // the forces. We shift affected nodes by up to 50 pixels in the x and y directions
    // in order to not modify the meaning of the petri net too much before applying the
    // spring embedder layout.
    private shiftSamePositionNodes(nodes: Node[]) {
        const usedPoints: Point[] = [];

        nodes.forEach((node) => {
            // We have to use 'some' here since the 'includes' function cannot make
            // the nested comparison between points
            if (
                !usedPoints.some(
                    (point) =>
                        point.x === node.position.x &&
                        point.y === node.position.y,
                )
            ) {
                usedPoints.push(node.position);
            } else {
                let pointInUse = true;
                while (pointInUse) {
                    const shiftedPoint = this.shiftPoint(node.position);
                    if (
                        !usedPoints.some(
                            (point) =>
                                point.x === shiftedPoint.x &&
                                point.y === shiftedPoint.y,
                        )
                    ) {
                        node.position = shiftedPoint;
                        usedPoints.push(shiftedPoint);
                        pointInUse = false;
                    }
                }
            }
        });
    }

    // Returns a new point that is shifted in the x and y directions by up to 50 pixels randomly
    private shiftPoint(p: Point): Point {
        return new Point(
            p.x + Math.random() * 100 - 50,
            p.y + Math.random() * 100 - 50,
        );
    }
}
