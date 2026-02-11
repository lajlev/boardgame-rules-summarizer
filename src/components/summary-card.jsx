import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { timeAgo } from "@/lib/time";

export default function SummaryCard({ summary }) {
  const date = timeAgo(summary.createdAt);

  return (
    <Link to={`/summary/${summary.id}`} className="block">
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="!px-3 !py-2 flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{summary.gameTitle}</p>
            <p className="text-[11px] text-muted-foreground/70">
              {date}
              {summary.createdBy?.name && <> · {summary.createdBy.name}</>}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
