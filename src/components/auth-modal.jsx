import LoginForm from "@/components/login-form";

export default function AuthModal({ open, onClose, defaultMode = "login" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
      <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold mb-3">
          {defaultMode === "signup" ? "Create Account" : "Sign In"}
        </h3>
        <LoginForm onSuccess={onClose} defaultMode={defaultMode} />
        <button
          type="button"
          className="mt-3 text-sm text-muted-foreground hover:text-foreground w-full text-center"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
