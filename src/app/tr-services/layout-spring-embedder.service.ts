import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { Point } from '../tr-classes/petri-net/point';
import { Node } from '../tr-interfaces/petri-net/node';

/**
 * @Injectable
 * Provided in 'root', making this service a singleton available throughout the application.
 *
 * @description
 * The `LayoutSpringEmbedderService` is responsible for arranging Petri net elements (places and transitions)
 * in a visually appealing and understandable manner using a spring embedder algorithm.
 * This algorithm models the graph as a system of springs, where nodes repel each other and
 * connected nodes (linked by arcs) are attracted to each other. The layout is achieved by
 * iteratively adjusting node positions until the system reaches a state of equilibrium or
 * a predefined number of iterations is completed.
 *
 * This service implements an adaptation of Eades' spring embedder algorithm.
 *
 * Modularity:
 * - This service encapsulates all logic related to the spring embedder layout.
 * - It depends on the `DataService` to fetch the current state of the Petri net (nodes and arcs).
 *   This decouples the layout algorithm from the direct data manipulation and UI concerns,
 *   allowing `DataService` to be the single source of truth for Petri net data.
 * - The algorithm is broken down into several private methods, each handling a specific
 *   part of the calculation (e.g., repulsion force, spring force, distance), which improves
 *   readability and maintainability.
 * - It operates on generic `Node` and `Point` types, making it potentially reusable if the
 *   underlying data structures conform to these interfaces.
 */
@Injectable({
    providedIn: 'root',
})
export class LayoutSpringEmbedderService {
    // Parameters needed to make the spring embedder algorithm terminate
    /**
     * @private
     * @description Minimum change in force vector length to consider the algorithm converged.
     * If the maximum force applied in an iteration is less than epsilon, the algorithm may terminate.
     */
    private epsilon = 0.01;
    /**
     * @private
     * @description Maximum number of iterations the algorithm will run to prevent infinite loops
     * and ensure termination.
     */
    private maxIterations = 5000;

    // Constant repulsion force
    /**
     * @private
     * @description Constant factor determining the strength of the repulsion force between any two nodes.
     * Higher values result in nodes being pushed further apart.
     */
    private cRep = 20000;

    // Ideal length of arcs
    /**
     * @private
     * @description Ideal resting length for the "springs" connecting nodes (arcs).
     * The algorithm tries to make the distance between connected nodes equal to this length.
     */
    private l = 150;
    // Constant spring force
    /**
     * @private
     * @description Constant factor determining the strength of the spring force (attraction/repulsion)
     * between connected nodes.
     */
    private cSpring = 20;

    // Is true while the algorithm is running - will be used later when reapplying the spring embedder on performing an action
    /**
     * @private
     * @description Flag indicating whether the spring embedder algorithm is currently executing.
     * Used to prevent concurrent executions of the layout process.
     */
    private springEmbedderRunning = false;

    // determines if the spring embedder algorithm sould terminate before the next iteration of calculating and applying forces
    /**
     * @private
     * @description Flag that can be set externally (e.g., by another layout service or user action)
     * to signal that the current layout process should terminate prematurely.
     */
    private shouldTerminate = false;

    /**
     * @constructor
     * @param {DataService} dataService - Service to access Petri net data (places, transitions, arcs).
     */
    constructor(private dataService: DataService) {}

    // Stops the spring embedder algorithm before the next iteration
    /**
     * @public
     * @description Signals the spring embedder algorithm to stop its execution before the next iteration.
     * This allows for graceful termination of the layout process.
     */
    terminate() {
        this.shouldTerminate = true;
    }

