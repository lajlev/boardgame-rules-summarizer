import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import UploadForm from "@/components/upload-form";
import SummaryCard from "@/components/summary-card";
import { getAllSummaries } from "@/lib/firebase";
import ThemeToggle from "@/components/theme-toggle";

export default function Home() {
  const [summaries, setSummaries] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const uploadRef = useRef(null);

  useEffect(() => {
    getAllSummaries()
      .then(setSummaries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = summaries.filter((s) =>
    s.gameTitle.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
        <div className="flex justify-end items-center gap-2">
          <a
            href="#generate"
            onClick={(e) => {
              e.preventDefault();
              uploadRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Generate Summary
          </a>
          <ThemeToggle />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Lajlev Rules 🤘</h1>
          <p className="text-muted-foreground">
            Upload a rulebook PDF to get a concise rules summary in{" "}
            <i>Lajlev</i> style.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold whitespace-nowrap">
              Summaries
            </h2>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search games..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Loading summaries...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {summaries.length === 0
                ? "No summaries yet. Upload a rulebook to get started."
                : "No matching summaries found."}
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => (
                <SummaryCard key={s.id} summary={s} />
              ))}
            </div>
          )}
        </div>

        <div ref={uploadRef}>
          <UploadForm />
        </div>
      </div>
    </div>
  );
}
