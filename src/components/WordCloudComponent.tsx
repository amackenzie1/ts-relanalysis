import axios from 'axios'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import WordCloud from 'react-d3-cloud'

interface WordCloudComponentProps {
  analysisResult: {
    person1: string
    person2: string
    topWords1: { text: string; value: number }[]
    topWords2: { text: string; value: number }[]
  }
  color1: string
  color2: string
}

interface Word {
  text: string
  value: number
}

interface WordItem extends Word {
  ratio: number
}

// Simple in-memory cache
const cache: { [key: string]: string[] } = {}

const WordCloudComponent: React.FC<WordCloudComponentProps> = React.memo(
  ({ analysisResult, color1, color2 }) => {
    const [filteredWords, setFilteredWords] = useState<{
      topWords1: WordItem[]
      topWords2: WordItem[]
    }>({ topWords1: [], topWords2: [] })

    const createAdaptiveChunks = useCallback(
      (words: string[], chunkSize = 70): string[][] => {
        const chunks: string[][] = []
        for (let i = 0; i < words.length; i += chunkSize) {
          chunks.push(words.slice(i, i + chunkSize))
        }
        return chunks
      },
      []
    )

    const createPrompt = useCallback((words: string[]): string => {
      return `Filter this list of words, removing insignificant entries such as conjunctions, variations of "ok", "k", or random numbers. Be very judicious in what words you remove. Nouns, Verbs and adjectives should almost always be kept. Slang that lends personality to the person should also be kept. In the end any word that seems unique to that person in the chat should NOT BE REMOVED. Keep the original ratios and values for the words you retain. Format the output as a plain text space-separated list of words.

      Words: ${words.join(' ')}`
    }, [])

    const processChunk = useCallback(
      async (chunk: string[], apiKey: string): Promise<string[]> => {
        const cacheKey = chunk.join(',')
        if (cache[cacheKey]) {
          console.log('Cache hit for chunk')
          return cache[cacheKey]
        }

        const prompt = createPrompt(chunk)
        try {
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            }
          )
          const result = response.data.choices[0].message.content.trim().split(' ')
          cache[cacheKey] = result
          return result
        } catch (error) {
          console.error('Error processing chunk:', error)
          return []
        }
      },
      [createPrompt]
    )

    const filterWords = useCallback(
      (words: WordItem[], wordsToKeep: Set<string>): WordItem[] => {
        return words.filter((word) => wordsToKeep.has(word.text))
      },
      []
    )

    const performAnalysis = useMemo(() => async () => {
      console.log('Starting word cloud analysis')
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY
      if (!apiKey) {
        console.error('OpenAI API key is not defined')
        return null
      }

      const wordRatios: WordItem[] = [
        ...analysisResult.topWords1,
        ...analysisResult.topWords2,
      ].map((word) => ({
        ...word,
        ratio:
          (analysisResult.topWords1.find((w) => w.text === word.text)
            ?.value || 0 + 1) /
          (analysisResult.topWords2.find((w) => w.text === word.text)
            ?.value || 0 + 1),
      }))

      const allWords = wordRatios.map((w) => w.text)
      const chunks = createAdaptiveChunks(allWords)
      console.log('Number of chunks:', chunks.length)

      const processedChunks = await Promise.all(
        chunks.map((chunk, index) =>
          processChunk(chunk, apiKey).then((result) => {
            console.log(`Processed chunk ${index + 1}/${chunks.length}`)
            return result
          })
        )
      )

      const wordsToKeep: Set<string> = new Set(processedChunks.flat())
      console.log('Words to keep:', wordsToKeep.size)

      const filteredWordRatios = filterWords(wordRatios, wordsToKeep)

      const topWords1 = filteredWordRatios
        .filter((w) => w.ratio > 1)
        .slice(0, 50)
      const topWords2 = filteredWordRatios
        .filter((w) => w.ratio <= 1)
        .slice(-50)
        .map((w) => ({ ...w, ratio: 1 / w.ratio }))

      console.log(
        'Final word counts - Person 1:',
        topWords1.length,
        'Person 2:',
        topWords2.length
      )
      return { topWords1, topWords2 }
    }, [analysisResult, createAdaptiveChunks, processChunk, filterWords])

    useEffect(() => {
      performAnalysis().then((result) => {
        if (result) {
          setFilteredWords(result)
        }
      })
    }, [performAnalysis])

    const normalizedWords = useMemo(() => {
      const normalizeSet = (words: WordItem[]): Word[] => {
        const ratios = words.map((w) => w.ratio)
        const minRatio = Math.min(...ratios)
        const maxRatio = Math.max(...ratios)
        return words.map((word) => ({
          text: word.text,
          value: (word.ratio - minRatio) / (maxRatio - minRatio),
        }))
      }

      return {
        topWords1: normalizeSet(filteredWords.topWords1),
        topWords2: normalizeSet(filteredWords.topWords2),
      }
    }, [filteredWords])

    const fontSizeMapper = useCallback((word: Word) => {
      return Math.sqrt(word.value) * 80 + 16
    }, [])

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          margin: '20px 0',
        }}
      >
        {[
          {
            person: analysisResult.person1,
            words: normalizedWords.topWords1,
            color: color1,
          },
          {
            person: analysisResult.person2,
            words: normalizedWords.topWords2,
            color: color2,
          },
        ].map(({ person, words, color }) => (
          <div key={person} style={{ minWidth: '48%', margin: '10px' }}>
            <h3 style={{ textAlign: 'center', color: '#555' }}>
              {person}'s Top Words
            </h3>
            <div
              style={{
                width: '100%',
                border: `2px solid ${color}`,
                borderRadius: '8px',
                padding: '2px',
                boxSizing: 'border-box',
              }}
            >
              <WordCloud
                data={words}
                fontSize={fontSizeMapper}
                rotate={0}
                padding={2}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }
)

export default WordCloudComponent