    // Spring embedder adaptation for layouting our petri net
    // based on Eades spring embedder algorithm
    /**
     * @public
     * @async
     * @description
     * Executes the spring embedder layout algorithm on the current Petri net data.
     * It iteratively calculates and applies forces (repulsion between all nodes, spring forces between connected nodes)
     * to adjust node positions. The process continues until a maximum number of iterations is reached,
     * the layout stabilizes (forces become very small), or an external termination signal is received.
     *
     * Steps involved:
     * 1. Prevents execution if already running.
     * 2. Resets termination flags.
     * 3. Clears existing arc anchor points as they will be implicitly redefined by node positions.
     * 4. Gathers all places and transitions into a single list of nodes.
     * 5. Filters out orphan nodes (nodes with no connections) as they are not affected by spring forces from other nodes.
     * 6. Pre-calculates a map of connected nodes for each node to optimize force calculations.
     * 7. Resolves duplicate node positions by slightly shifting them using `shiftSamePositionNodes`.
     * 8. Enters the main iteration loop:
     *    a. Calculates the net force vector for each node.
     *    b. Applies these forces to update node positions.
     *    c. Tracks the maximum force applied in the iteration.
     *    d. Pauses briefly (`sleep`) to allow for visual updates if the layout is rendered dynamically.
     * 9. Terminates when conditions (max iterations, epsilon, `shouldTerminate`) are met.
     * 10. Updates `springEmbedderRunning` status.
     * @returns {Promise<void>} A promise that resolves when the layout algorithm completes or is terminated.
     */
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
                        connectedNodeMap[n.id] || [], // Ensure connectedNodes is always an array
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
        // Notify that data has changed, so UI can update if necessary
        this.dataService.triggerDataChanged();
    }

    /**
     * @private
     * @param {number} ms - The number of milliseconds to sleep.
     * @returns {Promise<void>} A promise that resolves after the specified duration.
     * @description Utility function to pause execution for a given number of milliseconds.
     * Used within the layout loop to allow for progressive rendering of layout changes.
     */
    private sleep(ms: number) {
        return new Promise((r) => setTimeout(r, ms));
    }

    // Calculate the force vector that should be applied to the node in one iteration of the algorithm
    /**
     * @private
     * @param {Node} node - The node for which to calculate the total force vector.
     * @param {Node[]} nodes - All other nodes in the graph (used for repulsion calculation).
     * @param {Node[]} connectedNodes - Nodes directly connected to the `node` (used for spring force calculation).
     * @returns {Point} A `Point` object representing the (dx, dy) force vector to be applied to `node`.
     * @description
     * Calculates the net force vector acting on a specific `node`. This force is the sum of:
     * 1. Repulsion forces from all other `nodes` in the graph.
     * 2. Spring forces (attraction/repulsion) from its `connectedNodes`.
     */
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
        // Ensure connectedNodes is an array before iterating
        (connectedNodes || []).forEach((cn) => {
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
    /**
     * @private
     * @param {Point} u - Position of the first node.
     * @param {Point} v - Position of the second node.
     * @returns {Point} A `Point` object representing the repulsion force vector exerted by node `v` on node `u`.
     * @description
     * Calculates the repulsion force between two nodes `u` and `v`.
     * The force is inversely proportional to the square of the distance between them (`cRep / distance^2`).
     * The direction of the force is along the line connecting `u` and `v`, pushing `u` away from `v`.
     */
    private calculateRepulsionForce(u: Point, v: Point): Point {
        const distance = this.calculateDistance(v, u);
        // Avoid division by zero or extremely large forces if distance is very small
        if (distance < 0.1) {
            // Apply a small random perturbation or a capped force
            return new Point( (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
        }
        const factor = this.cRep / distance ** 2;
        const unitVector = this.calculateUnitVector(v, u);
        return new Point(unitVector.x * factor, unitVector.y * factor);
    }

    // Calculate spring force (attraction/repulsion) vector between two points
    /**
     * @private
     * @param {Point} u - Position of the first connected node.
     * @param {Point} v - Position of the second connected node.
     * @returns {Point} A `Point` object representing the spring force vector between nodes `u` and `v`.
     * @description
     * Calculates the spring force between two connected nodes `u` and `v`.
     * The force is proportional to `cSpring * log10(distance / l)`, where `l` is the ideal spring length.
     * This force attracts nodes if they are further apart than `l` and repels them if they are closer.
     * The direction of the force is along the line connecting `u` and `v`.
     */
    private calculateSpringForce(u: Point, v: Point): Point {
        const distance = this.calculateDistance(v, u);
        // Avoid issues with log(0) or very small distances
        if (distance < 0.1) {
            // If nodes are too close, apply a small repulsive spring force or based on a minimum distance
            // This specific behavior might need adjustment based on desired outcome for very close nodes.
            // For now, let's assume they should repel slightly if too close, counteracting ideal length logic.
            const minDistanceFactor = this.cSpring * Math.log10(0.1 / this.l);
            const unitVectorMin = this.calculateUnitVector(u,v);
            return new Point(unitVectorMin.x * minDistanceFactor, unitVectorMin.y * minDistanceFactor);
        }
        const factor =
            this.cSpring * Math.log10(distance / this.l);
        const unitVector = this.calculateUnitVector(u, v);
        return new Point(unitVector.x * factor, unitVector.y * factor);
    }

    // Calculate distance between two points
    /**
     * @private
     * @param {Point} p1 - The first point.
     * @param {Point} p2 - The second point.
     * @returns {number} The Euclidean distance between `p1` and `p2`.
     */
    private calculateDistance(p1: Point, p2: Point): number {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    // Calculate length of one vector (passed as a point)
    /**
     * @private
     * @param {Point} p - The vector (represented as a point from the origin).
     * @returns {number} The magnitude (length) of the vector `p`.
     */
    private calculateVectorLength(p: Point) {
        return Math.sqrt(p.x ** 2 + p.y ** 2);
    }

    // Calculate the unit vector between two points
    /**
     * @private
     * @param {Point} p1 - The starting point of the vector.
     * @param {Point} p2 - The ending point of the vector.
     * @returns {Point} A `Point` object representing the unit vector from `p1` to `p2`.
     *                  Returns a zero vector if `p1` and `p2` are identical to avoid division by zero.
     */
    private calculateUnitVector(p1: Point, p2: Point) {
        const v = new Point(p2.x - p1.x, p2.y - p1.y);
        const length = this.calculateVectorLength(v);
        // Avoid division by zero if points are identical
        if (length === 0) {
            return new Point(0,0);
        }
        return new Point(v.x / length, v.y / length);
    }

    // The spring embedder algorithm cannot handle a situation where two nodes are
    // in the exact same place because we eventually end up dividing by 0 while calculating
    // the forces. We shift affected nodes by up to 50 pixels in the x and y directions
    // in order to not modify the meaning of the petri net too much before applying the
    // spring embedder layout.
    /**
     * @private
     * @param {Node[]} nodes - The list of nodes to check and modify.
     * @description
     * Pre-processes the list of nodes to ensure no two nodes occupy the exact same position.
     * If duplicate positions are found, nodes are shifted by a small random offset until
     * all positions are unique. This is crucial to prevent division by zero errors during
     * force calculations (e.g., in `calculateRepulsionForce` or `calculateUnitVector`
     * when distance is zero).
     * The shift is kept small (up to 50 pixels randomly in x and y) to minimize
     * disruption to any existing meaningful layout.
     */
    private shiftSamePositionNodes(nodes: Node[]) {
        const usedPoints: Point[] = [];

        nodes.forEach((node) => {
            // We have to use 'some' here since the 'includes' function cannot make
            // the nested comparison between points
            let currentPositionIsUsed = usedPoints.some(
                (point) =>
                    point.x === node.position.x &&
                    point.y === node.position.y,
            );

            if (!currentPositionIsUsed) {
                usedPoints.push(new Point(node.position.x, node.position.y)); // Store a copy
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
                        node.position.x = shiftedPoint.x; // Modify original node's position
                        node.position.y = shiftedPoint.y;
                        usedPoints.push(shiftedPoint); // Store the new unique point
                        pointInUse = false;
                    }
                }
            }
        });
    }

    // Returns a new point that is shifted in the x and y directions by up to 50 pixels randomly
    /**
     * @private
     * @param {Point} p - The original point.
     * @returns {Point} A new `Point` object with coordinates randomly shifted from the original point `p`.
     *                  The shift is between -50 and +50 pixels for both x and y coordinates.
     */
    private shiftPoint(p: Point): Point {
        return new Point(
            p.x + Math.random() * 100 - 50,
            p.y + Math.random() * 100 - 50,
        );
    }
}
