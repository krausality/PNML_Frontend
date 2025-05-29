/**
 * @file point.ts
 * @description This file defines the Point class, a simple utility class to represent 2D coordinates.
 * It is used throughout the application to define positions of Petri net elements, SVG coordinates, etc.
 */
export class Point3D {
    constructor(
        public x: number,
        public y: number,
        public z: number = 0, // Default value for z-coordinate
    ) {}
}
