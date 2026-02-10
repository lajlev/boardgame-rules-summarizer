import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Lock, FileText } from "lucide-react";
import Loader from "@/components/loader";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { saveSummary } from "@/lib/firebase";
import { nanoid } from "nanoid";
import OpenAI from "openai";

const PASSWORD_HASH = import.meta.env.VITE_APP_PASSWORD_HASH;
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
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleUnlock = async (e) => {
    e.preventDefault();
    const hash = await hashPassword(password);
    if (hash === PASSWORD_HASH) {
      setUnlocked(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password.");
    }
  };

  const handleFile = (f) => {
    if (f && f.type === "application/pdf") {
      setFile(f);
      setError("");
    } else {
      setError("Please select a PDF file.");
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const pdfText = await extractTextFromPdf(file);

      if (!pdfText || pdfText.trim().length < 50) {
        throw new Error(
          "Could not extract enough text from the PDF. It may be image-based.",
        );
      }

      const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      console.log("[OpenAI] Sending request to model:", OPENAI_MODEL);
      console.log(
        "[OpenAI] Prompt length:",
        SYSTEM_PROMPT.length + pdfText.length,
        "chars",
      );

      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here is the full text of the board game rulebook:\n\n${pdfText}`,
          },
        ],
      });

      console.log("[OpenAI] Response received. Usage:", completion.usage);

      const markdown = completion.choices[0].message.content;
      console.log("[OpenAI] Summary length:", markdown.length, "chars");

      const titleMatch = markdown.match(/^##\s+(.+?)(?:\s*\(|$)/m);
      const gameTitle = titleMatch
        ? titleMatch[1].trim()
        : file.name.replace(/\.pdf$/i, "");
      console.log("[Summary] Game title:", gameTitle);

      const id = nanoid(10);
      console.log("[Firestore] Saving summary with id:", id);

      await saveSummary(id, {
        gameTitle,
        originalFilename: file.name,
        markdown,
      });

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
              placeholder="Enter password"
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
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-medium">{file.name}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click or drag a PDF here
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) =>
              e.target.files.length && handleFile(e.target.files[0])
            }
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSubmit} disabled={!file} className="w-full">
          Generate Summary
        </Button>
      </CardContent>
    </Card>
  );
}
