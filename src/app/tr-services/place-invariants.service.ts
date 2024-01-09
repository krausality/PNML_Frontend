import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { SingularValueDecomposition } from 'ml-matrix';

@Injectable({
    providedIn: 'root',
})
export class PlaceInvariantsService {
    placeIds: string[] = [];
    transIds: string[] = [];
    incidenceMatrix: number[][] = [];
    placeInvariantsMatrix: number[][] = [];

    // Incidence Matrices for Testing *************************************

    // From https://teaching.model.in.tum.de/2021ss/petri/material/petrinets.pdf
    // page 89 (local file: TUM_petrinets_incl_Farkas.pdf)
    tM1: number[][] = [
        [-1, 1, 1, -1],
        [1, -1, -1, 1],
        [0, 0, 1, 0],
        [1, 0, 0, -1],
        [-1, 0, 0, 1],
    ];
    // Result matrix from presentation (contains one linearly dependent vector):
    // 1 1 0 0 0
    // 0 0 0 1 1
    // 1 1 0 1 1

    // From http://theo.cs.ovgu.de/lehre/lehre08w/petri/petri08-text1.pdf
    // page 53 (pdf: 36) (local file: Vorlesungsscript-Petrinetze_Magdeburg_2008.pdf)
    tM2: number[][] = [
        [-1, -1, 1, 0],
        [1, -1, 0, 0],
        [0, 2, -1, 0],
    ];
    // Result matrix from Script (page 61 / pdf: 43):
    // 1 1 1

    // Fromhttp://dbis.informatik.uni-freiburg.de/content/courses/SS09/Spezialvorlesung/Formale%20Grundlagen%20von%20Informationssystemen/folien/3-1-Petri-Netze.pdf
    // page 66 (local file: 3-1-Petri-Netze.pdf)
    tM3: number[][] = [
        [1, -1, 0, 0],
        [-1, -1, 1, 0],
        [0, 2, -1, 0],
    ];
    // Result matrix
    // 1 1 1

    // From http://dbis.informatik.uni-freiburg.de/content/courses/SS09/Spezialvorlesung/Formale%20Grundlagen%20von%20Informationssystemen/folien/3-1-Petri-Netze.pdf
    // page 70 (local file: 3-1-Petri-Netze.pdf)
    tM4: number[][] = [
        [-1, -1, -1, 1, 1, 1],
        [1, 0, 0, -1, 0, 0],
        [0, 1, 0, 0, -1, 0],
        [0, 0, 1, 0, 0, -1],
        [-1, 0, 0, 1, 0, 0],
        [0, -1, 0, 0, 1, 0],
        [0, 0, -1, 0, 0, 1],
    ];
    // Result matrix from presentation (page 70):
    // 0 1 0 0 1 0 0
    // 0 0 1 0 0 1 0
    // 0 0 0 1 0 0 1
    // 1 1 1 1 0 0 0

    // END: Incidence Matrices for Testing ********************************

    constructor(private dataService: DataService) {}

    calculatePIs() {
        // Reset
        this.placeIds = [];
        this.transIds = [];
        this.incidenceMatrix = [];
        this.placeInvariantsMatrix = [];

        this.calculateIncidenceMatrix();
        // console.log(this.incidenceMatrix);

        this.placeInvariantsMatrix = this.placeInvariants(this.incidenceMatrix);
        console.log(this.placeInvariantsMatrix);
    }

    removeNonMinimalPIs() {
        this.placeInvariantsMatrix = this.calculateMinimalPIs(
            this.placeInvariantsMatrix,
            this.incidenceMatrix,
        );
        console.log(this.placeInvariantsMatrix);
    }

    calculateIncidenceMatrix() {
        // Determine placeIds
        this.dataService
            .getPlaces()
            .forEach((place) => this.placeIds.push(place.id));
        // console.log(this.placeIds);

        // Determine transIds
        this.dataService
            .getTransitions()
            .forEach((transition) => this.transIds.push(transition.id));
        // console.log(this.transIds);

        const n = this.placeIds.length; // number of rows of incidence matrix
        const m = this.transIds.length; // number of columns of incidence matrix
        // Initialize incidence matrix with 0s
        this.incidenceMatrix = Array.from({ length: n }, () =>
            Array.from({ length: m }, () => 0),
        );

        for (let t of this.dataService.getTransitions()) {
            const colIndex = this.transIds.indexOf(t.id);
            // pre-arcs give values for output matrix
            for (let preArc of t.getPreArcs()) {
                const rowIndex = this.placeIds.indexOf(preArc.from.id);
                this.incidenceMatrix[rowIndex][colIndex] += preArc.weight; // Note: weight of pre-arcs has negative sign
            }
            // post-arcs give values for input matrix
            for (let postArc of t.getPostArcs()) {
                const rowIndex = this.placeIds.indexOf(postArc.to.id);
                this.incidenceMatrix[rowIndex][colIndex] += postArc.weight;
            }
        }
    }

