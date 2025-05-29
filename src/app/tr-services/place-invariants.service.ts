/**
 * @file place-invariants.service.ts
 *
 * @description
 * This service is responsible for the calculation and management of place invariants (PIs)
 * for a Petri net. Place invariants are fundamental structural properties of Petri nets,
 * representing sets of places where the weighted sum of tokens remains constant across all
 * possible transition firings.
 *
 * The service encapsulates the mathematical algorithms required to:
 * 1.  Construct the incidence matrix from the Petri net structure.
 * 2.  Calculate all place invariants using an algorithm based on Farkas' Lemma or a similar method.
 * 3.  Optionally, refine the set of PIs to find the minimal support place invariants,
 *     which are the most fundamental invariants from which others can be derived.
 *
 * Modularity:
 * - **Data Source:** This service consumes Petri net data (places, transitions, arcs)
 *   from the central `DataService`. This decouples the PI calculation logic from the
 *   direct management of the Petri net model, promoting a clean separation of concerns.
 *   The `DataService` acts as the single source of truth for the net's structure and state.
 * - **Mathematical Operations:** For complex linear algebra operations, specifically Singular
 *   Value Decomposition (SVD) needed for rank calculation in the minimal PI algorithm,
 *   it leverages the `ml-matrix` library. This modular approach outsources specialized
 *   numerical computations to a dedicated library.
 * - **Core Logic:** The algorithms for incidence matrix construction, general PI calculation,
 *   and minimal PI calculation are implemented within this service. These can be seen as
 *   distinct algorithmic modules.
 * - **State Management for UI:** The service also manages state related to the presentation
 *   and interaction with PIs, such as which PIs are selected, whether to show minimal PIs,
 *   and facilities for exploring linear combinations of PIs. This state is used by UI
 *   components to display PI information to the user.
 *
 * Why these modules were chosen:
 * - **Maintainability:** Separating data acquisition (`DataService`), core algorithmic logic
 *   (incidence matrix, PI calculation, minimal PI calculation), and UI-related state
 *   management makes the service easier to understand, debug, and modify. Changes to
 *   the Petri net data representation in `DataService` would primarily affect the data
 *   consumption part of this service, while algorithmic changes would be localized
 *   to their respective methods.
 * - **Reusability:** The core calculation methods could potentially be reused if, for example,
 *   transition invariants were to be calculated using similar matrix techniques.
 * - **Testability:** Each module or distinct piece of functionality (e.g., incidence matrix
 *   calculation, minimal PI algorithm) can be tested more easily in isolation.
 * - **Clarity:** The structure reflects the logical steps involved in PI analysis:
 *   get data -> build matrix -> calculate invariants -> refine invariants -> present results.
 *
 * The results of this service (the calculated PIs) are crucial for:
 * - Verifying the correctness of Petri net models (e.g., conservation of resources).
 * - Understanding the inherent properties and behavior of the modeled system.
 * - Providing insights for system analysis and debugging.
 */
import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { SingularValueDecomposition } from 'ml-matrix';
import { Place } from '../tr-classes/petri-net/place';

@Injectable({
    providedIn: 'root',
})
export class PlaceInvariantsService {
    /**
     * Stores the IDs of the places in the Petri net.
     * The order of IDs in this array corresponds to the rows of the incidence matrix
     * and the elements of the place invariant vectors.
     */
    placeIds: string[] = [];
    /**
     * Stores the IDs of the transitions in the Petri net.
     * The order of IDs in this array corresponds to the columns of the incidence matrix.
     */
    transIds: string[] = [];
    /**
     * The incidence matrix (C) of the Petri net.
     * Rows correspond to places (ordered by `placeIds`), and columns correspond to
     * transitions (ordered by `transIds`).
     * `C[i][j]` represents the change in tokens of place `i` when transition `j` fires.
     * Undefined if not yet calculated.
     */
    incidenceMatrix: number[][] | undefined;
    /**
     * Matrix where each row represents a place invariant (PI).
     * Each element `P[i][j]` is the coefficient of place `j` (from `placeIds`)
     * in the `i`-th place invariant.
     * This matrix can contain either all calculated PIs or only minimal support PIs,
     * indicated by the `isMinimal` flag.
     * Undefined if not yet calculated.
     */
    placeInvariantsMatrix: number[][] | undefined;

