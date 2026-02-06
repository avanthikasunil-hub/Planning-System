import { v4 as uuidv4 } from 'uuid';
import type { Operation, MachinePosition } from '@/types';
import { calculateMachineRequirements } from './lineBalancing';

// Constants (Units: Approx Meters)
const LANE_Z_A = -5.2;
const LANE_Z_B = -6.8; // Spacing 1.6m (-5.2 - -6.8)
const LANE_Z_C = 0.75;
const LANE_Z_D = -0.75; // Spacing 1.5m (0.75 - -0.75)
// But user wants "2 line machines facing each other".
// If C is at 0.8 and D is at -0.8, they are facing across 0.
// Let's redefine Lanes for Collar specifically if needed, OR just adjust constants.
// Let's make C and D be the two main facing lines.
// C at 0.8, D at -0.8?
// Let's try:
const LANE_Z_M1 = 1.0;
const LANE_Z_M2 = -1.0;
// We'll update logic to use these for C and D if we want them facing across center.

// Reverting to values that make sense for "2 lines":
// Lane C: z = 0.8
// Lane D: z = -0.8
// This centers them around Z=0 with 1.6m gap.


const MACHINE_SPACING_X = 1.55;
const SECTION_GAP_X = 1.5;

// Rotations (Radians)
const ROT_FACE_FRONT = -Math.PI / 2; // -X direction (Front)
const ROT_FACE_BACK = Math.PI / 2;   // +X direction
const ROT_FACE_LEFT = Math.PI;       // -Z direction
const ROT_FACE_RIGHT = 0;            // +Z direction

// Specific Logic
const ROT_A_FACES_B = ROT_FACE_LEFT;
const ROT_B_FACES_A = ROT_FACE_RIGHT;
const ROT_C_FACES_D = ROT_FACE_RIGHT;
const ROT_D_FACES_C = ROT_FACE_LEFT;

interface LaneCursors {
    A: number;
    B: number;
    C: number;
    D: number;
}

