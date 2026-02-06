
import type { Operation, MachinePosition } from '@/types';

/**
 * Calculates the required number of machines for each operation
 * based on SMV and Target Output.
 *
 * Formula:
 * Takt Time = (Working Hours * 60) / Target Output
 * Required Machines = Ceiling(SMV / Takt Time)
 */
export const calculateMachineRequirements = (
    operations: Operation[],
    targetOutput: number,
    workingHours: number
): { operation: Operation; count: number }[] => {
    if (targetOutput <= 0 || workingHours <= 0) {
        // Fallback if invalid parameters: 1 machine per op
        return operations.map(op => ({ operation: op, count: 1 }));
    }

    const workingMinutes = workingHours * 60;
    // Takt time: Time allowed to produce one piece
    const taktTime = workingMinutes / targetOutput;

    return operations.map(op => {
        // If SMV is 0 (unlikely but possible), assume 1 machine
        if (op.smv <= 0) return { operation: op, count: 1 };

        const requiredMachines = Math.ceil(op.smv / taktTime);
        return {
            operation: op,
            count: Math.max(1, requiredMachines) // Ensure at least 1 machine
        };
    });
};