    /**
     * Flag indicating whether the `placeInvariantsMatrix` currently stores the
     * set of minimal support place invariants.
     * `true` if minimal PIs have been calculated and stored; `false` otherwise.
     */
    isMinimal: boolean = false;

    // Linear Combination of the selected PIs.
    // The length of the vector is the number of places of the petri net.
    // Each element corresponds to the place in placeIds with the same index.
    // The values are the factors for the places for the new place invariant
    // that results from the linear combination.
    /**
     * Represents a vector resulting from a linear combination of selected place invariants.
     * The length of the vector is equal to the number of places in the Petri net.
     * Each element `linearCombination[i]` corresponds to the coefficient for the place
     * `placeIds[i]` in the resulting combined invariant.
     * This allows users to explore new invariants derived from the calculated ones.
     */
    linearCombination: number[] = [];

    /**
     * A boolean vector indicating which rows (PIs) of the `placeInvariantsMatrix`
     * are currently selected by the user.
     * `selectedPIs[i]` is `true` if the `i`-th PI is selected, `false` otherwise.
     * This selection is used, for example, to compute the `linearCombination`.
     */
    selectedPIs: boolean[] = [];

    // Variable that holds the place, for which a place specific PI table will
    // be shown.
    // If set, only PIs containing this place are shown.
    /**
     * Holds a `Place` object if the user has chosen to view a table of PIs
     * specifically related to this place.
     * If set, the displayed PI table will be filtered to show only PIs that
     * have a non-zero coefficient for this `selectedPlaceForPITable`.
     * Undefined if no specific place is selected for filtering.
     */
    selectedPlaceForPITable: Place | undefined;

    // Boolean variable that indicates whether table for linear combination (LC)
    // of PIs is shown
    /**
     * Boolean flag indicating whether a table for displaying the
     * `linearCombination` of PIs should be shown in the UI.
     * `true` if the linear combination table is active; `false` otherwise.
     */
    showLCTable: boolean = false;

    // Incidence Matrices for Testing *****************************************

    // From https://teaching.model.in.tum.de/2021ss/petri/material/petrinets.pdf
    // page 89
    // tM1: number[][] = [
    //     [-1, 1, 1, -1],
    //     [1, -1, -1, 1],
    //     [0, 0, 1, 0],
    //     [1, 0, 0, -1],
    //     [-1, 0, 0, 1],
    // ];
    // Result matrix from presentation (contains one linearly dependent vector):
    // 1 1 0 0 0
    // 0 0 0 1 1
    // 1 1 0 1 1

    // From http://theo.cs.ovgu.de/lehre/lehre08w/petri/petri08-text1.pdf
    // page 53 (pdf: 36)
    // tM2: number[][] = [
    //     [-1, -1, 1, 0],
    //     [1, -1, 0, 0],
    //     [0, 2, -1, 0],
    // ];
    // Result matrix from Script (page 61 / pdf: 43):
    // 1 1 1

    // From http://dbis.informatik.uni-freiburg.de/content/courses/SS09/Spezialvorlesung/Formale%20Grundlagen%20von%20Informationssystemen/folien/3-1-Petri-Netze.pdf
    // page 66
    // tM3: number[][] = [
    //     [1, -1, 0, 0],
    //     [-1, -1, 1, 0],
    //     [0, 2, -1, 0],
    // ];
    // Result matrix
    // 1 1 1

