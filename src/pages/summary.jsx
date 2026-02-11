import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "lucide-react";
import AppHeader from "@/components/app-header";
import { getSummary, updateSummary, deleteSummary } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { timeAgo } from "@/lib/time";

export default function SummaryPage() {
  const { id } = useParams();
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editMarkdown, setEditMarkdown] = useState("");
  const [editBggLink, setEditBggLink] = useState("");
  const [saving, setSaving] = useState(false);

  const searchInputDesktopRef = useRef(null);
  const searchInputMobileRef = useRef(null);

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
          return `<mark data-match="${i}" class="search-match">${matched}</mark>`;
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
    marks.forEach((m) => m.classList.remove("search-match-active"));
    const active = marks[currentMatch];
    if (active) {
      active.classList.add("search-match-active");
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentMatch, matchCount, html]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => {
        if (searchInputDesktopRef.current)
          searchInputDesktopRef.current.focus();
        if (searchInputMobileRef.current) searchInputMobileRef.current.focus();
      });
    }
  }, [searchOpen]);

  const goToMatch = (direction) => {
    if (matchCount === 0) return;
    setCurrentMatch((prev) =>
      direction === "next"
        ? (prev + 1) % matchCount
        : (prev - 1 + matchCount) % matchCount,
    );
  };

  const toggleSearch = () => {
    if (searchOpen) {
      setSearch("");
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  };

  const startEditing = () => {
    setEditMarkdown(summary.markdown);
    setEditBggLink(summary.bggLink || "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditMarkdown("");
    setEditBggLink("");
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      const updates = { markdown: editMarkdown };

      const titleMatch = editMarkdown.match(/^##\s+(.+?)(?:\s*\(|$)/m);
      if (titleMatch) {
        updates.gameTitle = titleMatch[1].trim();
      }

      if (editBggLink.trim()) {
        updates.bggLink = editBggLink.trim();
      } else {
        updates.bggLink = "";
      }

      await updateSummary(id, updates);
      setSummary((prev) => ({ ...prev, ...updates }));
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
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

  const handleDelete = async () => {
    if (!confirm(`Delete "${summary.gameTitle}"? This cannot be undone.`))
      return;
    try {
      await deleteSummary(id);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Failed to delete: " + err.message);
    }
  };

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
      <AppHeader
        searchOpen={searchOpen}
        onToggleSearch={toggleSearch}
        search={search}
        onSearchChange={setSearch}
        matchCount={matchCount}
        currentMatch={currentMatch}
        onGoToMatch={goToMatch}
        searchInputDesktopRef={searchInputDesktopRef}
        searchInputMobileRef={searchInputMobileRef}
        onPrint={() => window.print()}
        onDownloadMarkdown={handleDownloadMarkdown}
        onEditSummary={canEdit(summary) ? startEditing : undefined}
        onDeleteSummary={canEdit(summary) ? handleDelete : undefined}
      />

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* BGG Link */}
        {summary.bggLink && !editing && (
          <div className="mb-4 no-print">
            <a
              href={summary.bggLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on BGG
            </a>
          </div>
        )}

        {editing ? (
          <div className="space-y-4 no-print">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                BGG Link (optional)
              </label>
              <Input
                placeholder="https://boardgamegeek.com/boardgame/..."
                value={editBggLink}
                onChange={(e) => setEditBggLink(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Rules Summary (Markdown)
              </label>
              <textarea
                value={editMarkdown}
                onChange={(e) => setEditMarkdown(e.target.value)}
                className="w-full min-h-[60vh] p-3 rounded-md border border-input bg-background text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
              <Button onClick={saveEdits} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </main>

      <footer className="border-t no-print">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <p className="text-[11px] text-muted-foreground/70">
            {summary.originalFilename} · {date}
            {summary.createdBy?.name && <> · {summary.createdBy.name}</>}
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
