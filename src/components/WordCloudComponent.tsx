import React, { useMemo, useEffect, useState } from 'react';
import WordCloud from 'react-d3-cloud';
import axios from 'axios';

interface WordCloudComponentProps {
  analysisResult: {
    person1: string;
    person2: string;
    topWords1: { text: string; value: number }[];
    topWords2: { text: string; value: number }[];
  };
  color1: string;
  color2: string;
}

interface WordItem {
  text: string;
  value: number;
  ratio?: number;
  normalizedValue?: number;
}

const WordCloudComponent: React.FC<WordCloudComponentProps> = React.memo(
  ({ analysisResult, color1, color2 }) => {
    const [filteredWords, setFilteredWords] = useState<{
      topWords1: WordItem[];
      topWords2: WordItem[];
    }>({ topWords1: [], topWords2: [] });

    const cleanAndParseJSON = (text: string): any => {
      const cleanedText = text.replace(/```json\n|\n```/g, '');
      try {
        return JSON.parse(cleanedText);
      } catch (error) {
        console.error('Error parsing cleaned JSON:', error);
        console.log('Cleaned text that failed to parse:', cleanedText);
        return null;
      }
    };

    useEffect(() => {
      const filterWordsWithGPT = async () => {
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
        if (!apiKey) {
          console.error('OpenAI API key is not defined');
          return;
        }

        // Create a map of words to their counts for each person
        const wordMap1 = new Map(analysisResult.topWords1.map(w => [w.text, w.value]));
        const wordMap2 = new Map(analysisResult.topWords2.map(w => [w.text, w.value]));

        // Calculate ratios
        const allWords = new Set([...wordMap1.keys(), ...wordMap2.keys()]);
        const wordRatios: WordItem[] = Array.from(allWords).map(word => {
          const count1 = wordMap1.get(word) || 0;
          const count2 = wordMap2.get(word) || 0;
          const ratio = (count1 + 1) / (count2 + 1);
          return { text: word, value: Math.max(count1, count2), ratio };
        });

        // Sort by ratio and get top and bottom 100
        wordRatios.sort((a, b) => b.ratio! - a.ratio!);
        const topBottom100 = [...wordRatios.slice(0, 100), ...wordRatios.slice(-100)];

        try {
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful assistant that filters and refines word lists for word clouds. Respond with only the JSON output, no additional text.'
                },
                {
                  role: 'user',
                  content: `Please filter this list of words, removing insignificant entries such as conjunctions, variations of "ok", "k", or random numbers. Return only words that are somewhat unique (names are ok). Keep the original ratios for the words you retain. Format the output as a JSON array of objects with "text" and "ratio" properties.

                  Words: ${JSON.stringify(topBottom100)}`
                }
              ],
              temperature: 0,
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const cleanedResponse = cleanAndParseJSON(response.data.choices[0].message.content) as WordItem[];
          if (!cleanedResponse) {
            throw new Error('Failed to parse GPT response');
          }

          // Sort filtered words by ratio
          cleanedResponse.sort((a, b) => b.ratio! - a.ratio!);

          // Select top 50 for person1 and bottom 50 for person2
          const topWords1 = cleanedResponse.slice(0, 50);
          const topWords2 = cleanedResponse.slice(-50).map((word: WordItem) => ({
            ...word,
            ratio: 1 / word.ratio! // Invert ratio for person2
          }));

          setFilteredWords({ topWords1, topWords2 });

          console.log("Filtered Word Lists:");
          console.log("Person 1:", topWords1);
          console.log("Person 2:", topWords2);

          // Log the filtered out words
          const filteredOutWords = topBottom100.filter(word => !cleanedResponse.find((w: WordItem) => w.text === word.text));
          console.log("Filtered out words:", filteredOutWords);

        } catch (error) {
          console.error('Error filtering words with GPT:', error);
          setFilteredWords({
            topWords1: analysisResult.topWords1.slice(0, 50),
            topWords2: analysisResult.topWords2.slice(0, 50)
          });
        }
      };

      filterWordsWithGPT();
    }, [analysisResult]);

    const normalizedWords = useMemo(() => {
      const normalizeSet = (words: WordItem[]) => {
        const ratios = words.map(w => w.ratio!);
        const minRatio = Math.min(...ratios);
        const maxRatio = Math.max(...ratios);
        return words.map(word => ({
          ...word,
          normalizedValue: (word.ratio! - minRatio) / (maxRatio - minRatio)
        }));
      };

      return {
        topWords1: normalizeSet(filteredWords.topWords1),
        topWords2: normalizeSet(filteredWords.topWords2),
      };
    }, [filteredWords]);

    const fontSizeMapper = (word: WordItem) => {
      return Math.sqrt(word.normalizedValue || 0) * 80 + 16;
    };

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          margin: '20px 0',
        }}
      >
        <div style={{ minWidth: '48%', margin: '10px' }}>
          <h3 style={{ textAlign: 'center', color: '#555' }}>
            {analysisResult.person1}'s Top Words
          </h3>
          <div
            style={{
              width: '100%',
              border: `2px solid ${color1}`,
              borderRadius: '8px',
              padding: '2px',
              boxSizing: 'border-box',
            }}
          >
            <WordCloud
              data={normalizedWords.topWords1}
              fontSize={fontSizeMapper}
              rotate={0}
              padding={2}
            />
          </div>
        </div>
        <div style={{ minWidth: '48%', margin: '10px' }}>
          <h3 style={{ textAlign: 'center', color: '#555' }}>
            {analysisResult.person2}'s Top Words
          </h3>
          <div
            style={{
              width: '100%',
              border: `2px solid ${color2}`,
              borderRadius: '8px',
              padding: '2px',
              boxSizing: 'border-box',
            }}
          >
            <WordCloud
              data={normalizedWords.topWords2}
              fontSize={fontSizeMapper}
              rotate={0}
              padding={2}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default WordCloudComponent;
