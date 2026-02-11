import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, X } from "lucide-react";
import Loader from "@/components/loader";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import {
  saveSummary,
  findSummariesByFilename,
  findSummariesByBggLink,
} from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { nanoid } from "nanoid";
import OpenAI from "openai";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || "gpt-5";

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
  const [files, setFiles] = useState([]);
  const [bggLink, setBggLink] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState([]);
  const [bggDuplicates, setBggDuplicates] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const addFiles = async (newFiles) => {
    const pdfs = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf",
    );
    if (pdfs.length === 0) {
      setError("Please select PDF files.");
      return;
    }
    setFiles((prev) => [...prev, ...pdfs]);
    setError("");
    setDuplicates([]);

    // Check for existing summaries with same filename
    const found = [];
    for (const f of pdfs) {
      const matches = await findSummariesByFilename(f.name);
      if (matches.length > 0) {
        found.push({ filename: f.name, summaries: matches });
      }
    }
    if (found.length > 0) {
      setDuplicates(found);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      const remaining = updated.map((f) => f.name.toLowerCase());
      setDuplicates((d) =>
        d.filter((dup) => remaining.includes(dup.filename.toLowerCase())),
      );
      return updated;
    });
  };

  const checkBggLink = async (link) => {
    const trimmed = link.trim();
    if (!trimmed) {
      setBggDuplicates([]);
      return;
    }
    const matches = await findSummariesByBggLink(trimmed);
    setBggDuplicates(matches);
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
        createdBy: {
          uid: user.uid,
          name: user.displayName || user.email,
          email: user.email,
        },
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
            onBlur={(e) => checkBggLink(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {duplicates.length > 0 && (
          <div className="rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30 p-3 space-y-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              A summary already exists for:
            </p>
            {duplicates.map((dup) => (
              <p
                key={dup.filename}
                className="text-sm text-yellow-700 dark:text-yellow-300"
              >
                <span className="font-medium">{dup.filename}</span>
                {" — "}
                <a
                  href={`/summary/${dup.summaries[0].id}`}
                  className="underline underline-offset-2 hover:text-yellow-900 dark:hover:text-yellow-100"
                >
                  {dup.summaries[0].gameTitle}
                </a>
              </p>
            ))}
            <p className="text-xs text-yellow-600 dark:text-yellow-400 pt-1">
              You can still upload to create a new summary.
            </p>
          </div>
        )}

        {bggDuplicates.length > 0 && (
          <div className="rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30 p-3 space-y-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              A summary with this BGG link already exists:
            </p>
            {bggDuplicates.map((dup) => (
              <p
                key={dup.id}
                className="text-sm text-yellow-700 dark:text-yellow-300"
              >
                <a
                  href={`/summary/${dup.id}`}
                  className="underline underline-offset-2 hover:text-yellow-900 dark:hover:text-yellow-100"
                >
                  {dup.gameTitle}
                </a>
              </p>
            ))}
            <p className="text-xs text-yellow-600 dark:text-yellow-400 pt-1">
              You can still upload to create a new summary.
            </p>
          </div>
        )}

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
