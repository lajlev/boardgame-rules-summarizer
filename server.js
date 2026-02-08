require("dotenv").config();

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { marked } = require("marked");
const { nanoid } = require("nanoid");
const OpenAI = require("openai");
const path = require("path");
const { insertSummary, getSummary } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."));
    }
  },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `I am uploading the rulebook for a board game. Please create a "Rules Summary and Reference Sheet" for this game.

Follow these specific guidelines:

### 1. Tone and Style

* **Zero Flavor Text:** Do not include thematic descriptions (e.g., "You are a merchant in the middle ages..."). Only include mechanical instructions.

* **Imperative & Concise:** Use the imperative mood. Shorten sentences.
    * *Bad:* "The player should then take the dice and roll them."
    * *Good:* "Roll the dice."

* **High Density:** Pack information tightly. Only use bullet points and indentation to show hierarchy.

### 2. Structure

Organize the summary in this exact order:

---

## {{Title}} ({{Year}})
{{one line theme description (max 25 words)}}

### END OF GAME
* Trigger: What specifically triggers the end (e.g., "When the deck runs out").
* Scoring: A bulleted list of everything that provides Victory Points (Only if relevant).
* Tie-Breakers: List the tie-breaking rules in order (Don't show if co-op game).

### GAMEPLAY
* This is the main body. Break it down by Phases (e.g., "Phase 1: Income", "Phase 2: Action").
* Use bold headers for the Phase names.
* Use numbered lists for sequential steps within a phase.
* **Action List:** If there is a list of available actions (e.g., "On your turn, perform 1 of the following 4 actions"), use bold headings for each action name followed by the mechanical cost and resolution.

### KEY CONCEPTS
* If the game uses specific keywords (e.g., "Trample," "Ambush") or icons, provide a glossary section defining them briefly.

### SETUP
* List steps strictly in order.
* **Never use lists:** If starting resources/cards change based on the player count (e.g., "2 Players: 3 cards, 3 Players: 4 cards"), you MUST present this in text, not table.

---

### 3. Formatting Rules
* **Bold:** Use bolding for **Game Terms**, **Phase Names**, and **Action Names**.
* **Never use tables**
* **List and sublist:** To show that a sub-rule belongs to a parent rule.

### 4. Special Instructions
* If there are expansion modules included in the rulebook, create a separate section at the very bottom labeled "EXPANSIONS" and summarize them separately.
* Ignore "Solitaire" rules unless they are the primary way to play.
* Do not summarize "Strategy Tips" or "Example of Play" sections.

Begin the summary now based on the attached file.`;

// Home page
app.get("/", (_req, res) => {
  res.render("index");
});

// Upload and process
app.post("/upload", upload.single("rulebook"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).render("error", { message: "No file uploaded." });
    }

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length < 50) {
      return res.status(400).render("error", {
        message:
          "Could not extract enough text from the PDF. The file may be image-based or corrupted.",
      });
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the full text of the board game rulebook:\n\n${pdfText}`,
        },
      ],
      temperature: 0.3,
    });

    const markdown = completion.choices[0].message.content;

    // Extract game title from first heading
    const titleMatch = markdown.match(/^##\s+(.+?)(?:\s*\(|$)/m);
    const gameTitle = titleMatch ? titleMatch[1].trim() : req.file.originalname.replace(/\.pdf$/i, "");

    // Save to database
    const id = nanoid(10);
    insertSummary.run({
      id,
      game_title: gameTitle,
      original_filename: req.file.originalname,
      markdown,
    });

    res.redirect(`/summary/${id}`);
  } catch (err) {
    console.error("Error processing upload:", err);

    if (err instanceof multer.MulterError) {
      return res.status(400).render("error", {
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 20}MB.`
            : err.message,
      });
    }

    res.status(500).render("error", {
      message: "Something went wrong while generating the summary. Please try again.",
    });
  }
});

// Summary page
app.get("/summary/:id", (req, res) => {
  const summary = getSummary.get(req.params.id);
  if (!summary) {
    return res.status(404).render("error", { message: "Summary not found." });
  }

  const html = marked(summary.markdown);
  res.render("summary", { summary, html });
});

// Raw markdown
app.get("/summary/:id/raw", (req, res) => {
  const summary = getSummary.get(req.params.id);
  if (!summary) {
    return res.status(404).send("Not found");
  }
  res.type("text/markdown").send(summary.markdown);
});

// Multer error handler
app.use((err, _req, res, _next) => {
  if (err.message === "Only PDF files are allowed.") {
    return res.status(400).render("error", { message: err.message });
  }
  console.error(err);
  res.status(500).render("error", { message: "An unexpected error occurred." });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
