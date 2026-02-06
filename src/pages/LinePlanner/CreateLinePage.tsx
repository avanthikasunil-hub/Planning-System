import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Factory, Hash, Shirt, Spool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileUploadZone } from "@/components/ui/FileUploadZone";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { useLineStore } from "@/store/useLineStore";
import { parseOBExcel } from "@/utils/obParser";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_LINES = [
  "LINE 1", "LINE 2", "LINE 3", "LINE 4", "LINE 5",
  "LINE 6", "LINE 7", "LINE 8", "LINE 9"
];

const CreateLinePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createLine, saveLine } = useLineStore();

  const [lineNo, setLineNo] = useState("");
  const [styleNo, setStyleNo] = useState("");
  const [coneNo, setConeNo] = useState("");

  const [lines, setLines] = useState<string[]>(DEFAULT_LINES);
  const [styles, setStyles] = useState<string[]>([]);
  const [cones, setCones] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [parsedOperations, setParsedOperations] = useState<any[]>([]);

  // Load backend lines
  useEffect(() => {
    fetch("http://localhost:4000/lines")
      .then(res => res.json())
      .then(data => {
        const merged = Array.from(new Set([...DEFAULT_LINES, ...data]));
        setLines(merged);
      })
      .catch(() => { });
  }, []);

  // Load styles for selected line
  const loadStyles = (line: string) => {
    if (!line) return;
    fetch(`http://localhost:4000/styles?line=${line}`)
      .then(res => res.json())
      .then(data => setStyles(data))
      .catch(() => { });
  };

  // Load cones for selected style
  const loadCones = (line: string, style: string) => {
    if (!line || !style) return;
    fetch(`http://localhost:4000/oc?line=${line}&style=${encodeURIComponent(style)}`)
      .then(res => res.json())
      .then(data => setCones(data))
      .catch(() => { });
  };

  // Handle OB Upload
  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const operations = await parseOBExcel(file);

      if (!operations || operations.length === 0) {
        throw new Error("No operations found in Excel");
      }

      setParsedOperations(operations);
      setUploadSuccess(true);

    } catch (error: any) {
      const message = error?.message || "Failed to parse file";
      setUploadError(message);

      toast({
        title: "Parsing Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Create Line and go to 3D Planner
  const handleCreateLine = useCallback(() => {
    if (!lineNo || !styleNo || !coneNo) {
      toast({
        title: "Missing Fields",
        description: "Please select Line, Style and Cone number",
        variant: "destructive",
      });
      return;
    }

    if (parsedOperations.length === 0) {
      toast({
        title: "No Operations",
        description: "Please upload an OB Excel sheet first",
        variant: "destructive",
      });
      return;
    }

    const line = createLine(lineNo, styleNo, coneNo, parsedOperations);
    saveLine(line);

    toast({
      title: "Line Created Successfully",
      description: `${lineNo} created`,
    });

    navigate("/line-planner/planner");

  }, [
    lineNo,
    styleNo,
    coneNo,
    parsedOperations,
    createLine,
    saveLine,
    navigate,
    toast
  ]);

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="min-h-screen relative overflow-hidden"
    >
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen p-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => navigate("/line-planner")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Factory className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create New Line</h1>
              <p className="text-sm text-muted-foreground">
                Configure your production line
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form Card */}
        <div className="max-w-2xl mx-auto glass-card rounded-2xl p-8 space-y-8">

          {/* Line */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Hash className="w-4 h-4" /> Line Number
            </Label>

            <select
              value={lineNo}
              onChange={(e) => {
                const value = e.target.value;
                setLineNo(value);
                setStyleNo("");
                setConeNo("");
                loadStyles(value);
              }}
              className="w-full h-10 rounded-md border px-3 bg-white text-black"
            >
              <option value="">Select Line</option>
              {lines.map(line => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </div>

          {/* Style */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shirt className="w-4 h-4" /> Style Number
            </Label>

            <input
              list="styleList"
              value={styleNo}
              onChange={(e) => {
                const value = e.target.value;
                setStyleNo(value);
                setConeNo("");
                loadCones(lineNo, value);
              }}
              className="w-full h-10 rounded-md border px-3"
            />

            <datalist id="styleList">
              {styles.map(style => (
                <option key={style} value={style} />
              ))}
            </datalist>
          </div>

          {/* Cone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Spool className="w-4 h-4" /> Cone Number
            </Label>

            <input
              list="coneList"
              value={coneNo}
              onChange={(e) => setConeNo(e.target.value)}
              className="w-full h-10 rounded-md border px-3"
            />

            <datalist id="coneList">
              {cones.map(cone => (
                <option key={cone} value={cone} />
              ))}
            </datalist>
          </div>

          {/* Upload */}
          <FileUploadZone
            onFileSelect={handleFileSelect}
            isLoading={isLoading}
            error={uploadError}
            success={uploadSuccess}
          />

          {/* ================= DASHBOARD (ADDED ONLY THIS) ================= */}
          {uploadSuccess && parsedOperations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-4 rounded-xl bg-accent/10 border border-accent/30"
            >
              <h3 className="font-medium text-foreground mb-3">
                Parsed Operations Summary
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Operations</p>
                  <p className="text-2xl font-bold">
                    {parsedOperations.length}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Sections</p>
                  <p className="text-2xl font-bold">
                    {new Set(parsedOperations.map(o => o.section)).size}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Machine Types</p>
                  <p className="text-2xl font-bold">
                    {new Set(parsedOperations.map(o => o.machine_type)).size}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Total SMV</p>
                  <p className="text-2xl font-bold">
                    {parsedOperations
                      .reduce((sum, op) => sum + op.smv, 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {/* ================= END DASHBOARD ================= */}

          {/* Generate Button */}
          <Button
            type="button"
            onClick={handleCreateLine}
            className="w-full h-12"
          >
            Generate 3D Line Layout
          </Button>

        </div>
      </div>
    </form>
  );
};

export default CreateLinePage;