export const generateLayout = (
    rawOperations: Operation[],
    targetOutput: number,
    workingHours: number
): MachinePosition[] => {
    const layout: MachinePosition[] = [];
    const balancedOps = calculateMachineRequirements(rawOperations, targetOutput, workingHours);

    // Group by Section (Order preserved)
    const sectionsMap = new Map<string, typeof balancedOps>();
    const sectionOrder: string[] = [];

    balancedOps.forEach(item => {
        const sec = item.operation.section || 'Unknown';
        const s = sec.toLowerCase();

        // FILTER: Restrict to Collar, Cuff, Sleeve, Front, and Back
        if (!s.includes('collar') && !s.includes('cuff') && !s.includes('sleeve') && !s.includes('front') && !s.includes('back')) return;


        if (!sectionsMap.has(sec)) {
            sectionsMap.set(sec, []);
            sectionOrder.push(sec);
        }
        sectionsMap.get(sec)!.push(item);
    });

    // Special: Ensure Cuff section has the 9 operations from OB if it exists
    const cuffSecName = sectionOrder.find(s => s.toLowerCase().includes('cuff'));
    if (cuffSecName) {
        const cuffOps = [
            "Iron Table", "SNLS", "SNLS", "SNEC", "Turning M/C",
            "Iron Table", "SNLS", "Button hole m/c", "Button m/c"
        ].map((name, idx) => ({
            operation: createDummyOp(name, cuffSecName, `C-${idx + 1}`),
            count: 1
        }));
        sectionsMap.set(cuffSecName, cuffOps);
    }
    // Special: Ensure Collar section has the 18 operations from OB (Corrected Sequence with Explicit Numbering)
    const collarSecName = sectionOrder.find(s => s.toLowerCase().includes('collar'));
    if (collarSecName) {
        const rawCollarList = [
            { sl: "C-1", name: "Run Collar", type: "SNLS" },
            { sl: "C-2", name: "Collar raw edge trimming", type: "SNEC" },
            { sl: "C-3", name: "Collar turning", type: "Turning M/C" },
            { sl: "C-4", name: "Collar pointing", type: "Pointing M/C" },
            { sl: "C-5", name: "Collar bluff stitch", type: "SNLS" },
            // C-6 Skipped (Manual placeholder removed)
            { sl: "C-7", name: "Collar bottom cutting", type: "Contour M/C" },
            { sl: "C-8", name: "Hem band", type: "Iron Table" },
            { sl: "C-9", name: "Neckband raw edge cutting", type: "SNEC" },
            { sl: "C-10", name: "Insert collar", type: "SNLS" },
            { sl: "C-11", name: "Pick turn", type: "Turning M/C" },
            { sl: "C-12", name: "Pick iron", type: "Iron Table" },
            { sl: "C-13", name: "Top stitch band X1", type: "SNLS" },
            { sl: "C-14", name: "Top stitch band X2", type: "SNLS" },
            { sl: "C-15", name: "Trim base", type: "SNEC" },
            { sl: "C-16", name: "Notch & mark collar", type: "Notch M/C" },
            { sl: "C-17", name: "Button hole on neck band", type: "B/Hole M/C" },
            { sl: "C-18", name: "Button stitch on neck band", type: "Button M/C" }
        ];

        const collarOps = rawCollarList.map((item) => {
            // Use explicit item.sl (C-X) instead of idx
            const op = createDummyOp(item.name, collarSecName, item.sl);
            op.machine_type = item.type;
            return {
                operation: op,
                count: 1
            };
        });
        sectionsMap.set(collarSecName, collarOps);
    }
    // Special: Ensure Sleeve section has the 10 operations from OB
    const sleeveSecName = sectionOrder.find(s => s.toLowerCase().includes('sleeve'));
    if (sleeveSecName) {
        const rawSleeveList = [
            { sl: "S-1", name: "Sew small sleeve placket", type: "SNLS", smv: 0.53 },
            { sl: "S-2", name: "Edge stitch small sleeve placket", type: "SNLS", smv: 0.53 },
            { sl: "S-3", name: "Sleeve tacking", type: "SNLS", smv: 0.3 },
            { sl: "S-4", name: "Press sleeve placket", type: "Rotary fusing m/c", smv: 0.4 },
            { sl: "S-5", name: "Set and seal placket", type: "SNLS", smv: 1.3 },
            { sl: "S-6", name: "Bartack X2", type: "Bartack M/C", smv: 0.4 },
            { sl: "S-7", name: "Sew pleats on sleeve", type: "SNLS", smv: 0.45 },
            { sl: "S-8", name: "Sleeve placket trim", type: "Helper Table", smv: 0.2 },
            { sl: "S-9", name: "Button hole X1", type: "Button hole m/c", smv: 0.35 },
            { sl: "S-10", name: "Button X1", type: "Button m/c", smv: 0.3 }
        ];

        const sleeveOps = rawSleeveList.map((item) => {
            const op = createDummyOp(item.name, sleeveSecName, item.sl);
            op.machine_type = item.type;
            op.smv = item.smv;
            return {
                operation: op,
                count: 1
            };
        });
        sectionsMap.set(sleeveSecName, sleeveOps);
    }
    // Special: Ensure Back section has the 7 operations from OB
    const backSecName = sectionOrder.find(s => s.toLowerCase().includes('back'));
    if (backSecName) {
        const rawBackList = [
            { sl: "B-1", name: "Tack size Label", type: "SNLS", smv: 0.3 },
            { sl: "B-2", name: "Sew Main Label", type: "SNLS", smv: 0.45 },
            { sl: "B-3", name: "Sew secondary Label", type: "SNLS", smv: 0.4 },
            { sl: "B-4", name: "Make pleat", type: "SNLS", smv: 0.4 },
            { sl: "B-5", name: "Attach Yoke", type: "SNLS", smv: 0.65 },
            { sl: "B-6", name: "Iron Back", type: "Iron Table", smv: 0.25 },
            { sl: "B-7", name: "Trim the back", type: "Helper Table", smv: 0.2 }
        ];

        const backOps = rawBackList.map((item) => {
            const op = createDummyOp(item.name, backSecName, item.sl);
            op.machine_type = item.type;
            op.smv = item.smv;
            return {
                operation: op,
                count: 1
            };
        });
        sectionsMap.set(backSecName, backOps);
    }

    // Special: Ensure Front section has the 10 operations from OB
    const frontSecName = sectionOrder.find(s => s.toLowerCase().includes('front'));
    if (frontSecName) {
        const rawFrontList = [
            { sl: "F-1", name: "Left hem", type: "SNLS", smv: 0.65 },
            { sl: "F-2", name: "Right hem", type: "SNLS", smv: 0.65 },
            { sl: "F-3", name: "Iron placket", type: "Iron Table", smv: 0.2 },
            { sl: "F-4", name: "Inspect placket", type: "Helper Table", smv: 0.25 },
            { sl: "F-5", name: "Neck trim", type: "Helper Table", smv: 0.3 },
            { sl: "F-6", name: "Attach Label", type: "SNLS", smv: 0.5 },
            { sl: "F-7", name: "Button hole front X 5", type: "B/Hole M/C", smv: 0.55 },
            { sl: "F-8", name: "Button hole front X 1", type: "B/Hole M/C", smv: 0.2 },
            { sl: "F-9", name: "Button sew front X 6", type: "Button M/C", smv: 0.49 },
            { sl: "F-10", name: "Sew extra button X 2", type: "Button M/C", smv: 0.3 }
        ];

        const frontOps = rawFrontList.map((item) => {
            const op = createDummyOp(item.name, frontSecName, item.sl);
            op.machine_type = item.type;
            op.smv = item.smv;
            return {
                operation: op,
                count: 1
            };
        });
        sectionsMap.set(frontSecName, frontOps);
    }

    // Special: Ensure Assembly section has 13 operations
    const assemblySecName = sectionOrder.find(s => s.toLowerCase().includes('assembly')) || 'Assembly';
    if (!sectionsMap.has(assemblySecName) || true) { // Always create/overwrite
        const rawAssemblyList = [
            { sl: "A-1", name: "Join shoulder", type: "SNLS", smv: 0.6 },
            { sl: "A-2", name: "Set collar", type: "SNLS", smv: 0.65 },
            { sl: "A-3", name: "Finish collar", type: "SNLS", smv: 0.6 },
            { sl: "A-4", name: "Collar hem stitch", type: "SNLS", smv: 0.4 },
            { sl: "A-5", name: "Set Sleeve", type: "SNLS", smv: 1.04 }, // SNCS mapped to SNLS
            { sl: "A-6", name: "Iron Armhole", type: "Iron Table", smv: 0.75 },
            { sl: "A-7", name: "Sleeve Top", type: "SNLS", smv: 0.9 },
            { sl: "A-8", name: "Side seam", type: "FOA", smv: 0.95 },
            { sl: "A-9", name: "Cuff attach", type: "SNLS", smv: 1.2 },
            { sl: "A-10", name: "Bottom serging", type: "SNLS", smv: 0.45 }, // SNEC -> SNLS as requested
            { sl: "A-11", name: "Bottom hem", type: "SNLS", smv: 0.61 },
            { sl: "A-12", name: "Button wrapping", type: "Button Wrapping", smv: 2.0 },
            { sl: "A-13", name: "Washing allowance", type: "Helper Table", smv: 1.5 }
        ];

        const assemblyOps = rawAssemblyList.map((item) => {
            const op = createDummyOp(item.name, assemblySecName, item.sl);
            op.machine_type = item.type;
            op.smv = item.smv;
            return { operation: op, count: 1 };
        });

        sectionsMap.set(assemblySecName, assemblyOps);
        if (!sectionOrder.includes(assemblySecName)) sectionOrder.push(assemblySecName);
    }




    // Cursors
    const cursors: LaneCursors = { A: 0, B: 0, C: 0, D: 0 };

    // Section Definitions
    const abSections = ['cuff', 'sleeve', 'back'];
    const cdSections = ['collar', 'front'];
    const assemblySection = 'assembly';

    // Helper: Add Machine
    const addMachine = (
        op: Operation,
        lane: 'A' | 'B' | 'C' | 'D',
        xPos: number,
        countIdx: number,
        forcedRot?: number,
        sectionName?: string,
        centerModel?: boolean
    ) => {
        let z = 0;
        let ry = 0;

        if (lane === 'A') {
            z = LANE_Z_A;
            ry = 0;       // Face "Right" (+Z) away from center -6.0
        }
        if (lane === 'B') {
            z = LANE_Z_B;
            ry = Math.PI; // Face "Left" (-Z) away from center -6.0
        }
        if (lane === 'C') {
            z = LANE_Z_C;
            ry = 0;       // Face "Right" (+Z) away from center 0
        }
        if (lane === 'D') {
            z = LANE_Z_D;
            ry = Math.PI; // Face "Left" (-Z) away from center 0
        }

        // Overrides
        const type = op.machine_type.toLowerCase();
        if (type.includes('inspection')) {
            ry = ROT_FACE_FRONT;
        }
        if (type.includes('helper table') || type.includes('rotary') || type.includes('fusing')) {
            ry += Math.PI / 2; // Rotate 90 degrees to match SNLS orientation
        }

        let finalX = xPos;
        // Explicit override
        if (forcedRot !== undefined) ry = forcedRot;

        // ALIGNMENT: Restore manual offsets ONLY for Cuff (as requested)
        if (sectionName?.toLowerCase().includes('cuff')) {
            if (op.op_no === 'C-1') z += 0.25;
            if (op.op_no === 'C-6') z -= 0.3;
            if (op.op_no === 'C-5') z -= 0.2;
            if (op.op_no === 'C-9') z -= 0.6;
        }

        // SPECIAL: Move C-3 Front in Collar
        if (sectionName?.toLowerCase().includes('collar') && op.op_no === 'C-3') {
            z -= 0.2;
        } if (sectionName?.toLowerCase().includes('collar') && op.op_no === 'C-7') {
            z += 0.6;
            finalX -= 0.2;
        } if (sectionName?.toLowerCase().includes('collar') && op.op_no === 'C-8') {
            z += 0.4;
        } if (sectionName?.toLowerCase().includes('collar') && op.op_no === 'C-11') {
            z += 0.2;
        } if (sectionName?.toLowerCase().includes('collar') && op.op_no === 'C-4') {
            finalX -= 0.2;
        } if (sectionName?.toLowerCase().includes('collar') && op.op_no === 'C-12') {
            z += 0.4;
        } if (sectionName?.toLowerCase().includes('collar') && op.op_no === 'C-16') {
            z -= 0.4;
            finalX += 0.3;
        } if (sectionName?.toLowerCase().includes('collar') && op.op_no === 'C-18') {
            z -= 0.5;

        } if (sectionName?.toLowerCase().includes('sleeve') && op.op_no === 'S-8') {
            z += 0.5;
            finalX -= 0.2;
        } if (sectionName?.toLowerCase().includes('sleeve') && op.op_no === 'S-4') {
            z += 0.3;
        } if (sectionName?.toLowerCase().includes('sleeve') && op.op_no === 'S-10') {
            z += 0.6; finalX += 0.5;
        } if (sectionName?.toLowerCase().includes('front') && op.op_no === 'F-3') {
            z += 0.35;

        }

        if (sectionName?.toLowerCase().includes('front') && op.op_no === 'F-4') {
            z += 0.5; finalX -= 0.2;
        }
        if (sectionName?.toLowerCase().includes('front') && op.op_no === 'F-6') {
            finalX += 0.5;
        }
        if (sectionName?.toLowerCase().includes('front') && op.op_no === 'F-5') {
            z -= 0.5; finalX += 0.6;
        }
        if (sectionName?.toLowerCase().includes('front') && op.op_no === 'F-7') {
            z += 0.1; finalX += 0.5;
        }
        if (sectionName?.toLowerCase().includes('front') && op.op_no === 'F-8') {
            finalX += 0.5;
        }
        if (sectionName?.toLowerCase().includes('front') && op.op_no === 'F-9') {
            z -= 0.5; finalX += 0.45;
        }
        if (sectionName?.toLowerCase().includes('front') && op.op_no === 'F-10') {
            z += 0.6; finalX += 0.5;
        }

        if (sectionName?.toLowerCase().includes('back') && op.op_no === 'B-6') {
            z -= 0.3;
        }
        if (sectionName?.toLowerCase().includes('back') && op.op_no === 'B-7') {
            z -= 0.5; finalX += 0.7;
        }

        // Assembly Adjustments
        if (sectionName?.toLowerCase().includes('assembly') && op.op_no === 'A-6') {
            finalX -= 0.2; // Move A-6 back (left)
            if (lane === 'A' || lane === 'C') finalX += 0.3; // Assembly Lane A & C offset
        }
        if (sectionName?.toLowerCase().includes('assembly') && op.op_no === 'A-8') {
            finalX += 0.1; // Move A-8 front (right)
        }
        if (sectionName?.toLowerCase().includes('assembly') && op.op_no === 'A-12') {
            finalX -= 0.1; // Move A-12 front
        }
        if (sectionName?.toLowerCase().includes('assembly') && (op.op_no === 'A-13')) {
            ry += Math.PI / 2; // Rotate Tables 90

            if (op.op_no === 'A-13') {
                finalX += 0.3; // Front
                // Removed Z force to allow independent Lane A / Lane B placement
            }
        }


        layout.push({
            id: `${op.op_no}-${countIdx}-${uuidv4()}`,
            operation: op,
            position: { x: finalX, y: 0, z },
            rotation: { x: 0, y: ry, z: 0 },
            lane,
            section: sectionName || op.section,
            machineIndex: countIdx,
            centerModel
        });
    };

    // Helper: Add Section Board
    const addBoard = (name: string, xPos: number, zPos: number) => {
        // Boards are usually floating or on a stand. We'll add a 'board' machine type.
        // FORCE machine_type to be 'Board' so Machine3D recognizes it!
        const dummyOp = createDummyOp(name, name);
        dummyOp.machine_type = 'Board';

        layout.push({
            id: `board-${name}-${uuidv4()}`,
            operation: dummyOp,
            position: { x: xPos, y: 2.5, z: zPos }, // High up
            rotation: { x: 0, y: ROT_FACE_FRONT, z: 0 },
            lane: zPos < 0 ? 'A' : 'C',
            section: name,
            machineIndex: -1 // Special
        });
    };

    // Iterate Sections
    // STRICT ORDER ENFORCEMENT via processingOrder construction
    const processingOrder: string[] = [];
    const desiredTags = ['cuff', 'sleeve', 'back', 'collar', 'front', 'assembly']; // Added 'assembly'

    // 1. Find matching sections for each tag in order
    desiredTags.forEach(tag => {
        const matches = Array.from(sectionsMap.keys()).filter(k => k.toLowerCase().includes(tag));
        matches.forEach(m => {
            if (!processingOrder.includes(m)) processingOrder.push(m);
        });
    });

    // LEFTOVERS REMOVED: Strictly enforce only desired sections are rendered.

    let collarProcessed = false;
    let frontProcessed = false;
    let backProcessed = false;
    for (const secName of processingOrder) {
        const secLower = secName.toLowerCase();

        // Single Collar Enforcement
        if (secLower.includes('collar')) {
            if (collarProcessed) continue;
            collarProcessed = true;
        }

        // Single Back Enforcement
        if (secLower.includes('back')) {
            if (backProcessed) continue;
            backProcessed = true;
        }

        // Single Front Enforcement
        if (secLower.includes('front')) {
            if (frontProcessed) continue;
            frontProcessed = true;
        }

        const ops = sectionsMap.get(secName)!;

        if (secLower.includes(assemblySection)) {
            // Start after previous sections (Back Pathway) + Gap
            // Use standard section gap, relying on cursors being updated by previous sections
            const startX = Math.max(cursors.A, cursors.B, cursors.C, cursors.D) + SECTION_GAP_X;

            addBoard('Assembly - 1', startX, LANE_Z_B); // Board at start of Assembly Lane B
            addBoard('Assembly - 2', startX, LANE_Z_A); // Board at start of Assembly Lane A
            addBoard('Assembly - 3', startX, LANE_Z_D); // Board at start of Assembly Lane D (Moved from C)

            // USER REQUEST: Move helpers table to lane C
            // Moved slightly forward along the lane
            const helperStartX = startX + 2.5;
            const tableSpacing = 2.0;
            for (let k = 0; k < 4; k++) {
                addMachine(
                    createDummyOp('Helper Table', secName, `A-H${k + 1}`),
                    'C',
                    helperStartX + (k * tableSpacing),
                    k,
                    ROT_FACE_FRONT, // Facing like Assembly Lane B
                    secName,
                    true // Center model to match assembly style
                );
            }

            // USER REQUEST: Duplicate the 3 machines (Wrapping, Buttonhole, Button Stitching) so there are 2 of each
            let procX = helperStartX + (3 * tableSpacing) + MACHINE_SPACING_X;
            const extraMachineSpacing = MACHINE_SPACING_X;

            // 2 x Button Wrapping
            for (let i = 0; i < 2; i++) {
                addMachine(
                    createDummyOp('Button Wrapping', secName, `A-W${i + 1}`),
                    'C',
                    procX,
                    i,
                    ROT_FACE_FRONT,
                    secName,
                    true
                );
                procX += extraMachineSpacing;
            }

            // 2 x Button hole m/c
            for (let i = 0; i < 2; i++) {
                addMachine(
                    createDummyOp('Button hole m/c', secName, `A-BH${i + 1}`),
                    'C',
                    procX,
                    i,
                    ROT_FACE_FRONT,
                    secName,
                    true
                );
                procX += extraMachineSpacing;
            }

            // 2 x Button m/c
            for (let i = 0; i < 2; i++) {
                addMachine(
                    createDummyOp('Button m/c', secName, `A-BS${i + 1}`),
                    'C',
                    procX,
                    i,
                    ROT_FACE_FRONT,
                    secName,
                    true
                );
                procX += extraMachineSpacing;
            }

            let currentX = startX + 1.5;

            ops.forEach((item, idx) => {
                const { operation } = item;
                // Place 13 ops in Lane B, Facing Front
                addMachine(operation, 'B', currentX, idx, ROT_FACE_FRONT, secName, true);

                // Duplicate in Lane A, Orientation matched to Lane B (Undo 180)
                addMachine(operation, 'A', currentX, idx, ROT_FACE_BACK, secName, true);

                // Duplicate in Lane D (Moved Assembly 3 from C to D)
                addMachine(operation, 'D', currentX, idx, ROT_FACE_BACK, secName, true);

                currentX += MACHINE_SPACING_X;
            });

            // Update cursors
            cursors.A = currentX;
            cursors.B = currentX; cursors.C = currentX; cursors.D = currentX;
            continue;
        }


        // --- PARTS PREPARATION LOGIC ---
        let currentOps = [...ops];

        // Determine target lanes
        const isAB = abSections.some(s => secLower.includes(s));
        const isCD = cdSections.some(s => secLower.includes(s));
        let targetGroup: 'AB' | 'CD' = 'AB'; // Default
        if (isCD) targetGroup = 'CD';

        // Positions: Determine start X based on previous sections
        // Positions: Determine start X based on specific lane group (Parallel Start)
        let alternatingX = isAB
            ? Math.max(cursors.A, cursors.B)
            : Math.max(cursors.C, cursors.D);

        if (alternatingX > 0) alternatingX += SECTION_GAP_X;

        // Initialize cursors for this specific group
        if (isAB) { cursors.A = alternatingX; cursors.B = alternatingX; }
        else { cursors.C = alternatingX; cursors.D = alternatingX; }

        addBoard(secName + " Section", alternatingX, isAB ? -6.0 : 0);
        alternatingX += 1.4;

        // Update shared starting point for machines
        let sharedX = alternatingX;

        for (let i = 0; i < currentOps.length; i += 2) {
            const leftOp = currentOps[i];          // Goes to C (or A)
            const rightOp = currentOps[i + 1];       // Goes to D (or B)

            // Determine Lanes
            const leftLane = isAB ? 'A' : 'C';
            const rightLane = isAB ? 'B' : 'D';

            const leftCount = leftOp ? leftOp.count : 0;
            const rightCount = rightOp ? rightOp.count : 0;
            const maxCount = Math.max(leftCount, rightCount);

            // Determine column spacing for this section
            let localSpacingX = MACHINE_SPACING_X;
            if (secLower.includes('cuff') || secLower.includes('sleeve') || secLower.includes('front') || secLower.includes('back')) {
                localSpacingX = 1.4;
            } else if (secLower.includes('collar')) {
                localSpacingX = 1.6;
            }

            // Place Left Machines
            if (leftOp) {
                for (let k = 0; k < leftCount; k++) {
                    addMachine(leftOp.operation, leftLane, sharedX + (k * localSpacingX), k, undefined, secName);
                }
            }

            // Place Right Machines
            if (rightOp) {
                for (let k = 0; k < rightCount; k++) {
                    addMachine(rightOp.operation, rightLane, sharedX + (k * localSpacingX), k, undefined, secName);
                }
            }

            // Advance Cursor based on the widest side
            sharedX += (maxCount * localSpacingX);
        }

        // Finalize cursors
        if (isAB) {
            cursors.A = sharedX;
            cursors.B = sharedX;
        }
        else {
            cursors.C = sharedX;
            cursors.D = sharedX;
        }


        // --- END OF SECTION ITEMS (Inspection) ---
        // Add manual inspection table ONLY IF no inspection machine was found in the ops list
        const hasDataInspection = currentOps.some(op =>
            op.operation.op_name.toLowerCase().includes('inspection') ||
            op.operation.machine_type.toLowerCase().includes('inspection')
        );

        if (!hasDataInspection) {
            const endX = targetGroup === 'AB'
                ? Math.max(cursors.A, cursors.B)
                : Math.max(cursors.C, cursors.D);

            let inspectGap = 0.4;
            // Adjust for manual shifts of last machines to maintain visual spacing
            if (secLower.includes('sleeve')) inspectGap += 0.5; // S-10 was moved +0.5 X
            if (secLower.includes('front')) inspectGap += 0.5; // F-10 was moved +0.5 X
            if (secLower.includes('back')) inspectGap += 0.7; // B-7 was moved +0.7 X

            const inspectX = endX + inspectGap;
            const innerLane = targetGroup === 'AB' ? 'A' : 'C';
            const innerZ = targetGroup === 'AB' ? LANE_Z_A : LANE_Z_C;

            // Inspection Table
            layout.push({
                id: `inspect-${secName}`,
                operation: createDummyOp('Inspection', secName),
                position: { x: inspectX, y: 0, z: innerZ - 0.5 },
                rotation: { x: 0, y: ROT_FACE_FRONT, z: 0 },
                lane: innerLane,
                isInspection: true,
                section: secName
            });
        }

        // --- SUPERMARKET LOGIC ---
        // Add Supermarket after Front and Back sections (1 per section)
        if (secLower.includes('front') || secLower.includes('back')) {
            const endOfMachX = targetGroup === 'AB'
                ? Math.max(cursors.A, cursors.B)
                : Math.max(cursors.C, cursors.D);

            // Place 3.5m after the last machine to clear Inspection Table
            const superX = endOfMachX + 3.5;
            const innerZ = targetGroup === 'AB' ? LANE_Z_A : LANE_Z_C;

            layout.push({
                id: `supermarket-${secName}-${uuidv4()}`,
                operation: createDummyOp('Supermarket', secName),
                position: { x: superX, y: 0, z: innerZ - 1 }, // Moved opposite (-0.7)
                rotation: { x: 0, y: ROT_FACE_FRONT + Math.PI, z: 0 }, // Rotated 180 deg
                lane: targetGroup === 'AB' ? 'A' : 'C',
                section: secName,
                machineIndex: -1
            });

            // Add Pathway (Horizontal crossover) after Supermarket - ONLY for Back section
            if (secLower.includes('back')) {
                const pathX = superX + 2.0;
                layout.push({
                    id: `pathway-${secName}-${uuidv4()}`,
                    operation: createDummyOp('Pathway', secName),
                    position: { x: pathX, y: 0, z: 0 }, // Center Z (0) for full span
                    rotation: { x: 0, y: 0, z: 0 },
                    lane: targetGroup === 'AB' ? 'A' : 'C',
                    section: secName,
                    machineIndex: -1
                });

                // Update cursors to include Pathway (Physical end ~ X + 1.0)
                const pathEnd = pathX + 1.0;
                if (targetGroup === 'AB') {
                    cursors.A = Math.max(cursors.A, pathEnd);
                    cursors.B = Math.max(cursors.B, pathEnd);
                } else {
                    cursors.C = Math.max(cursors.C, pathEnd);
                    cursors.D = Math.max(cursors.D, pathEnd);
                }
            } else {
                // Update cursors to include Supermarket (Physical end ~ X + 1.0)
                const superEnd = superX + 1.0;
                if (targetGroup === 'AB') {
                    cursors.A = Math.max(cursors.A, superEnd);
                    cursors.B = Math.max(cursors.B, superEnd);
                } else {
                    cursors.C = Math.max(cursors.C, superEnd);
                    cursors.D = Math.max(cursors.D, superEnd);
                }
            }
        }
    }

    return layout;
};



function createDummyOp(name: string, section: string, opNo: string = '00'): Operation {
    return {
        op_no: opNo,
        op_name: name,
        machine_type: name,
        smv: 1.0,
        section: section
    };
}