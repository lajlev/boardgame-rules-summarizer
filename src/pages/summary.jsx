import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
import { getSummary } from "@/lib/firebase";

export default function SummaryPage() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getSummary(id)
      .then((data) => {
        if (!data) setNotFound(true);
        else setSummary(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Summary not found.</p>
        <Link to="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  const html = marked(summary.markdown);

  const handleDownloadMarkdown = () => {
    const blob = new Blob([summary.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.gameTitle} - Rules Summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const date = new Date(summary.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b no-print">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            All summaries
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadMarkdown}>
              <FileDown className="w-4 h-4 mr-1" />
              Markdown
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" />
              Print / PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </main>

      <footer className="border-t no-print">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Generated from <strong>{summary.originalFilename}</strong> on {date}
          </p>
        </div>
      </footer>
    </div>
  );
}