    placeInvariants(incidenceMatrix: number[][]): number[][] {
        // incidenceMatrix: nxm matrix
        // n rows: places
        // m columns: transitions

        // Determine n
        const n: number = incidenceMatrix.length;
        // TODO: handle case n===0

        // Determine m
        const m: number = incidenceMatrix[0].length;

        // nxn identity matrix
        // TODO Approach with for loops --> easier to understand
        const identityMatrix: number[][] = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
        );

        // Augmentation dMat = (incidenceMatrix | identityMatrix)
        let dMat: number[][] = incidenceMatrix.map((row, i) =>
            row.concat(identityMatrix[i]),
        );

        //console.log(dMat);

        for (let i = 0; i < m; i++) {
            const k = dMat.length; // current number of rows in dMat(i-1), i.e. D(i-1)
            // console.log("k: " + k);
            for (let j1 = 0; j1 < k; j1++) {
                for (let j2 = j1 + 1; j2 < k; j2++) {
                    const d1 = dMat[j1]; // row j1
                    const d2 = dMat[j2]; // row j2
                    if (Math.sign(d1[i]) * Math.sign(d2[i]) === -1) {
                        const absD1I = Math.abs(d1[i]);
                        const absD2I = Math.abs(d2[i]);

                        // Scalar multiplication and addition of the vectors:
                        // d := |d2(i)| · d1 + |d1(i)| · d2
                        const d: number[] = d1.map(
                            (value, index) =>
                                absD2I * value + absD1I * d2[index],
                        );

                        const gcdOfD = this.gcdArray(d);
                        if (!gcdOfD)
                            throw new Error('Error in calculation of gcd');
                        const dPrime = d.map((value) => value / gcdOfD);

                        // Augment dMat with dPrime as the last row
                        dMat = [...dMat, dPrime];
                        //console.log(dMat);
                    }
                }
            }
            // Filter rows where ith element is 0.
            // Use an epsilon value instead of exact 0 to account for numerical
            // inaccuracies.
            const epsilon = 0.00000001;
            dMat = dMat.filter((row) => Math.abs(row[i]) < epsilon);
            // console.log(dMat);
        }

        // Remove first m columns from the matrix
        dMat = dMat.map((row) => row.slice(m));

        return dMat;
        // return new Array<Array<number>>;
    }

    /**
     * Calculation of Minimal Support Invariants
     *
     * Algorithm from:
     * Martínez, J., & Silva, M. (1982). A simple and fast algorithm to obtain all invariants of a generalised Petri net. In Application and Theory of Petri Nets: Selected Papers from the First and the Second European Workshop on Application and Theory of Petri Nets Strasbourg, 23.–26. September 1980 Bad Honnef, 28.–30. September 1981 (pp. 301-310). Berlin, Heidelberg: Springer Berlin Heidelberg.
     *
     * @param {number[][]} dMat - matrix of place invariants, possibly including non-minimal  support invariants
     * @param {number[][]} incidenceMatrix - incidence matrix of the petri net
     * @returns {number[][]} - matrix of minimal support invariants
     */
    calculateMinimalPIs(
        dMat: number[][],
        incidenceMatrix: number[][],
    ): number[][] {
        let dMatMin: number[][] = [];

        for (let pInvariant of dMat) {
            // Indices of support places of the invariant
            let supportIndices = [];
            for (let i = 0; i < pInvariant.length; i++) {
                if (pInvariant[i] > 1e-10) {
                    supportIndices.push(i);
                }
            }

            let Mq: number[][] = [];
            for (let i of supportIndices) {
                Mq.push(incidenceMatrix[i]);
            }

            let q = supportIndices.length;

            if (q === this.rank(Mq) + 1) {
                dMatMin.push(pInvariant);
            }
        }

        return dMatMin;
    }

    // Greatest common divisor of two numbers
    private gcd(a: number, b: number): number {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    private gcdArray(arr: number[]): number | undefined {
        if (arr.length === 0) return undefined;

        let result: number = arr[0];

        for (let i = 1; i < arr.length; i++) {
            result = this.gcd(result, arr[i]);
        }

        return result;
    }

    // Rank of a matrix
    rank(mat: number[][]): number {
        let svd = new SingularValueDecomposition(mat, { autoTranspose: true });
        return svd.diagonal.filter((value) => value > 1e-10).length;
    }
}
