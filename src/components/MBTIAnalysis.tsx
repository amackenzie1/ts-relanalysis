import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChatMessage } from '../utils/types';

interface AnalysisResult {
  finalPredictions: { [key: string]: string };
  significances: { [key: string]: string[] };
  gptDescriptions: { [key: string]: string };
  chunkCount: number;
}

interface MBTIAnalysisProps {
  parsedData: ChatMessage[];
}

const MBTIAnalysis: React.FC<MBTIAnalysisProps> = ({ parsedData }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parsedData) {
      performAnalysis();
    }
  }, [parsedData]);

  const performAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not defined');
      }
      const chunks = createAdaptiveChunks(parsedData);
      const predictions = await processChunks(chunks, apiKey);
      const result = await calculateFinalPredictions(predictions, apiKey);
      setAnalysis({ ...result, chunkCount: chunks.length });
    } catch (err) {
      setError('An error occurred during analysis. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createAdaptiveChunks = (messages: ChatMessage[], targetChunkCount = 100, minMessagesPerParticipant = 3): [number, number][] => {
    const totalMessages = messages.length;
    const initialChunkSize = Math.max(Math.ceil(totalMessages / targetChunkCount), minMessagesPerParticipant * 2);
    const chunks: [number, number][] = [];
    
    let start = 0;
    while (start < totalMessages) {
      let end = Math.min(start + initialChunkSize, totalMessages);
      const participantCounts: { [key: string]: number } = {};
      
      for (let i = start; i < end; i++) {
        const user = messages[i].user;
        participantCounts[user] = (participantCounts[user] || 0) + 1;
      }
      
      const extensionLimit = Math.min(initialChunkSize, totalMessages - end);
      for (let i = 0; i < extensionLimit; i++) {
        if (Object.values(participantCounts).every(count => count >= minMessagesPerParticipant)) break;
        if (end + i < totalMessages) {
          const user = messages[end + i].user;
          participantCounts[user] = (participantCounts[user] || 0) + 1;
          end = end + i + 1;
        }
      }
      
      chunks.push([start, end]);
      start = end;
    }
    
    return chunks;
  };

  const createPrompt = (messages: ChatMessage[], start: number, end: number): string => {
    let prompt = "Analyze the following WhatsApp conversation chunk and predict the MBTI personality types of the participants. Provide only the MBTI type for each participant:\n\n";
    for (let i = start; i < end; i++) {
      prompt += `${messages[i].user}: ${messages[i].message}\n`;
    }
    prompt += "\nBased on these messages, what are the likely MBTI types of each participant? Provide only the MBTI type for each participant.";
    return prompt;
  };

  const processChunks = async (chunks: [number, number][], apiKey: string): Promise<string[]> => {
    const chunkPredictions = await Promise.all(chunks.map(async chunk => {
      const [start, end] = chunk;
      const prompt = createPrompt(parsedData, start, end);
      
      try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        return response.data.choices[0].message.content;
      } catch (error) {
        console.error('Error processing chunk:', error);
        return null;
      }
    }));

    return chunkPredictions.filter((prediction): prediction is string => prediction !== null);
  };

  const calculateFinalPredictions = async (predictions: string[], apiKey: string): Promise<Omit<AnalysisResult, 'chunkCount'>> => {
    const allPredictions: { [key: string]: string[] } = {};
    const validMBTITypes = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'];
    
    predictions.forEach(prediction => {
      prediction.split('\n').forEach(line => {
        if (line.includes(':')) {
          const [participant, mbti] = line.split(':').map(s => s.trim());
          if (validMBTITypes.includes(mbti)) {
            if (!allPredictions[participant]) allPredictions[participant] = [];
            allPredictions[participant].push(mbti);
          }
        }
      });
    });

    const finalPredictions: { [key: string]: string } = {};
    const significances: { [key: string]: string[] } = {};
    const gptDescriptions: { [key: string]: string } = {};

    for (const [participant, mbtiList] of Object.entries(allPredictions)) {
      const letterCounts = countMbtiLetters(mbtiList);
      const [mbtiType, significance] = determineFinalMbtiWithSignificance(letterCounts);
      finalPredictions[participant] = mbtiType;
      significances[participant] = significance;
      
      // Get GPT description for the MBTI type
      gptDescriptions[participant] = await getGPTDescription(mbtiType, apiKey);
    }

    return { finalPredictions, significances, gptDescriptions };
  };

  const countMbtiLetters = (mbtiList: string[]): { [key: string]: number } => {
    const letterCounts: { [key: string]: number } = { E: 0, I: 0, N: 0, S: 0, T: 0, F: 0, J: 0, P: 0 };
    mbtiList.forEach(mbti => {
      mbti.split('').forEach(letter => {
        if (letter in letterCounts) letterCounts[letter]++;
      });
    });
    return letterCounts;
  };

  const isSignificantDifference = (count1: number, count2: number, alpha = 0.3): boolean => {
    const total = count1 + count2;
    if (total === 0) return false;
    const pValue = 1 - Math.abs(0.5 - count1 / total) * 2;
    return pValue < alpha;
  };

  const determineFinalMbtiWithSignificance = (letterCounts: { [key: string]: number }): [string, string[]] => {
    let finalMbti = "";
    const significance: string[] = [];
    
    const pairs = [['E', 'I'], ['N', 'S'], ['T', 'F'], ['J', 'P']];
    pairs.forEach(([a, b]) => {
      const countA = letterCounts[a];
      const countB = letterCounts[b];
      finalMbti += countA > countB ? a : b;
      
      if (!isSignificantDifference(countA, countB)) {
        significance.push(`${a}/${b}`);
      }
    });
    
    return [finalMbti, significance];
  };

  const getGPTDescription = async (mbtiType: string, apiKey: string): Promise<string> => {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Provide a brief, insightful description of the ${mbtiType} personality type, including key traits, strengths, and potential weaknesses. Limit to 3-4 sentences.` }],
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error fetching GPT description:', error);
      return "Unable to generate description.";
    }
  };

  if (isLoading) return <div>Analyzing MBTI types...</div>;
  if (error) return <div>{error}</div>;
  if (!analysis) return null;

  const traits: { [key: string]: { positives: string[], negatives: string[], description: string } } = {
    ISTJ: {
      positives: ['Reliable', 'Practical', 'Organized'],
      negatives: ['Stubborn', 'Insensitive', 'Judgmental'],
      description: "ISTJs are dutiful, practical, and committed to traditions. They excel in creating and maintaining order but may struggle with change and emotional expression."
    },
    ISFJ: {
      positives: ['Supportive', 'Reliable', 'Observant'],
      negatives: ['Overworked', 'Shy', 'Inflexible'],
      description: "ISFJs are caring, loyal, and detail-oriented. They thrive in nurturing roles but might have difficulty saying no or adapting to rapid changes."
    },
    INFJ: {
      positives: ['Insightful', 'Idealistic', 'Creative'],
      negatives: ['Perfectionist', 'Sensitive', 'Burnout-prone'],
      description: "INFJs are idealistic, empathetic, and deeply intuitive. They have a strong sense of purpose but may struggle with perfectionism and feeling misunderstood."
    },
    INTJ: {
      positives: ['Strategic', 'Independent', 'Innovative'],
      negatives: ['Arrogant', 'Overly critical', 'Socially detached'],
      description: "INTJs are analytical, strategic, and confident in their knowledge. They excel at complex problem-solving but may come across as aloof or overly critical."
    },
    ISTP: {
      positives: ['Adaptable', 'Practical', 'Resourceful'],
      negatives: ['Unpredictable', 'Detached', 'Risk-prone'],
      description: "ISTPs are skilled troubleshooters with a knack for understanding how things work. They value freedom and may struggle with long-term commitments or emotional expression."
    },
    ISFP: {
      positives: ['Artistic', 'Adaptable', 'Compassionate'],
      negatives: ['Overly competitive', 'Easily stressed', 'Conflict-avoidant'],
      description: "ISFPs are creative, sensitive, and in tune with their surroundings. They live in the moment but may have difficulty with long-term planning and confrontation."
    },
    INFP: {
      positives: ['Idealistic', 'Empathetic', 'Creative'],
      negatives: ['Impractical', 'Self-isolating', 'Overly sensitive'],
      description: "INFPs are imaginative, empathetic, and driven by their values. They seek to understand themselves and others deeply but may struggle with criticism and practical matters."
    },
    INTP: {
      positives: ['Analytical', 'Original', 'Open-minded'],
      negatives: ['Insensitive', 'Absent-minded', 'Procrastinating'],
      description: "INTPs are logical, creative problem-solvers with a thirst for knowledge. They excel in theoretical and analytical fields but may overlook emotional considerations and practical details."
    },
    ESTP: {
      positives: ['Energetic', 'Practical', 'Adaptable'],
      negatives: ['Impatient', 'Risk-prone', 'Insensitive'],
      description: "ESTPs are action-oriented, adaptable, and enjoy living on the edge. They excel in crisis management but may struggle with long-term planning and emotional situations."
    },
    ESFP: {
      positives: ['Enthusiastic', 'Spontaneous', 'Friendly'],
      negatives: ['Easily bored', 'Unfocused', 'Conflict-avoidant'],
      description: "ESFPs are vivacious, fun-loving, and enjoy being the center of attention. They live in the moment but may have difficulty with serious planning and following through on commitments."
    },
    ENFP: {
      positives: ['Enthusiastic', 'Creative', 'Sociable'],
      negatives: ['Disorganized', 'Overly optimistic', 'Unfocused'],
      description: "ENFPs are charismatic, imaginative, and driven by their enthusiasm. They excel at generating ideas but may struggle with follow-through and practical details."
    },
    ENTP: {
      positives: ['Innovative', 'Adaptable', 'Charismatic'],
      negatives: ['Argumentative', 'Insensitive', 'Unfocused'],
      description: "ENTPs are quick-thinking, charismatic idea generators. They thrive on intellectual challenges but may neglect practical matters and others' feelings in pursuit of their ideas."
    },
    ESTJ: {
      positives: ['Organized', 'Practical', 'Reliable'],
      negatives: ['Inflexible', 'Judgmental', 'Stubborn'],
      description: "ESTJs are efficient, structured, and excel at implementing systems. They are natural leaders but may struggle with change and considering others' feelings in decision-making."
    },
    ESFJ: {
      positives: ['Cooperative', 'Loyal', 'Warm'],
      negatives: ['Needy', 'Inflexible', 'Self-sacrificing'],
      description: "ESFJs are caring, social, and value harmony. They excel in creating and maintaining order in their environment but may be overly sensitive to criticism and neglect their own needs."
    },
    ENFJ: {
      positives: ['Charismatic', 'Empathetic', 'Inspiring'],
      negatives: ['Overly idealistic', 'Approval-seeking', 'Controlling'],
      description: "ENFJs are charismatic leaders with a strong sense of idealism. They excel at motivating others but may struggle with being overly selfless and sensitive to criticism."
    },
    ENTJ: {
      positives: ['Strategic', 'Confident', 'Efficient'],
      negatives: ['Domineering', 'Impatient', 'Cold'],
      description: "ENTJs are natural leaders with a talent for strategy and efficiency. They excel in organizing and implementing long-term plans but may come across as overly blunt or insensitive."
    }
  };

  return (
    <div className="mbti-analysis-container p-4 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">MBTI Analysis Results</h2>
      <div className="flex flex-wrap justify-between">
        {Object.entries(analysis.finalPredictions).map(([participant, mbtiType]) => (
          <div key={participant} className="w-full md:w-[48%] mb-8">
            <h3 className="text-xl font-semibold mb-2">{participant}</h3>
            <p className="mb-2">
              MBTI Classification: {mbtiType}
              {analysis.significances[participant] && analysis.significances[participant].length > 0 && (
                <span className="text-sm text-gray-600">
                  {' '}(between {analysis.significances[participant].join(' and ')})
                </span>
              )}
            </p>
            <div className="bg-white p-4 rounded shadow-sm mb-4">
              <h4 className="text-lg font-medium mb-2">Predefined Description</h4>
              <p className="mb-2">{traits[mbtiType].description}</p>
              <div className="flex mb-2">
                <div className="w-1/2">
                  <h5 className="font-medium">Strengths:</h5>
                  <ul className="list-disc list-inside">
                    {traits[mbtiType].positives.map((trait, index) => (
                      <li key={index}>{trait}</li>
                    ))}
                  </ul>
                </div>
                <div className="w-1/2">
                  <h5 className="font-medium">Potential Weaknesses:</h5>
                  <ul className="list-disc list-inside">
                    {traits[mbtiType].negatives.map((trait, index) => (
                      <li key={index}>{trait}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded shadow-sm">
              <h4 className="text-lg font-medium mb-2">GPT-Generated Description</h4>
              <p>{analysis.gptDescriptions[participant] || "Unable to generate description."}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MBTIAnalysis;