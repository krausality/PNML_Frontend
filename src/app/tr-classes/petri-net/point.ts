export class Point {
    public x: number;
    public y: number;
    public isAutomatic?: boolean; // <-- Hinzugefügt

    constructor(
        x: number,
        y: number,
        isAutomatic: boolean = false // <-- Optional im Konstruktor
    ) {
        this.x = x;
        this.y = y;
        this.isAutomatic = isAutomatic; // <-- Zugewiesen
    }

    // Optional: Static methods can remain if they exist
    /*
    static distance(p1: Point, p2: Point): number { ... }
    static vector(p1: Point, p2: Point): { x: number; y: number } { ... }
    static magnitude(v: { x: number; y: number }): number { ... }
    static normalize(v: { x: number; y: number }): { x: number; y: number } { ... }
    */
}
