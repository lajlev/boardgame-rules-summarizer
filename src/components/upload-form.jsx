import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Lock, FileText, X } from "lucide-react";
import Loader from "@/components/loader";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { saveSummary } from "@/lib/firebase";
import { nanoid } from "nanoid";
import OpenAI from "openai";

const ADMIN_PASSWORD_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || "gpt-5";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function extractTextFromPdf(file) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;
  console.log(
    "[PDF] Starting text extraction for:",
    file.name,
    `(${(file.size / 1024).toFixed(1)} KB)`,
  );

  const arrayBuffer = await file.arrayBuffer();
  console.log(
    "[PDF] ArrayBuffer created, size:",
    arrayBuffer.byteLength,
    "bytes",
  );

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 })
    .promise;
  console.log("[PDF] Document loaded, pages:", pdf.numPages);

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    console.log(
      `[PDF] Page ${i}/${pdf.numPages}: ${content.items.length} items, ${pageText.length} chars`,
    );
    pages.push(pageText);
  }

  const fullText = pages.join("\n\n");
  console.log(
    "[PDF] Extraction complete. Total length:",
    fullText.length,
    "chars",
  );
  return fullText;
}

export default function UploadForm() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [files, setFiles] = useState([]);
  const [bggLink, setBggLink] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleUnlock = async (e) => {
    e.preventDefault();
    const hash = await hashPassword(password);
    if (hash === ADMIN_PASSWORD_HASH) {
      setUnlocked(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password.");
    }
  };

  const addFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf",
    );
    if (pdfs.length === 0) {
      setError("Please select PDF files.");
      return;
    }
    setFiles((prev) => [...prev, ...pdfs]);
    setError("");
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError("");

    try {
      // Extract text from all PDFs
      const allTexts = [];
      for (const file of files) {
        const pdfText = await extractTextFromPdf(file);
        if (!pdfText || pdfText.trim().length < 50) {
          throw new Error(
            `Could not extract enough text from ${file.name}. It may be image-based.`,
          );
        }
        allTexts.push(pdfText);
      }

      const combinedText = allTexts.join("\n\n--- Next document ---\n\n");

      const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      console.log("[OpenAI] Sending request to model:", OPENAI_MODEL);
      console.log(
        "[OpenAI] Prompt length:",
        SYSTEM_PROMPT.length + combinedText.length,
        "chars",
      );

      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here is the full text of the board game rulebook:\n\n${combinedText}`,
          },
        ],
      });

      console.log("[OpenAI] Response received. Usage:", completion.usage);

      const markdown = completion.choices[0].message.content;
      console.log("[OpenAI] Summary length:", markdown.length, "chars");

      const titleMatch = markdown.match(/^##\s+(.+?)(?:\s*\(|$)/m);
      const gameTitle = titleMatch
        ? titleMatch[1].trim()
        : files[0].name.replace(/\.pdf$/i, "");
      console.log("[Summary] Game title:", gameTitle);

      const id = nanoid(10);
      console.log("[Firestore] Saving summary with id:", id);

      const summaryData = {
        gameTitle,
        originalFilename: files.map((f) => f.name).join(", "),
        markdown,
      };

      if (bggLink.trim()) {
        summaryData.bggLink = bggLink.trim();
      }

      await saveSummary(id, summaryData);

      console.log("[Firestore] Save complete. Navigating to summary.");
      navigate(`/summary/${id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  if (!unlocked) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="w-5 h-5" />
            Generate New Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit">Unlock</Button>
          </form>
          {passwordError && (
            <p className="text-sm text-destructive mt-2">{passwordError}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="w-5 h-5" />
          Upload Rulebook PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-input hover:border-muted-foreground"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {files.length > 0 ? (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Click or drag to add more PDFs
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click or drag PDFs here
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <div>
          <Input
            placeholder="BGG link (optional)"
            value={bggLink}
            onChange={(e) => setBggLink(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={files.length === 0}
          className="w-full"
        >
          Create New Rules Summary
        </Button>
      </CardContent>
    </Card>
  );
}
