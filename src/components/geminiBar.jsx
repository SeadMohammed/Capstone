import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { initializeApp } from 'firebase/app';
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "clarityai-8d562.firebaseapp.com",
    projectId: "clarityai-8d562",
    storageBucket: "clarityai-8d562.firebasestorage.app",
    messagingSenderId: "315016782530",
    appId: "1:315016782530:web:28efb99e340e9d550b115b",
    measurementId: "G-B815V2N3SS"
}; 
const firebaseApp = initializeApp(firebaseConfig);
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

// Local history array
let history = [];

 async  function sendPrompt(msg) {
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
window.sendPrompt = sendPrompt;

// Converts a File object to a Part object.
async function fileToGenerativePart(file) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(','));
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

async function run() {
  // Provide a text prompt to include with the PDF file
  const prompt = "Summarize the important results in this report.";

  // Prepare PDF file for input
  const fileInputEl = document.querySelector("input[type=file]");
  const pdfPart = await fileToGenerativePart(fileInputEl.files);

  // To generate text output, call `generateContent` with the text and PDF file
  const result = await model.generateContent([prompt, pdfPart]);

  // Log the generated text, handling the case where it might be undefined
  console.log(result.response.text() ?? "No text in response.");
}



/*
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import {db} from '../auth/firebaseConfig.js';

await addDoc(collection(db, 'collection-name'), {
  prompt: 'You are a helpful finanvial advisor. What is the best way to save money?',
});
// Create a Firebase query 
const collectionRef = collection(db, 'collection-name');
const q = query(collectionRef, orderBy('status.startTime'));
// Listen for any changes 
onSnapshot(q, (snapshot) => {
  snapshot.docs.forEach((change) => {
    // Get prompt and response 
    const { comment, output } = change.data();

    // Update the UI status 
    console.log(output);

    // Update the UI prompt 
    console.log(comment);

    // Update the UI AI status 
    console.log(response);
  });
});
*/