    // From http://dbis.informatik.uni-freiburg.de/content/courses/SS09/Spezialvorlesung/Formale%20Grundlagen%20von%20Informationssystemen/folien/3-1-Petri-Netze.pdf
    // page 70
    // tM4: number[][] = [
    //     [-1, -1, -1, 1, 1, 1],
    //     [1, 0, 0, -1, 0, 0],
    //     [0, 1, 0, 0, -1, 0],
    //     [0, 0, 1, 0, 0, -1],
    //     [-1, 0, 0, 1, 0, 0],
    //     [0, -1, 0, 0, 1, 0],
    //     [0, 0, -1, 0, 0, 1],
    // ];
    // Result matrix from presentation (page 70):
    // 0 1 0 0 1 0 0
    // 0 0 1 0 0 1 0
    // 0 0 0 1 0 0 1
    // 1 1 1 1 0 0 0

    // END: Incidence Matrices for Testing ************************************

    /**
     * Constructs the PlaceInvariantsService.
     * @param dataService The central service for accessing Petri net data.
     *                    It's injected to retrieve places, transitions, and arcs.
     */
    constructor(private dataService: DataService) {}

    /**
     * Calculates the place invariants for the current Petri net.
     * This is the main entry point for PI calculation.
     * It performs the following steps:
     * 1. Resets any previous PI data.
     * 2. Calculates the incidence matrix using `calculateIncidenceMatrix()`.
     * 3. Calculates the place invariants (non-minimal) using `placeInvariants()`.
     * 4. Initializes `selectedPIs` to select all calculated PIs by default.
     * 5. Calculates the initial `linearCombination` based on all PIs.
     *
     * After this method, `placeInvariantsMatrix` will contain all PIs found by the
     * algorithm, and `isMinimal` will be `false`.
     */
    calculatePIs() {
        // Reset
        this.reset();

        this.incidenceMatrix = this.calculateIncidenceMatrix();

        this.placeInvariantsMatrix = this.placeInvariants(this.incidenceMatrix);

        // Selected PIs for display: default --> all
        this.selectedPIs = Array(this.placeInvariantsMatrix.length).fill(true);
        this.calculateLinearCombination();
    }

    /**
     * Refines the existing set of place invariants to find and store only the
     * minimal support place invariants.
     * It calls `calculateMinimalPIs()` with the current `placeInvariantsMatrix`
     * and `incidenceMatrix`.
     * After this method:
     * - `placeInvariantsMatrix` is updated to contain only minimal PIs.
     * - `isMinimal` is set to `true`.
     * - `selectedPIs` is reset to select all minimal PIs.
     * - `linearCombination` is recalculated.
     *
     * This method should only be called after `calculatePIs()` has been executed.
     */
    removeNonMinimalPIs() {
        if (this.incidenceMatrix && this.placeInvariantsMatrix) {
            this.placeInvariantsMatrix = this.calculateMinimalPIs(
                this.placeInvariantsMatrix,
                this.incidenceMatrix,
            );
            this.isMinimal = true;

            // Selected PIs for display: default --> all
            this.selectedPIs = Array(this.placeInvariantsMatrix.length).fill(
                true,
            );
            this.calculateLinearCombination();
        }
    }

    /**
     * Calculates the incidence matrix of the Petri net.
     * The matrix dimensions are `numberOfPlaces` x `numberOfTransitions`.
     * Each entry `C[i][j]` is the net change in tokens of place `i` if transition `j` fires.
     * It populates `this.placeIds` and `this.transIds` with the IDs of places and
     * transitions, respectively, preserving the order used in the matrix.
     *
     * The calculation considers the weights of pre-arcs (from place to transition,
     * stored with a negative sign in the `Arc` class) and post-arcs (from transition
     * to place).
     *
     * @returns {number[][]} The calculated incidence matrix.
     */
    calculateIncidenceMatrix(): number[][] {
        // Determine placeIds
        this.dataService
            .getPlaces()
            .forEach((place) => this.placeIds.push(place.id));

        // Determine transIds
        this.dataService
            .getTransitions()
            .forEach((transition) => this.transIds.push(transition.id));

        const n = this.placeIds.length; // number of rows of incidence matrix
        const m = this.transIds.length; // number of columns of incidence matrix

        // Initialize incidence matrix with 0s
        let incMat = Array.from({ length: n }, () =>
            Array.from({ length: m }, () => 0),
        );

        for (let t of this.dataService.getTransitions()) {
            const colIndex = this.transIds.indexOf(t.id);

            // pre-arcs
            for (let preArc of t.getPreArcs()) {
                const rowIndex = this.placeIds.indexOf(preArc.from.id);
                incMat[rowIndex][colIndex] += preArc.weight; // Note: weight of pre-arcs has negative sign
            }

            // post-arcs
            for (let postArc of t.getPostArcs()) {
                const rowIndex = this.placeIds.indexOf(postArc.to.id);
                incMat[rowIndex][colIndex] += postArc.weight;
            }
        }

        return incMat;
    }

