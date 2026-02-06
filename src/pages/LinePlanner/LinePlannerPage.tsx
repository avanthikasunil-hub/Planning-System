import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, Factory, Clock, Layers, Settings, Filter, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scene3D } from '@/components/3d/Scene3D';
import { MachineInfoPanel } from '@/components/ui/MachineInfoPanel';
import { useLineStore } from '@/store/useLineStore';
import { useToast } from '@/hooks/use-toast';

// Removed unused imports: Canvas, OrbitControls, Text, Environment, useGLTF, collection, query, onSnapshot, db, styled, THREE, Machine3D (if not used directly)

const LinePlannerPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Removed racks state

  const {
    currentLine,
    machineLayout,
    operations,
    saveLine,
    setSelectedMachine,
    generateMachineLayout
  } = useLineStore();

  // Force layout regeneration on mount to apply any recent code changes
  useEffect(() => {
    if (operations.length > 0) {
      generateMachineLayout(operations);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if no line is loaded
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!currentLine && (machineLayout?.length || 0) === 0) {
        navigate('/');
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [currentLine, machineLayout, navigate]);

  // Removed Firebase listener


  const handleSave = () => {
    if (currentLine) {
      saveLine(currentLine);
      toast({
        title: "Line Saved",
        description: `Line ${currentLine.lineNo.replace("LINE ", "")} has been saved successfully`,
      });
    }
  };

  const handleReset = () => {
    setSelectedMachine(null);
    toast({
      title: "Layout Reset",
      description: "Machine selection has been reset",
    });
  };

  const totalSMV = operations.reduce((sum, op) => sum + op.smv, 0);
  const uniqueSections = new Set(operations.map(o => o.section).filter(Boolean)).size;
  const uniqueMachines = new Set(operations.map(o => o.machine_type).filter(Boolean)).size;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Factory className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {currentLine ? ` ${currentLine.lineNo}` : '3D Line Planner'}
              </h1>
              {currentLine?.styleNo && (
                <p className="text-xs text-muted-foreground">{currentLine.styleNo}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Selection
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Stats Sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-80 border-r border-border bg-card/50 backdrop-blur-sm p-4 flex-shrink-0 hidden lg:block overflow-y-auto"
        >
          {/* View Options */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">View Options</h2>
            </div>

            <div className="space-y-2">
              <Label>Section Filter</Label>
              <Select
                value={useLineStore.getState().visibleSection || 'all'}
                onValueChange={(val) => useLineStore.getState().setVisibleSection(val === 'all' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="cuff">Cuff Section</SelectItem>
                  <SelectItem value="sleeve">Sleeve Section</SelectItem>
                  <SelectItem value="collar">Collar Section</SelectItem>
                  <SelectItem value="front">Front Section</SelectItem>
                  <SelectItem value="back">Back Section</SelectItem>
                  <SelectItem value="assembly">Assembly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line Parameters */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">Balancing Params</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Target Output</Label>
                <Input
                  type="number"
                  defaultValue={currentLine?.targetOutput || 1000}
                  onChange={(e) => useLineStore.getState().setLineParameters(
                    parseInt(e.target.value) || 1000,
                    currentLine?.workingHours || 8
                  )}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Working Hours</Label>
                <Input
                  type="number"
                  defaultValue={currentLine?.workingHours || 8}
                  onChange={(e) => useLineStore.getState().setLineParameters(
                    currentLine?.targetOutput || 1000,
                    parseInt(e.target.value) || 8
                  )}
                  className="h-8"
                />
              </div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Line Statistics
          </h2>

          <div className="space-y-4">
            <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Operations</p>
                  <p className="text-xl font-bold text-foreground">{operations.length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total SMV</p>
                  <p className="text-xl font-bold text-foreground">{totalSMV.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-industrial-accent/10">
                  <Layers className="w-4 h-4 text-industrial-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sections</p>
                  <p className="text-xl font-bold text-foreground">{uniqueSections}</p>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Factory className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Machine Types</p>
                  <p className="text-xl font-bold text-foreground">{uniqueMachines}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Debug: List Sections & Machines */}
          <div className="mt-8 p-3 rounded-lg bg-red-900/20 border border-red-500/30 space-y-3">

            <div>
              <p className="text-xs font-bold text-red-400 mb-1">DEBUG: Detected Sections</p>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(operations.map(o => o.section))).map(s => (
                  <span key={s} className="text-xs bg-red-500/20 text-red-300 px-1 py-0.5 rounded">
                    "{s}"
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-red-400 mb-1">DEBUG: Collar Machines</p>
              <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                {(machineLayout || [])
                  .filter(m => m.section?.toLowerCase().includes('collar'))
                  .map((m, i) => (
                    <span key={m.id} className="text-xs text-red-300">
                      {i + 1}. {m.operation.machine_type} ({m.lane === 'C' ? 'Left' : 'Right'})
                    </span>
                  ))}
              </div>
            </div>

          </div>

          {/* ✅ Machine Types Legend (restored) */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Machine Types
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-muted-foreground">SNLS - Single Needle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-purple-500" />
                <span className="text-muted-foreground">SNEC - Overlock</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-orange-500" />
                <span className="text-muted-foreground">Iron/Press</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-pink-500" />
                <span className="text-muted-foreground">Button</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-gray-500" />
                <span className="text-muted-foreground">Other</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Tip:</strong> Click on any machine to see its details.
              Use mouse to orbit, scroll to zoom.
            </p>
          </div>
        </motion.aside>

        {/* 3D Scene */}
        <div className="flex-1 relative bg-black/10">
          {(machineLayout?.length || 0) > 0 ? (
            <>
              <Scene3D />
              <MachineInfoPanel />

              {/* Controls Help Overlay */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-6 right-6 z-10 bg-card/80 backdrop-blur-md border border-border/50 p-4 rounded-xl shadow-lg pointer-events-none select-none"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <Settings className="w-3 h-3" />Navigation
                </h3>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                    Right Click + Drag to <b>Pan</b>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                    Left Click + Drag to <b>Rotate</b>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                    Scroll to <b>Zoom</b> at cursor
                  </li>
                </ul>
              </motion.div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinePlannerPage;

