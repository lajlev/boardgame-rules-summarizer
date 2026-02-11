import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Printer,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  FileDown,
  Moon,
  Sun,
  Pencil,
  ExternalLink,
  LogIn,
  LogOut,
} from "lucide-react";
import AuthModal from "@/components/auth-modal";
import { getSummary, updateSummary } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { timeAgo } from "@/lib/time";

export default function SummaryPage() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  // Edit state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editMarkdown, setEditMarkdown] = useState("");
  const [editBggLink, setEditBggLink] = useState("");
  const [saving, setSaving] = useState(false);

  const menuRef = useRef(null);
  const searchInputDesktopRef = useRef(null);
  const searchInputMobileRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

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
    setMenuOpen(false);
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

  const handleDownloadMarkdown = () => {
    const blob = new Blob([summary.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.gameTitle} - Rules Summary.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const date = timeAgo(summary.createdAt);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b no-print">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-2">
          <Link
            to="/"
            className="text-sm font-semibold text-foreground hover:text-foreground/80 mr-auto"
          >
            Lajlev Rules
          </Link>

          {/* Desktop inline search */}
          {searchOpen && (
            <div className="hidden sm:flex items-center gap-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  ref={searchInputDesktopRef}
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") toggleSearch();
                    if (e.key === "Enter" && matchCount > 0) {
                      goToMatch(e.shiftKey ? "prev" : "next");
                    }
                  }}
                  className="pl-8 pr-7 h-8 w-48 text-sm"
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
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleSearch}
          >
            {searchOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
          </Button>

          {/* Sign in / out */}
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowLoginModal(true)}
              title="Sign In"
            >
              <LogIn className="w-4 h-4" />
            </Button>
          )}

          {/* Menu */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-md shadow-lg py-1 z-20">
                <button
                  onClick={handleDownloadMarkdown}
                  className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent"
                >
                  <FileDown className="w-4 h-4" />
                  Download Markdown
                </button>
                <button
                  onClick={() => {
                    setDark(!dark);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent"
                >
                  {dark ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                  {dark ? "Light mode" : "Dark mode"}
                </button>
                {user && (
                  <button
                    onClick={startEditing}
                    className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Summary
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile search bar below header */}
        {searchOpen && (
          <div className="sm:hidden px-4 pb-2 flex items-center gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                ref={searchInputMobileRef}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") toggleSearch();
                  if (e.key === "Enter" && matchCount > 0) {
                    goToMatch(e.shiftKey ? "prev" : "next");
                  }
                }}
                className="pl-8 pr-7 h-8 w-full text-sm"
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
                  {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : "0/0"}
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
        )}
      </header>

      <AuthModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
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
