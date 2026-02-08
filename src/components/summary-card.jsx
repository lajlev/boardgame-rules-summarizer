import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function SummaryCard({ summary }) {
  const date = new Date(summary.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link to={`/summary/${summary.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{summary.gameTitle}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
