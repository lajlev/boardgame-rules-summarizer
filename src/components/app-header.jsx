import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Printer,
  MoreVertical,
  FileDown,
  Pencil,
  LogOut,
  Moon,
  Sun,
  FilePlus,
} from "lucide-react";
import { useTheme } from "@/components/theme-toggle";
import AuthModal from "@/components/auth-modal";
import { useAuth } from "@/contexts/auth-context";

function UserAvatar({ user }) {
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        className="w-7 h-7 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  const initial = (user.displayName || user.email || "?")[0].toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
      {initial}
    </div>
  );
}

export default function AppHeader({
  // Search props (optional — summary page uses these)
  searchOpen,
  onToggleSearch,
  search,
  onSearchChange,
  matchCount,
  currentMatch,
  onGoToMatch,
  searchInputDesktopRef,
  searchInputMobileRef,
  // Print (optional — summary page)
  onPrint,
  // Menu items (optional — summary page)
  onDownloadMarkdown,
  onEditSummary,
}) {
  const { user, loading: authLoading, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);

  const hasSearch = onToggleSearch !== undefined;
  const hasPrint = onPrint !== undefined;
  const hasMenu = onDownloadMarkdown !== undefined;

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpen && !userMenuOpen) return;
    const handleClick = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, userMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b no-print">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-2">
          <Link
            to="/"
            className="text-sm font-semibold text-foreground hover:text-foreground/80"
          >
            Lajlev Rules
          </Link>

          <div className="mr-auto" />

          {!hasMenu && (
            <Link to="/upload">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Create Summary
              </Button>
            </Link>
          )}

          {/* Desktop inline search */}
          {hasSearch && searchOpen && (
            <div className="hidden sm:flex items-center gap-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  ref={searchInputDesktopRef}
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") onToggleSearch();
                    if (e.key === "Enter" && matchCount > 0) {
                      onGoToMatch(e.shiftKey ? "prev" : "next");
                    }
                  }}
                  className="pl-8 pr-7 h-8 w-48 text-sm"
                />
                {search && (
                  <button
                    onClick={() => onSearchChange("")}
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
                    onClick={() => onGoToMatch("prev")}
                    disabled={matchCount === 0}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onGoToMatch("next")}
                    disabled={matchCount === 0}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {hasSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleSearch}
            >
              {searchOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          )}

          {hasPrint && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onPrint}
            >
              <Printer className="w-4 h-4" />
            </Button>
          )}

          {/* User / sign in */}
          {!authLoading &&
            (user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 rounded-full hover:opacity-80 transition-opacity"
                >
                  <UserAvatar user={user} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-background border rounded-md shadow-lg py-1 z-20">
                    <div className="px-3 py-2 border-b">
                      {user.displayName && (
                        <p className="text-sm font-medium truncate">
                          {user.displayName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent"
                    >
                      {dark ? (
                        <Sun className="w-4 h-4" />
                      ) : (
                        <Moon className="w-4 h-4" />
                      )}
                      {dark ? "Light Mode" : "Dark Mode"}
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAuthModalOpen(true)}
              >
                Sign In
              </Button>
            ))}

          {/* Overflow menu (summary page only) */}
          {hasMenu && (
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
                  <Link
                    to="/upload"
                    onClick={() => setMenuOpen(false)}
                    className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent"
                  >
                    <FilePlus className="w-4 h-4" />
                    Create Summary
                  </Link>
                  <button
                    onClick={() => {
                      onDownloadMarkdown();
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent"
                  >
                    <FileDown className="w-4 h-4" />
                    Download Markdown
                  </button>
                  {user && onEditSummary && (
                    <button
                      onClick={() => {
                        onEditSummary();
                        setMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Summary
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile search bar below header */}
        {hasSearch && searchOpen && (
          <div className="sm:hidden px-4 pb-2 flex items-center gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                ref={searchInputMobileRef}
                placeholder="Search..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onToggleSearch();
                  if (e.key === "Enter" && matchCount > 0) {
                    onGoToMatch(e.shiftKey ? "prev" : "next");
                  }
                }}
                className="pl-8 pr-7 h-8 w-full text-sm"
              />
              {search && (
                <button
                  onClick={() => onSearchChange("")}
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
                  onClick={() => onGoToMatch("prev")}
                  disabled={matchCount === 0}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onGoToMatch("next")}
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

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
