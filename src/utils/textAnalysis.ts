// src/utils/textAnalysis.ts

interface AnalysisResult {
    person1: string;
    person2: string;
    topWords1: { text: string; value: number }[];
    topWords2: { text: string; value: number }[];
  }
  
  export const analyzeText = (content: string): AnalysisResult => {
    const LIMIT = 100;
    const lines = content.split('\n');
    const names = new Set<string>();
    const wordRegex = /\b\w+\b/gi;
  
    lines.forEach((line) => {
      const match = line.match(/\] (.+?):/);
      if (match) names.add(match[1]);
    });
  
    if (names.size < 2) {
      throw new Error('Could not identify two distinct persons in the chat');
    }
  
    const [person1, person2] = Array.from(names);
    const words1: string[] = [];
    const words2: string[] = [];
  
    lines.forEach((line) => {
      const match = line.match(/\] (.+?): (.+)/);
      if (match) {
        const [, name, message] = match;
        const extractedWords = message.toLowerCase().match(wordRegex) || [];
        if (name === person1) {
          words1.push(...extractedWords);
        } else if (name === person2) {
          words2.push(...extractedWords);
        }
      }
    });
  
    const count1 = words1.reduce(
      (acc, word) => ({ ...acc, [word]: (acc[word] || 0) + 1 }),
      {} as Record<string, number>
    );
    const count2 = words2.reduce(
      (acc, word) => ({ ...acc, [word]: (acc[word] || 0) + 1 }),
      {} as Record<string, number>
    );
  
    const allWords = new Set([...Object.keys(count1), ...Object.keys(count2)]);
    const ratios: Record<string, number> = {};
  
    allWords.forEach((word) => {
      const c1 = count1[word] || 0;
      const c2 = count2[word] || 0;
      ratios[word] = (c1 + 1) / (c2 + 1);
    });
  
    const sortedRatios = Object.entries(ratios).sort((a, b) => b[1] - a[1]);
    const topWords1 = sortedRatios.slice(0, LIMIT).map(([text, value]) => ({ text, value }));
    const topWords2 = sortedRatios.slice(-LIMIT).reverse().map(([text, value]) => ({ text, value: 1 / value }));
  
    return { person1, person2, topWords1, topWords2 };
  };
  