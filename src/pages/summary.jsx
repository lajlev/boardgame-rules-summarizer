import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Printer,
  FileDown,
  Search,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { getSummary } from "@/lib/firebase";
import { timeAgo } from "@/lib/time";
import ThemeToggle from "@/components/theme-toggle";

export default function SummaryPage() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);

  const highlightHtml = useCallback((html, term) => {
    if (!term.trim()) return { html, count: 0 };
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    let index = 0;
    const highlighted = html.replace(/>([^<]+)</g, (match, text) => {
      return (
        ">" +
        text.replace(regex, (matched) => {
          const i = index++;
          return `<mark data-match="${i}" class="search-match bg-yellow-200/60 dark:bg-yellow-800/60 rounded-sm">${matched}</mark>`;
        }) +
        "<"
      );
    });
    return { html: highlighted, count: index };
  }, []);

  useEffect(() => {
    getSummary(id)
      .then((data) => {
        if (!data) setNotFound(true);
        else setSummary(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const rawHtml = summary ? marked(summary.markdown) : "";
  const { html, count: matchCount } = highlightHtml(rawHtml, search);

  useEffect(() => {
    setCurrentMatch(0);
  }, [search]);

  useEffect(() => {
    if (matchCount === 0) return;
    const marks = document.querySelectorAll("mark.search-match");
    marks.forEach((m) =>
      m.classList.remove(
        "ring-2",
        "ring-primary",
        "bg-yellow-300",
        "dark:bg-yellow-600",
      ),
    );
    const active = marks[currentMatch];
    if (active) {
      active.classList.add(
        "ring-2",
        "ring-primary",
        "bg-yellow-300",
        "dark:bg-yellow-600",
      );
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentMatch, matchCount, html]);

  const goToMatch = (direction) => {
    if (matchCount === 0) return;
    setCurrentMatch((prev) =>
      direction === "next"
        ? (prev + 1) % matchCount
        : (prev - 1 + matchCount) % matchCount,
    );
  };

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

  const handleDownloadMarkdown = () => {
    const blob = new Blob([summary.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.gameTitle} - Rules Summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const date = timeAgo(summary.createdAt);

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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matchCount > 0) {
                      goToMatch(e.shiftKey ? "prev" : "next");
                    }
                  }}
                  className="pl-8 pr-7 h-8 w-40 text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {search.trim() && (
                <>
                  <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                    {matchCount > 0
                      ? `${currentMatch + 1}/${matchCount}`
                      : "0/0"}
                  </span>
                  <button
                    onClick={() => goToMatch("prev")}
                    disabled={matchCount === 0}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => goToMatch("next")}
                    disabled={matchCount === 0}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMarkdown}
            >
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

      <footer className="hidden print:block mt-8 pt-4 border-t border-gray-300">
        <div className="flex items-center gap-3">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`https://rules.lillefar.com/summary/${id}`)}`}
            alt="QR code"
            className="w-16 h-16"
          />
          <div className="text-[8pt] text-gray-600">
            <p className="font-semibold">View online</p>
            <p>rules.lillefar.com/summary/{id}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