    /**
     * Calculates place invariants from a given incidence matrix.
     * This method implements an algorithm (e.g., based on Farkas' Lemma or related
     * techniques for finding integer solutions to `C*x = 0`) to find vectors `x`
     * (place invariants) such that `x^T * C = 0`.
     *
     * The algorithm involves:
     * 1. Augmenting the incidence matrix `C` with an identity matrix `I`: `D_0 = [C | I]`.
     * 2. Iteratively processing columns of `C`. In each step `k` (for column `k` of `C`):
     *    a. For pairs of rows in `D_{k-1}` with opposite signs in column `k`,
     *       new rows are generated by linear combinations that eliminate the entry
     *       in column `k`. These new rows are normalized by their GCD.
     *    b. Rows where the `k`-th element is not zero are removed.
     *    The result is `D_k`.
     * 3. After processing all columns of `C` (i.e., obtaining `D_m` where `m` is the
     *    number of transitions), the first `m` columns are removed. The remaining
     *    columns form the place invariants. Each row is a PI vector.
     *
     * Note: This method typically finds a set of PIs that may include non-minimal ones.
     *
     * @param incidenceMatrix The incidence matrix of the Petri net (n x m, n places, m transitions).
     * @returns {number[][]} A matrix where each row is a place invariant vector.
     *                       The columns of these vectors correspond to the places in `this.placeIds`.
     * @throws {Error} If an error occurs during GCD calculation.
     */
    placeInvariants(incidenceMatrix: number[][]): number[][] {
        // incidenceMatrix: nxm matrix
        // n rows: places
        // m columns: transitions

        // Determine n
        const n: number = this.placeIds.length;

        // Determine m
        const m: number = this.transIds.length;

        // nxn identity matrix
        const identityMatrix: number[][] = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
        );

        // Augmentation dMat = (incidenceMatrix | identityMatrix)
        let dMat: number[][] = incidenceMatrix.map((row, i) =>
            row.concat(identityMatrix[i]),
        );

