import UploadForm from "@/components/upload-form";
import AppHeader from "@/components/app-header";
import AuthModal from "@/components/auth-modal";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";

export default function UploadPage() {
  const { user, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Loading...
          </p>
        ) : user ? (
          <UploadForm />
        ) : (
          <div className="text-center space-y-4 py-12">
            <p className="text-muted-foreground">
              Sign in to upload a rulebook and create a summary.
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-sm font-medium underline underline-offset-2 hover:text-foreground/80"
            >
              Sign In
            </button>
            <AuthModal
              open={authModalOpen}
              onClose={() => setAuthModalOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
