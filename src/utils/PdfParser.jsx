import React, { useRef } from 'react';
import pdfToText from 'react-pdftotext';

function parseTransactions(text) {
  const transactions = [];
  const dateRegex = /\d{1,2}\/\d{1,2}\/\d{2}/;
  const amountRegex = /-?\$?\d{1,3}(?:,\d{3})*\.\d{2}/;

  // break text into pseudo-lines by date anchors
  const rawChunks = text
    .split(/(?=\d{1,2}\/\d{1,2}\/\d{2})/g)
    .map((s) => s.trim());

  for (const chunk of rawChunks) {
    const dateMatch = chunk.match(dateRegex);
    const amountMatch = chunk.match(amountRegex);

    if (dateMatch && amountMatch) {
      const date = dateMatch[0];
      const amount = `${amountMatch[0].replace('$', '')}`;

      // cut out amount and date from description space
      const description = chunk
        .replace(dateMatch[0], '')
        .replace(amountMatch[0], '')
        .replace(/\s+/g, ' ')
        .trim();
      /*
      const isMostlyDates = (str) => {
        const dateMatches = str.match(/\d{1,2}\/\d{1,2}\/\d{2}/g);
        return dateMatches && dateMatches.length > 3;
      };

      const isGarbage = (desc) =>
        isMostlyDates(desc) ||
        desc.toLowerCase().includes('page') ||
        desc.toLowerCase().includes('withdrawals and other debits') ||
        desc.toLowerCase().includes('your checking account') ||
        desc.toLowerCase().includes('a check mark below') ||

      if (!isGarbage(description)) {
        transactions.push({ date, amount, description });
      }
        */
      transactions.push({ date, amount, description });
    }
  }

  console.log('Extracted Transactions:', transactions);
  return transactions;
}

function extractText(event) {
  const file = event.target.files[0];
  pdfToText(file)
    .then((text) => {
      console.log('Raw PDF Text:', text.slice(0, 500)); // optional preview
      parseTransactions(text);
    })
    .catch((error) => console.error('Failed to extract text from pdf'));
}

function PdfParser() {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className='App'>
      <header className='App-header'>
        <input
          type='file'
          accept='application/pdf'
          onChange={extractText}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        <button onClick={handleButtonClick}>Upload PDF</button>
      </header>
    </div>
  );
}
export default PdfParser;