        for (let i = 0; i < m; i++) {
            const k = dMat.length; // current number of rows in dMat(i-1), i.e. D(i-1)

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
                    }
                }
            }

            // Filter rows where ith element is 0.
            // Use an epsilon value instead of exact 0 to account for numerical
            // inaccuracies.
            const epsilon = 0.00000001;
            dMat = dMat.filter((row) => Math.abs(row[i]) < epsilon);
        }

        // Remove first m columns from the matrix
        dMat = dMat.map((row) => row.slice(m));

        return dMat;
    }

    /**
     * Calculates minimal support place invariants from a given set of place invariants
     * and the incidence matrix.
     *
     * A place invariant `y` is of minimal support if its support (the set of places `P_y`
     * for which `y(p) > 0`) is not a proper superset of the support of any other
     * place invariant `y'`, and `y` cannot be expressed as a positive linear combination
     * of other PIs with smaller support.
     *
     * The algorithm implemented is based on the paper:
     * Martínez, J., & Silva, M. (1982). A simple and fast algorithm to obtain all
     * invariants of a generalised Petri net. In Application and Theory of Petri Nets
     * (pp. 301-310). Springer Berlin Heidelberg.
     *
     * For each input place invariant `pInvariant` from `dMat`:
     * 1. Determine its support places (indices where `pInvariant[i] > 0`).
     * 2. Construct a submatrix `Mq` of the `incidenceMatrix` containing only the rows
     *    corresponding to these support places.
     * 3. If the number of support places (`q`) equals `rank(Mq) + 1`, then `pInvariant`
     *    is considered a minimal support PI.
     *
     * @param dMat A matrix of place invariants, potentially including non-minimal ones.
     *             Each row is a PI vector.
     * @param incidenceMatrix The incidence matrix of the Petri net.
     * @returns {number[][]} A matrix containing only minimal support place invariants.
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

    /**
     * Calculates the `linearCombination` vector based on the currently `selectedPIs`
     * and the `placeInvariantsMatrix`.
     * The resulting vector is the sum of all PI vectors that are marked as `true`
     * in `this.selectedPIs`.
     * If `placeInvariantsMatrix` is undefined, `linearCombination` is reset to an empty array.
     */
    calculateLinearCombination() {
        // Initialize vector for linear combination of PIs
        this.linearCombination = Array(this.placeIds.length).fill(0);

        if (this.placeInvariantsMatrix) {
            for (let i = 0; i < this.placeInvariantsMatrix.length; i++) {
                if (this.selectedPIs[i]) {
                    for (
                        let j = 0;
                        j < this.placeInvariantsMatrix[i].length;
                        j++
                    ) {
                        this.linearCombination[j] +=
                            this.placeInvariantsMatrix[i][j];
                    }
                }
            }
        } else {
            // Reset linearCombination
            this.linearCombination = [];
        }
    }

    /**
     * Gets a string representation of the current `linearCombination` of place invariants.
     * Formats it as a sum of terms, e.g., "p1 + 2*p2 + p3".
     * Only places with a non-zero positive coefficient in the `linearCombination` are included.
     * Place IDs are taken from `this.placeIds`.
     *
     * @returns {string} A string representing the linear combination.
     */
    get linearCombinationString(): string {
        let pIString = '';

        for (let i = 0; i < this.placeIds.length; i++) {
            const f = this.linearCombination[i];
            if (f > 0) {
                pIString +=
                    (pIString.length > 0 ? ' + ' : '') +
                    (f > 1 ? f + '*' : '') +
                    this.placeIds[i];
            }
        }

        return pIString;
    }

    /**
     * Calculates the weighted sum of tokens based on the current `linearCombination`
     * of place invariants and the current marking (token distribution) of the Petri net.
     * For a valid place invariant, this sum should remain constant regardless of
     * transition firings.
     * It retrieves the current token counts from `DataService.getPlaces()`.
     *
     * @returns {number} The calculated token sum for the linear combination.
     */
    get tokenSumOfLinearCombination(): number {
        let tokenSum = 0;
        for (let place of this.dataService.getPlaces()) {
            const index = this.placeIds.indexOf(place.id);
            tokenSum += this.linearCombination[index] * place.token;
        }
        return tokenSum;
    }

    // Number of selected PIs
    /**
     * Gets the number of place invariants currently selected by the user.
     * This is the count of `true` values in the `selectedPIs` array.
     *
     * @returns {number} The count of selected PIs.
     */
    get numOfSelctedPIs(): number {
        return this.selectedPIs.filter((isSelected) => isSelected).length;
    }

    // Returns the factor for the place placeId in the place invariant
    // which is the result of the linear combination of the selected
    // place invariants.
    // Returns undefined, if placeId is not found in placeIds (i.e. the
    // index = this.placeIds.indexOf(placeId) is -1)
    // or index >= this.linearCombination.length.
    /**
     * Retrieves the coefficient (factor) for a specific place in the current
     * `linearCombination` of place invariants.
     *
     * @param placeId The ID of the place for which to find the factor.
     * @returns {number | undefined} The coefficient of the place in the linear combination,
     *                               or `undefined` if the `placeId` is not found or the
     *                               index is out of bounds.
     */
    placeFactor(placeId: string): number | undefined {
        return this.linearCombination[this.placeIds.indexOf(placeId)];
    }

    /**
     * Resets the service to its initial state.
     * Clears all calculated data including:
     * - `placeIds`
     * - `transIds`
     * - `incidenceMatrix`
     * - `placeInvariantsMatrix`
     * - `linearCombination`
     * - `selectedPIs`
     * Also resets flags and selections:
     * - `isMinimal` to `false`
     * - `selectedPlaceForPITable` to `undefined`
     * - `showLCTable` to `false`
     *
     * This is typically called before starting a new PI calculation.
     */
    reset() {
        this.placeIds = [];
        this.transIds = [];
        this.incidenceMatrix = undefined;
        this.placeInvariantsMatrix = undefined;
        this.isMinimal = false;
        this.linearCombination = [];
        this.selectedPIs = [];
        this.selectedPlaceForPITable = undefined;
        this.showLCTable = false;
    }

    /**
     * Toggles the selection state of a place invariant at the given index in `selectedPIs`.
     * If the PI at `selectedPIs[index]` was `true`, it becomes `false`, and vice-versa.
     * After toggling, it recalculates the `linearCombination` to reflect the change.
     *
     * @param index The index of the place invariant in `placeInvariantsMatrix` (and `selectedPIs`)
     *              whose selection state is to be toggled.
     */
    toggleSelectedPI(index: number) {
        this.selectedPIs[index] = !this.selectedPIs[index];
        this.calculateLinearCombination();
    }

    /**
     * Determines whether a given place invariant vector should be included in the
     * displayed place invariant table, based on the current filtering criteria.
     *
     * - If `this.selectedPlaceForPITable` is set, the method returns `true` if the `placeInvariant`
     *   has a positive coefficient for that selected place.
     * - Otherwise (if no specific place is selected for filtering), it returns `true`
     *   by default, meaning all PIs are to be included.
     *
     * @param placeInvariant A place invariant vector (a row from `placeInvariantsMatrix`).
     * @returns {boolean} `true` if the PI should be included in the display; `false` otherwise.
     */
    includePI(placeInvariant: number[]): boolean {
        if (this.selectedPlaceForPITable) {
            let placeIndex = this.placeIds.indexOf(
                this.selectedPlaceForPITable.id,
            );
            return placeInvariant[placeIndex] > 0;
        } else {
            return true;
        }
    }

    /**
     * Filters the `placeInvariantsMatrix` to return only those place invariants
     * that involve the `selectedPlaceForPITable` (if one is selected).
     * It uses the `includePI()` method to determine inclusion.
     *
     * @returns {number[][]} A matrix of place invariants that include the
     *                       `selectedPlaceForPITable`. If no place is selected or
     *                       `placeInvariantsMatrix` is undefined, it might return
     *                       an empty array or all PIs based on `includePI` logic.
     *                       Returns an empty array if `placeInvariantsMatrix` is not set.
     */
    placeInvariantsWithSelectedPlace(): number[][] {
        let PIsWithSelectedPlace: number[][] = [];
        if (this.placeInvariantsMatrix) {
            for (let placeInvariant of this.placeInvariantsMatrix) {
                if (this.includePI(placeInvariant)) {
                    PIsWithSelectedPlace.push(placeInvariant);
                }
            }
        }
        return PIsWithSelectedPlace;
    }

    /**
     * Generates a human-readable informational string about the place invariants
     * that contain the `selectedPlaceForPITable`.
     * The string indicates the number and type (minimal or Farkas) of PIs found
     * for the specified place.
     * Example: "There are 3 minimal place invariants that contain p1".
     *
     * @returns {string} An informational message.
     */
    infoPIsWithSelectedPlace(): string {
        let place = this.selectedPlaceForPITable;
        let n = this.placeInvariantsWithSelectedPlace().length;
        let info = '';
        let pITypeSingular: string = this.isMinimal
            ? 'minimal place invariant'
            : 'place invariant (Farkas)';
        let pITypePlural: string = this.isMinimal
            ? 'minimal place invariants'
            : 'place invariants (Farkas)';
        switch (n) {
            case 0:
                info =
                    'There are no ' +
                    pITypePlural +
                    ' that contain ' +
                    place?.id;
                break;
            case 1:
                info =
                    'There is 1 ' +
                    pITypeSingular +
                    ' that contains ' +
                    place?.id;
                break;
            default:
                info =
                    'There are ' +
                    n +
                    ' ' +
                    pITypePlural +
                    ' that contain ' +
                    place?.id;
        }
        return info;
    }

    /**
     * Generates the header string for the place invariants table to be displayed in the UI.
     * The header text depends on the current context:
     * - If `selectedPlaceForPITable` is set, the header is the ID of that place.
     * - If `showLCTable` is true, it indicates a "Linear Combination" table.
     * - Otherwise, it describes the number and type (Minimal or Farkas) of PIs calculated.
     * - If no PIs have been calculated yet, it returns a message indicating that.
     *
     * @returns {string} The header string for the PI table.
     */
    headerPItable(): string {
        if (this.selectedPlaceForPITable) {
            // Header for table for a specific place
            return this.selectedPlaceForPITable.id;
        } else {
            if (!this.placeInvariantsMatrix) {
                return 'A Place Invariants Table Has Not Yet Been Calculated';
            }

            let pITypeSingular: string = this.isMinimal
                ? 'Minimal Place Invariant'
                : 'Place Invariant (Farkas)';
            let pITypePlural: string = this.isMinimal
                ? 'Minimal Place Invariants'
                : 'Place Invariants (Farkas)';
            let n = this.placeInvariantsMatrix.length;

            if (this.showLCTable) {
                // Header for table with linear combination
                return 'Linear Combination of ' + pITypePlural;
            } else {
                // Header for result table from calculation
                return n + ' ' + (n === 1 ? pITypeSingular : pITypePlural);
            }
        }
    }

    /**
     * Checks if there is data available to be displayed in the place invariants table.
     *
     * @returns {boolean} `true` if:
     *                    - `selectedPlaceForPITable` is set and there are PIs containing it, OR
     *                    - `placeInvariantsMatrix` exists and has at least one PI.
     *                    `false` otherwise.
     */
    get pITableHasData(): boolean {
        if (this.selectedPlaceForPITable) {
            return this.placeInvariantsWithSelectedPlace().length > 0;
        } else if (this.placeInvariantsMatrix) {
            return this.placeInvariantsMatrix.length > 0;
        } else {
            return false;
        }
    }

    // Greatest common divisor of two numbers
    /**
     * Calculates the greatest common divisor (GCD) of two numbers using the Euclidean algorithm.
     * This is a private helper method.
     *
     * @param a The first number.
     * @param b The second number.
     * @returns {number} The GCD of `a` and `b`.
     */
    private gcd(a: number, b: number): number {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    /**
     * Calculates the greatest common divisor (GCD) of all numbers in an array.
     * This is a private helper method. It iteratively applies the `gcd(a, b)` method.
     *
     * @param arr An array of numbers.
     * @returns {number | undefined} The GCD of all numbers in the array.
     *                               Returns `undefined` if the array is empty.
     *                               Returns the first element if array has one element.
     */
    private gcdArray(arr: number[]): number | undefined {
        if (arr.length === 0) return undefined;

        let result: number = arr[0];

        for (let i = 1; i < arr.length; i++) {
            result = this.gcd(result, arr[i]);
        }

        return result;
    }

    // Rank of a matrix mat
    /**
     * Calculates the rank of a matrix.
     * The rank is the number of linearly independent rows or columns.
     * This implementation uses Singular Value Decomposition (SVD) from the `ml-matrix` library.
     * The rank is determined by counting the number of singular values greater than a small
     * tolerance (1e-10) to account for floating-point inaccuracies.
     * This is a private helper method, primarily used in `calculateMinimalPIs`.
     *
     * @param mat The input matrix (array of arrays of numbers).
     * @returns {number} The rank of the matrix. Returns 0 for an empty matrix.
     */
    rank(mat: number[][]): number {
        // rank of an empty matrix is 0
        if (mat.length === 0 || mat[0].length === 0) {
            return 0;
        }

        let svd = new SingularValueDecomposition(mat, { autoTranspose: true });
        return svd.diagonal.filter((value) => value > 1e-10).length;
    }
}
