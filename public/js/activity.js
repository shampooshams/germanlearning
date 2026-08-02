import { db } from "./firebase-init.js";
import {
  doc, getDoc, setDoc, serverTimestamp, collection, addDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr() {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function recordActivity(uid, { action, detail }) {
  await addDoc(collection(db, 'users', uid, 'activity'), {
    action,
    detail,
    createdAt: serverTimestamp(),
  });

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const today = todayStr();
  let streak = 1;

  if (snap.exists()) {
    const data = snap.data();
    if (data.lastActiveDate === today) {
      streak = data.currentStreak || 1;
    } else if (data.lastActiveDate === yesterdayStr()) {
      streak = (data.currentStreak || 0) + 1;
    } else {
      streak = 1;
    }
  }

  await setDoc(userRef, { lastActiveDate: today, currentStreak: streak }, { merge: true });
}
