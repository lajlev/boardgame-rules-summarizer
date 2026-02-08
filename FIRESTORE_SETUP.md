# Firestore Setup Guide

This app uses Google Firestore to store generated rule summaries. Follow these steps to create and configure a Firebase project.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**.
3. Enter a project name (e.g. `boardgame-rules-summarizer`).
4. Disable Google Analytics (not needed) and click **Create project**.

## 2. Enable Firestore

1. In your Firebase project, go to **Build > Firestore Database** in the left sidebar.
2. Click **Create database**.
3. Choose a location closest to your users (e.g. `europe-west1` for Europe, `us-central1` for US).
4. Select **Start in test mode** (you'll tighten rules later).
5. Click **Enable**.

## 3. Get Your Firebase Config

1. In the Firebase Console, click the gear icon next to **Project Overview** and select **Project settings**.
2. Scroll down to **Your apps**. If no app exists yet, click the web icon (`</>`) to add one.
3. Register the app with any nickname (e.g. `rules-summarizer-web`). You do not need Firebase Hosting.
4. Copy the config values from the code snippet shown:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",            // → VITE_FIREBASE_API_KEY
     authDomain: "xxx.firebaseapp.com",  // → VITE_FIREBASE_AUTH_DOMAIN
     projectId: "your-project-id",       // → VITE_FIREBASE_PROJECT_ID
   };
   ```

5. Add these to your `.env` file (local) and GitHub Secrets (for deployment).

## 4. Configure Security Rules

The default test mode rules expire after 30 days. Replace them with rules that allow public read (so anyone can view summaries) but restrict writes to prevent abuse.

1. In Firestore, go to the **Rules** tab.
2. Replace the rules with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /summaries/{summaryId} {
         allow read: if true;
         allow write: if true;
       }
     }
   }
   ```

   This allows anyone to read and write summaries. Since the upload form is password-protected in the app, this is sufficient for a personal tool.

   For stricter security, you could restrict writes to authenticated users using Firebase Auth, but that adds complexity beyond what this tool needs.

## 5. Create the Firestore Index

The app queries summaries ordered by `createdAt` descending. Firestore will automatically create the required index the first time this query runs. If you see an index error in the browser console, click the link in the error message to create it in the Firebase Console.

## 6. Verify

1. Start the app locally (`npm run dev`).
2. Open the browser console — there should be no Firebase errors.
3. The home page should show "No summaries yet" (empty state).
4. Upload a test PDF — after generation, the summary should appear in the list and in your Firestore Console under the `summaries` collection.

## Firestore Data Structure

Collection: `summaries`

Each document (keyed by a 10-character nanoid):

```
{
  gameTitle: "Catan",
  originalFilename: "catan-rules.pdf",
  markdown: "## Catan (1995)\n...",
  createdAt: "2025-01-15T10:30:00.000Z"
}
```

## Cost

Firestore's free tier (Spark plan) includes:
- 1 GiB storage
- 50,000 reads/day
- 20,000 writes/day

This is more than enough for a personal rules summarizer tool. You will not be charged unless you exceed these limits.
