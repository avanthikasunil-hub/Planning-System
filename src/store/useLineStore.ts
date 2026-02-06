import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LineData, Operation, MachinePosition } from "@/types";
import { generateLayout } from "@/utils/layoutGenerator";

interface LineStore {
  savedLines: LineData[];
  currentLine: LineData | null;

  machineLayout: MachinePosition[];
  operations: Operation[];

  selectedMachine: MachinePosition | null;

  // Restored methods
  createLine: (
    lineNo: string,
    styleNo: string,
    coneNo: string,
    operations: Operation[]
  ) => LineData;

  saveLine: (line: LineData) => void;
  loadLine: (id: string) => void;
  deleteLine: (id: string) => void;

  setOperations: (operations: Operation[]) => void;
  generateMachineLayout: (operations: Operation[]) => void;

  targetOutput: number;
  workingHours: number;

  setLineParameters: (targetOutput: number, workingHours: number) => void;

  setSelectedMachine: (machine: MachinePosition | null) => void;

  visibleSection: string | null;
  setVisibleSection: (section: string | null) => void;
}

export const useLineStore = create<LineStore>()(persist((set, get) => ({

  savedLines: [],
  currentLine: null,

  machineLayout: [],
  operations: [],
  selectedMachine: null,
  targetOutput: 1000,
  workingHours: 8,

  visibleSection: null,
  setVisibleSection: (section) => set({ visibleSection: section }),

  setLineParameters: (targetOutput, workingHours) => {
    set({ targetOutput, workingHours });
    // Regenerate layout when parameters change
    const ops = get().operations;
    if (ops.length > 0) {
      get().generateMachineLayout(ops);
    }
  },

  // ✅ CENTRAL layout generator
  generateMachineLayout: (operations) => {
    const { targetOutput, workingHours } = get();
    // Use the sophisticated layout engine
    const layout = generateLayout(operations, targetOutput, workingHours);
    set({ machineLayout: layout });
  },

  // ✅ Excel upload should call this
  setOperations: (operations) => {
    get().generateMachineLayout(operations);

    set({
      operations,
      selectedMachine: null,
    });
  },

  createLine: (lineNo, styleNo, coneNo, operations) => {
    // Initial default parameters
    const targetOutput = 1000;
    const workingHours = 8;

    // Trigger layout generation via utility
    const layout = generateLayout(operations, targetOutput, workingHours);

    const line: LineData = {
      id: crypto.randomUUID(),
      lineNo,
      styleNo,
      coneNo,
      operations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      machineLayout: layout,
      totalSMV: operations.reduce((sum, op) => sum + op.smv, 0),
      targetOutput,
      workingHours
    };

    set({
      machineLayout: layout,
      operations,
      currentLine: line,
      selectedMachine: null,
      targetOutput,
      workingHours
    });

    return line;
  },

  saveLine: (line) =>
    set((state) => ({
      savedLines: [...state.savedLines, line],
      currentLine: line,
      operations: line.operations,
      machineLayout: line.machineLayout,
    })),

  loadLine: (id) => {
    const line = get().savedLines.find((l) => l.id === id) || null;
    if (!line) return;

    set({
      currentLine: line,
      operations: line.operations,
      machineLayout: line.machineLayout,
      targetOutput: line.targetOutput || 1000, // Restore params
      workingHours: line.workingHours || 8,
      selectedMachine: null,
    });
  },

  deleteLine: (id) =>
    set((state) => ({
      savedLines: state.savedLines.filter((l) => l.id !== id),
    })),

  // ... method implementations ...

  setSelectedMachine: (machine) => set({ selectedMachine: machine }),
}), {
  name: 'line-planner-storage', // unique name
  partialize: (state) => ({
    savedLines: state.savedLines,
    currentLine: state.currentLine,
    machineLayout: state.machineLayout,
    operations: state.operations,
    targetOutput: state.targetOutput,
    workingHours: state.workingHours
  }),
}));

