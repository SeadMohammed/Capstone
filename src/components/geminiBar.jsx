/*import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

// Local history array
let history = [];

async function sendPrompt(msg) {
  // Add user message to history
  history.push({
    role: "user",
    parts: [{ text: msg }],
  });

  const chat = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 100,
    },
  });

  const result = await chat.sendMessage(msg);
  const response = await result.response;
  const text = response.text();

  // Add model response to history
  history.push({
    role: "model",
    parts: [{ text }],
  });

  console.log(text);
}

// Example usage
sendPrompt("What's the best way to save money??");
*/
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Firebase configuration object
const firebaseConfig = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "clarityai-8d562.firebaseapp.com",
    projectId: "clarityai-8d562",
    storageBucket: "clarityai-8d562.firebasestorage.app",
    messagingSenderId: "315016782530",
    appId: "1:315016782530:web:28efb99e340e9d550b115b",
    measurementId: "G-B815V2N3SS"
};
await addDoc(collection(db, 'collection-name'), {
  prompt: 'This is an example',
});
/** Create a Firebase query */
const collectionRef = collection(db, 'collection-name');
const q = query(collectionRef, orderBy('status.startTime'));
/** Listen for any changes **/
onSnapshot(q, (snapshot) => {
  snapshot.docs.forEach((change) => {
    /** Get prompt and response */
    const { comment, output } = change.data();

    /** Update the UI status */
    console.log(output);

    /** Update the UI prompt */
    console.log(comment);

    /** Update the UI AI status */
    console.log(response);
  });
});