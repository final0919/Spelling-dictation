/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Word } from '../types';

/**
 * Parses raw text input into an array of Word objects.
 * Handles:
 * 1. PDF/OCR copy-paste lines like: "1 310 personal ['p:sənl] adj.私人的，个人的"
 * 2. Simplified lines: "word, translation" or "word translation" or "word [phonetic] translation"
 * 3. JSON format
 */
export function parseWordList(text: string): Word[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Try parsing as JSON first
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx: number) => ({
          id: typeof item.id === 'number' ? item.id : idx + 1,
          frequency: typeof item.frequency === 'number' ? item.frequency : 100,
          word: String(item.word || '').trim(),
          phonetic: String(item.phonetic || '').trim(),
          translation: String(item.translation || '').trim()
        })).filter(w => w.word);
      }
    } catch (e) {
      // Not valid JSON, fallback to line-by-line parsing
    }
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const words: Word[] = [];

  lines.forEach((line, index) => {
    // Check if line is header or metadata to skip
    if (line.includes('核心高考') || line.includes('学科网') || line.includes('序 号') || line.includes('考 频')) {
      return;
    }

    // Attempt to extract fields using a series of strategies
    
    // Strategy 1: OCR line pattern "ID FREQUENCY WORD [PHONETIC] TRANSLATION"
    // e.g. "1 310 personal ['p:sənl] adj.私人的，个人的"
    // Matches: (number) (number) (word) ([phonetic]) (translation)
    const ocrMatch = line.match(/^(\d+)\s+(\d+)\s+([a-zA-Z\s\-'\(\)]+?)\s+(\[[^\]]+\])\s+(.+)$/);
    if (ocrMatch) {
      words.push({
        id: parseInt(ocrMatch[1], 10),
        frequency: parseInt(ocrMatch[2], 10),
        word: ocrMatch[3].trim(),
        phonetic: ocrMatch[4].trim(),
        translation: ocrMatch[5].trim()
      });
      return;
    }

    // Strategy 2: OCR line but without frequency column
    // e.g. "1 personal ['p:sənl] adj.私人的"
    const ocrNoFreqMatch = line.match(/^(\d+)\s+([a-zA-Z\s\-'\(\)]+?)\s+(\[[^\]]+\])\s+(.+)$/);
    if (ocrNoFreqMatch) {
      words.push({
        id: parseInt(ocrNoFreqMatch[1], 10),
        frequency: 100,
        word: ocrNoFreqMatch[2].trim(),
        phonetic: ocrNoFreqMatch[3].trim(),
        translation: ocrNoFreqMatch[4].trim()
      });
      return;
    }

    // Strategy 3: Just word and phonetic and translation
    // e.g. "personal ['p:sənl] adj.私人的"
    const wordPhoneticTransMatch = line.match(/^([a-zA-Z\s\-'\(\)]+?)\s+(\[[^\]]+\])\s+(.+)$/);
    if (wordPhoneticTransMatch) {
      words.push({
        id: index + 1,
        frequency: 100,
        word: wordPhoneticTransMatch[1].trim(),
        phonetic: wordPhoneticTransMatch[2].trim(),
        translation: wordPhoneticTransMatch[3].trim()
      });
      return;
    }

    // Strategy 4: Comma/Tab/Semicolon separated
    // e.g. "personal, adj.私人的"
    const separators = [',', '\t', ';', '，', '；'];
    for (const sep of separators) {
      if (line.includes(sep)) {
        const parts = line.split(sep);
        const w = parts[0].trim();
        const t = parts.slice(1).join(sep).trim();
        if (w && t) {
          // See if there's phonetic in the translation part
          let ph = '';
          let trans = t;
          const phMatch = t.match(/^(\[[^\]]+\])\s*(.*)$/);
          if (phMatch) {
            ph = phMatch[1];
            trans = phMatch[2];
          }
          words.push({
            id: index + 1,
            frequency: 100,
            word: w,
            phonetic: ph || '[-]',
            translation: trans || t
          });
          return;
        }
      }
    }

    // Strategy 5: Space separated word and translation
    // Find the first Chinese character or explanation-like start to split
    const spaceSplitMatch = line.match(/^([a-zA-Z\s\-'\(\)]+?)\s+([vna\u4e00-\u9fa5].+)$/);
    if (spaceSplitMatch) {
      words.push({
        id: index + 1,
        frequency: 100,
        word: spaceSplitMatch[1].trim(),
        phonetic: '[-]',
        translation: spaceSplitMatch[2].trim()
      });
      return;
    }

    // Fallback strategy: Just split by first space or make best effort
    const firstSpaceIndex = line.indexOf(' ');
    if (firstSpaceIndex > 0) {
      const w = line.substring(0, firstSpaceIndex).trim();
      const t = line.substring(firstSpaceIndex).trim();
      if (/^[a-zA-Z\-\s]+$/.test(w)) {
        words.push({
          id: index + 1,
          frequency: 100,
          word: w,
          phonetic: '[-]',
          translation: t
        });
        return;
      }
    }

    // Absolute fallback
    words.push({
      id: index + 1,
      frequency: 100,
      word: line,
      phonetic: '[-]',
      translation: '（未提取到翻译）'
    });
  });

  return words;
}

/**
 * Formats a list of Word objects into copyable text format
 */
export function stringifyWordList(words: Word[]): string {
  return words
    .map(w => `${w.id}\t${w.frequency}\t${w.word}\t${w.phonetic}\t${w.translation}`)
    .join('\n');
}

/**
 * Parses a custom range/ID string (e.g. "1-15, 30-45, 50, 52") into an array of IDs.
 */
export function parseCustomIds(customIdsStr: string, maxId: number): number[] {
  const ids: number[] = [];
  const parts = customIdsStr.split(/[,，\s]+/);
  
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;
    
    // Check if it's a range like "1-15" or "1~15"
    const rangeMatch = trimmedPart.match(/^(\d+)[\-~–—](\d+)$/);
    if (rangeMatch) {
      const start = Math.max(1, parseInt(rangeMatch[1], 10));
      const end = Math.min(maxId, parseInt(rangeMatch[2], 10));
      
      const minVal = Math.min(start, end);
      const maxVal = Math.max(start, end);
      
      for (let i = minVal; i <= maxVal; i++) {
        if (!ids.includes(i)) {
          ids.push(i);
        }
      }
    } else {
      // Single ID
      const idVal = parseInt(trimmedPart, 10);
      if (!isNaN(idVal) && idVal >= 1 && idVal <= maxId) {
        if (!ids.includes(idVal)) {
          ids.push(idVal);
        }
      }
    }
  }
  
  return ids.sort((a, b) => a - b);
}

