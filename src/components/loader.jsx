import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dice5 } from "lucide-react";

const STEPS = [
  { label: "Reading PDF file...", pct: 5, delay: 0 },
  { label: "Extracting text from pages...", pct: 12, delay: 3000 },
  { label: "Analyzing game structure...", pct: 25, delay: 8000 },
  { label: "Identifying game phases and actions...", pct: 40, delay: 15000 },
  { label: "Generating rules summary...", pct: 60, delay: 25000 },
  { label: "Formatting output...", pct: 80, delay: 45000 },
  { label: "Almost done...", pct: 92, delay: 60000 },
];

export default function Loader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timers = STEPS.slice(1).map((step, i) =>
      setTimeout(() => setStepIndex(i + 1), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const step = STEPS[stepIndex];

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
            <div className="relative bg-primary/5 rounded-full p-6">
              <Dice5 className="w-10 h-10 text-primary animate-dice-bounce" />
            </div>
          </div>

          <div className="w-full space-y-3 text-center">
            <p className="text-sm font-medium">{step.label}</p>
            <Progress value={step.pct} />
            <p className="text-xs text-muted-foreground">
              This usually takes about a minute
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
