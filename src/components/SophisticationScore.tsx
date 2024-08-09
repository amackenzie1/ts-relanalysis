import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, YAxis, XAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChatMessage } from '../utils/types';

interface SophisticationScoreProps {
  chatData: ChatMessage[];
}

const SophisticationScore: React.FC<SophisticationScoreProps> = ({ chatData }) => {
  const [sophisticationData, setSophisticationData] = useState<{ name: string; score: number }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chatData.length > 0) {
      performAnalysis();
    }
  }, [chatData]);

  const performAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not defined');
      }

      // Get unique users
      const users = Array.from(new Set(chatData.map(msg => msg.user)));
      if (users.length !== 2) {
        setError('This analysis requires exactly two participants.');
        setIsLoading(false);
        return;
      }

      const person1 = users[0];
      const person2 = users[1];

      // Construct the conversation prompt
      const conversation = chatData.map(msg => `${msg.user}: ${msg.message}`).join('\n');
      const prompt = `
      Analyze the following conversation and return the number of grammatical errors for each participant in JSON format.
      Consider anything that isn't strictly a proper word, or grammatically correct an error. For example "ok" is considered a misspelling of "okay", lol is a grammatical error
      because it's not a word. Same for words like lol, or ahhah. BE VERY STRICT. ANY POSSIBLE KIND OF ERROR IS CONSIDERED A GRAMMATICAL ERROR.
      Even if the first word of a message is not capitalized that is considered a mispelling. If there's no question mark after a question that's an error. Using a number instead of spelling it out is an error.
      The ONLY exception is not using periods at the end of messages, that is fine. If a grammatical error is especially eggregious you can have it count as 2 (i.e. add 2 to the count of errors).
      The response should be in the following format:
      {
        "${person1}": number_of_misspellings,
        "${person2}": number_of_misspellings
      }

      Conversation:
      ${conversation}
      `;

      // Log the constructed prompt for debugging
      console.log('Constructed prompt:', prompt);

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an assistant that analyzes conversations for spelling accuracy.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Log the GPT response to the console for debugging
      const rawContent = response.data.choices[0].message.content;
      console.log('GPT response:', rawContent);

      // Remove backticks and parse JSON
      const jsonString = rawContent.replace(/```json|```/g, '').trim();
      const misspellings = JSON.parse(jsonString);
      console.log('Misspellings data:', misspellings);

      // Calculate total word counts
      const wordCounts = chatData.reduce((acc, msg) => {
        const wordCount = msg.message.split(/\s+/).length;
        acc[msg.user] = (acc[msg.user] || 0) + wordCount;
        return acc;
      }, {} as Record<string, number>);
      console.log('Word counts per user:', wordCounts);

      // Apply a more sensitive transformation to increase variability
      const scores = Object.keys(misspellings).map(user => {
        const totalWords = wordCounts[user] || 1; // Avoid division by zero
        const misspellingRatio = misspellings[user] / totalWords;
        console.log(`Misspelling ratio for ${user}:`, misspellingRatio);

        // Apply an adjusted transformation that increases sensitivity to misspellings
        const transformedRatio = Math.pow(misspellingRatio, 0.5); // Use a square root to reduce impact
        const sophisticationScore = 100 - transformedRatio * 100;

        return {
          name: user,
          score: Math.round(sophisticationScore * 100) / 100,
        };
      });

      console.log('Calculated sophistication scores:', scores);

      // Ensure the state is updated correctly
      setSophisticationData(scores);
      console.log('State updated with scores:', scores);
    } catch (err) {
      setError('An error occurred during analysis. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to interpolate between brown and purple
  const getBarColor = (score: number) => {
    // Brown to Purple gradient
    const startColor = [139, 69, 19]; // Brown (RGB: 139, 69, 19)
    const endColor = [128, 0, 128]; // Purple (RGB: 128, 0, 128)

    // Interpolation factor based on the score
    const t = score / 100;

    // Calculate the interpolated color
    const r = Math.round(startColor[0] + t * (endColor[0] - startColor[0]));
    const g = Math.round(startColor[1] + t * (endColor[1] - startColor[1]));
    const b = Math.round(startColor[2] + t * (endColor[2] - startColor[2]));

    return `rgb(${r}, ${g}, ${b})`;
  };

  if (isLoading) return <div>Calculating sophistication scores...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="sophistication-score" style={{ width: '50%', height: '400px' }}>
      <h2 className="text-2xl font-bold mb-4">Sophistication Score</h2>
      {sophisticationData.length > 0 ? (
        <ResponsiveContainer width="50%" height="75%">
          <BarChart
            layout="vertical"
            data={sophisticationData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" />
            <Tooltip formatter={(value: number) => `${value.toFixed(2)}`} />
            <Bar dataKey="score">
  {sophisticationData.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
  ))}
  <LabelList dataKey="score" position="right" />
</Bar>

          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div>No data available</div>
      )}
    </div>
  );
};

export default SophisticationScore;
