import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Cpu, Clock, Layers } from 'lucide-react';
import { useLineStore } from '@/store/useLineStore';
import { Button } from '@/components/ui/button';
import { getMachineCategory } from '@/utils/obParser';

const MACHINE_BADGE_COLORS: Record<string, string> = {
  snls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  snec: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  iron: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  button: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  bartack: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  helper: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  special: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const MachineInfoPanel = () => {
  const { selectedMachine, setSelectedMachine, operations } = useLineStore();

  // ✅ SAFETY: Prevent crash
  if (!selectedMachine) return null;
  if (!selectedMachine.operation) return null;

  const { operation } = selectedMachine;

  const machineCategory = getMachineCategory(operation.machine_type || "other");
  const badgeColor = MACHINE_BADGE_COLORS[machineCategory] || MACHINE_BADGE_COLORS.default;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-4 top-4 w-80 glass-card rounded-xl overflow-hidden z-20"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Operation #{operation.op_no || "N/A"}
                </h3>
                <p className="text-sm text-muted-foreground">Machine Details</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedMachine(null)}
              className="h-8 w-8 hover:bg-destructive/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">

          {/* Operation Description */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">
              Operation Description
            </label>
            <p className="text-foreground font-medium mt-1">
              {operation.op_name || "N/A"}
            </p>
          </motion.div>

          {/* Machine Type */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Cpu className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">
                Machine Type
              </label>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-md text-sm border ${badgeColor}`}>
                  {operation.machine_type || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* SMV */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">
                SMV
              </label>
              <p className="text-foreground font-semibold text-lg mt-1">
                {Number(operation.smv || 0).toFixed(2)} min
              </p>
            </div>
          </div>

          {/* Section */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Layers className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">
                Section
              </label>
              <p className="text-foreground font-medium mt-1">
                {operation.section || "N/A"}
              </p>
            </div>
          </div>

          {/* New: Section Statistics */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 mt-2 space-y-2">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wide">
              {operation.section || "Section"} Statistics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block">Section Ops</span>
                <span className="text-sm font-bold text-foreground">
                  {operations.filter(op => (op.section || "").toLowerCase() === (operation.section || "").toLowerCase()).length} Machines
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Section Total SMV</span>
                <span className="text-sm font-bold text-foreground">
                  {operations
                    .filter(op => (op.section || "").toLowerCase() === (operation.section || "").toLowerCase())
                    .reduce((sum, op) => sum + (op.smv || 0), 0)
                    .toFixed(2)} min
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50" />
      </motion.div>
    </AnimatePresence >
  );
};
