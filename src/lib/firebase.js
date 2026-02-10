import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function saveSummary(id, data) {
  const docRef = doc(db, "summaries", id);
  const payload = { ...data, createdAt: new Date().toISOString() };

  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Firestore save timed out after 15s")),
      15000,
    ),
  );

  await Promise.race([setDoc(docRef, payload), timeout]);
}

export async function getSummary(id) {
  const snap = await getDoc(doc(db, "summaries", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getAllSummaries() {
  const q = query(collection(db, "summaries"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
