import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp } from 'firebase/app';
import { getGoals } from '../firebase/goalsService';
import { getTransactions } from '../firebase/transactionsService';
import { auth } from "../auth/firebaseConfig";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'clarityai-8d562.firebaseapp.com',
  projectId: 'clarityai-8d562',
  storageBucket: 'clarityai-8d562.firebasestorage.app',
  messagingSenderId: '315016782530',
  appId: '1:315016782530:web:28efb99e340e9d550b115b',
  measurementId: 'G-B815V2N3SS',
};
const firebaseApp = initializeApp(firebaseConfig);
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
export const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });

// Local history array
let history = [];
export async function sendPrompt(msg) {
  const user = auth.currentUser;
  if (!user) {
    console.error("No user is signed in.");
    return;
  }
  const userId = user.uid;

  // Take Goals and transactions from firebase
  const goals = await getGoals(userId);
  const transactions = await getTransactions(userId);

  // format the data for it to be used in the prompt
  const goalsContext = `Goals:\n${goals.map(g => `- ${g.title} (${g.currentAmount}/${g.targetAmount}) due ${g.dueDate}`).join('\n')}`;
  const transactionsContext = `Transactions:\n${transactions.map(t => `- ${t.date}: ${t.description} $${t.amount} (${t.category}) ${t.type}`).join('\n')}`;
  const time = new Date().toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  // Put it all together
  const context = `${goalsContext}\n\n${transactionsContext}\n\n The Date and time is: ${time}\n\n You are a financial assistant. Use the provided goals and transactions to answer the user's questions accurately and concisely, perferrably within 2-3 paragraphs. Not that if it says subscription, it's a subscription to a service. User question: ${msg}`;



  // Port history into the chat
  const chat = model.startChat({
    history,
    generationConfig: {
    },
  });

  const result = await chat.sendMessage(context);
  const response = await result.response;
  const text = response.text();

  // History for user
  history.push({
    role: 'user',
    parts: [{ text: msg }],
  });
  // Add model response to history
  history.push({
    role: 'model',
    parts: [{ text }],
  });

  console.log(text);
  return text; 
}

// Example usage
window.sendPrompt = sendPrompt;

// Converts a File object to a Part object.
export async function fileToGenerativePart(file) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

async function run() {
  // Provide a text prompt to include with the PDF file
  const prompt = 'Summarize the important results in this report.';

  // Prepare PDF file for input
  const fileInputEl = document.querySelector('input[type=file]');
  const pdfPart = await fileToGenerativePart(fileInputEl.files);

  // To generate text output, call `generateContent` with the text and PDF file
  const result = await model.generateContent([prompt, pdfPart]);

  // Log the generated text, handling the case where it might be undefined
  console.log(result.response.text() ?? 'No text in response.');
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
