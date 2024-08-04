// src/utils/textAnalysis.ts

import Sentiment from 'sentiment';

// Define the interface for the analysis result
interface AnalysisResult {
  person1: string;
  person2: string;
  topWords1: { text: string; value: number }[];
  topWords2: { text: string; value: number }[];
  sentiment1: { week: string; sentiment: number }[];
  sentiment2: { week: string; sentiment: number }[];
}

export const analyzeText = (content: string): AnalysisResult => {
  const LIMIT = 100;
  const lines = content.split('\n');
  const names = new Set<string>();
  const wordRegex = /\b\w+\b/gi;
  const sentimentAnalyzer = new Sentiment();

  // Extract names
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
  const sentimentScores1: { date: string; score: number }[] = [];
  const sentimentScores2: { date: string; score: number }[] = [];

  // Process lines for words and sentiment
  lines.forEach((line) => {
    const match = line.match(/\[(.+?)\] (.+?): (.+)/);
    if (match) {
      const [_, date, name, message] = match;
      const extractedWords = message.toLowerCase().match(wordRegex) || [];
      const sentimentScore = sentimentAnalyzer.analyze(message).score;
      if (name === person1) {
        words1.push(...extractedWords);
        sentimentScores1.push({ date, score: sentimentScore });
      } else if (name === person2) {
        words2.push(...extractedWords);
        sentimentScores2.push({ date, score: sentimentScore });
      }
    }
  });

  // Word counting
  const count1 = words1.reduce(
    (acc, word) => ({ ...acc, [word]: (acc[word] || 0) + 1 }),
    {} as Record<string, number>
  );
  const count2 = words2.reduce(
    (acc, word) => ({ ...acc, [word]: (acc[word] || 0) + 1 }),
    {} as Record<string, number>
  );

  // Word ratio calculation
  const allWords = new Set([...Object.keys(count1), ...Object.keys(count2)]);
  const ratios: Record<string, number> = {};

  allWords.forEach((word) => {
    const c1 = count1[word] || 0;
    const c2 = count2[word] || 0;
    ratios[word] = (c1 + 1) / (c2 + 1);
  });

  // Sort and select top words
  const sortedRatios = Object.entries(ratios).sort((a, b) => b[1] - a[1]);
  const topWords1 = sortedRatios.slice(0, LIMIT).map(([text, value]) => ({ text, value }));
  const topWords2 = sortedRatios.slice(-LIMIT).reverse().map(([text, value]) => ({ text, value: 1 / value }));

  // Calculate weekly sentiment averages
  const calculateWeeklyAverage = (scores: { date: string; score: number }[]) => {
    const weeklySentiment: Record<string, { score: number; count: number }> = {};

    scores.forEach(({ date, score }) => {
      const week = new Date(date).toISOString().substring(0, 10); // Format as "YYYY-MM-DD"
      if (!weeklySentiment[week]) {
        weeklySentiment[week] = { score: 0, count: 0 };
      }
      weeklySentiment[week].score += score;
      weeklySentiment[week].count += 1;
    });

    return Object.entries(weeklySentiment).map(([week, { score, count }]) => ({
      week,
      sentiment: score / count,
    }));
  };

  const sentiment1 = calculateWeeklyAverage(sentimentScores1);
  const sentiment2 = calculateWeeklyAverage(sentimentScores2);

  return { person1, person2, topWords1, topWords2, sentiment1, sentiment2 };
};
