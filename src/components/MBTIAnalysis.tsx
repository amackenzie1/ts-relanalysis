import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { ChatMessage } from '../utils/types'
import LetterDisplay from './LetterDisplay'

interface AnalysisResult {
  finalPredictions: { [key: string]: string }
  significances: { [key: string]: string[] }
  gptDescriptions: { [key: string]: string }
  chunkCount: number
}

interface MBTIAnalysisProps {
  parsedData: ChatMessage[]
}

const MBTIAnalysis: React.FC<MBTIAnalysisProps> = ({ parsedData }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (parsedData) {
      performAnalysis()
    }
  }, [parsedData])

  const performAnalysis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key is not defined')
      }

      const chunks = createAdaptiveChunks(parsedData)
      const predictions = await processChunks(chunks, apiKey)
      const result = await calculateFinalPredictions(predictions, apiKey)
      setAnalysis({ ...result, chunkCount: chunks.length })
    } catch (err) {
      setError('An error occurred during analysis. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const createAdaptiveChunks = (
    messages: ChatMessage[],
    targetChunkCount = 100,
    minMessagesPerParticipant = 3
  ): [number, number][] => {
    const totalMessages = messages.length
    const initialChunkSize = Math.max(
      Math.ceil(totalMessages / targetChunkCount),
      minMessagesPerParticipant * 2
    )
    const chunks: [number, number][] = []

    let start = 0
    while (start < totalMessages) {
      let end = Math.min(start + initialChunkSize, totalMessages)
      const participantCounts: { [key: string]: number } = {}

      for (let i = start; i < end; i++) {
        const user = messages[i].user
        participantCounts[user] = (participantCounts[user] || 0) + 1
      }

      const extensionLimit = Math.min(initialChunkSize, totalMessages - end)
      for (let i = 0; i < extensionLimit; i++) {
        if (
          Object.values(participantCounts).every(
            (count) => count >= minMessagesPerParticipant
          )
        )
          break
        if (end + i < totalMessages) {
          const user = messages[end + i].user
          participantCounts[user] = (participantCounts[user] || 0) + 1
          end = end + i + 1
        }
      }

      chunks.push([start, end])
      start = end
    }

    return chunks
  }

  const createPrompt = (
    messages: ChatMessage[],
    start: number,
    end: number
  ): string => {
    let prompt =
      'Analyze the following WhatsApp conversation chunk and predict the MBTI personality types of the participants. Provide only the MBTI type for each participant:\n\n'
    for (let i = start; i < end; i++) {
      prompt += `${messages[i].user}: ${messages[i].message}\n`
    }
    prompt +=
      "\nBased on these messages, what are the likely MBTI types of each participant? Provide only the MBTI type for each participant. Always use the user's full name, exactly as it appears in the messages."
    return prompt
  }

  const processChunks = async (
    chunks: [number, number][],
    apiKey: string
  ): Promise<string[]> => {
    const chunkPredictions = await Promise.all(
      chunks.map(async (chunk) => {
        const [start, end] = chunk
        const prompt = createPrompt(parsedData, start, end)

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

          return response.data.choices[0].message.content
        } catch (error) {
          console.error('Error processing chunk:', error)
          return null
        }
      })
    )

    return chunkPredictions.filter(
      (prediction): prediction is string => prediction !== null
    )
  }

  const calculateFinalPredictions = async (
    predictions: string[],
    apiKey: string
  ): Promise<Omit<AnalysisResult, 'chunkCount'>> => {
    const allPredictions: { [key: string]: string[] } = {}
    const validMBTITypes = [
      'ISTJ',
      'ISFJ',
      'INFJ',
      'INTJ',
      'ISTP',
      'ISFP',
      'INFP',
      'INTP',
      'ESTP',
      'ESFP',
      'ENFP',
      'ENTP',
      'ESTJ',
      'ESFJ',
      'ENFJ',
      'ENTJ',
    ]

    predictions.forEach((prediction) => {
      prediction.split('\n').forEach((line) => {
        if (line.includes(':')) {
          const [participant, mbti] = line.split(':').map((s) => s.trim())
          if (validMBTITypes.includes(mbti)) {
            if (!allPredictions[participant]) allPredictions[participant] = []
            allPredictions[participant].push(mbti)
          }
        }
      })
    })

    const finalPredictions: { [key: string]: string } = {}
    const significances: { [key: string]: string[] } = {}
    const gptDescriptions: { [key: string]: string } = {}

    for (const [participant, mbtiList] of Object.entries(allPredictions)) {
      const letterCounts = countMbtiLetters(mbtiList)
      const [mbtiType, significance] =
        determineFinalMbtiWithSignificance(letterCounts)
      finalPredictions[participant] = mbtiType
      significances[participant] = significance
    }

    return { finalPredictions, significances, gptDescriptions }
  }

  const countMbtiLetters = (mbtiList: string[]): { [key: string]: number } => {
    const letterCounts: { [key: string]: number } = {
      E: 0,
      I: 0,
      N: 0,
      S: 0,
      T: 0,
      F: 0,
      J: 0,
      P: 0,
    }
    mbtiList.forEach((mbti) => {
      mbti.split('').forEach((letter) => {
        if (letter in letterCounts) letterCounts[letter]++
      })
    })
    return letterCounts
  }

  const isSignificantDifference = (
    count1: number,
    count2: number,
    alpha = 0.3
  ): boolean => {
    const total = count1 + count2
    if (total === 0) return false
    const pValue = 1 - Math.abs(0.5 - count1 / total) * 2
    return pValue < alpha
  }

  const determineFinalMbtiWithSignificance = (letterCounts: {
    [key: string]: number
  }): [string, string[]] => {
    let finalMbti = ''
    const significance: string[] = []

    const pairs = [
      ['E', 'I'],
      ['N', 'S'],
      ['T', 'F'],
      ['J', 'P'],
    ]
    pairs.forEach(([a, b]) => {
      const countA = letterCounts[a]
      const countB = letterCounts[b]
      finalMbti += countA > countB ? a : b

      significance.push(
        `${countA > countB ? a : b} - ${Math.max(countA, countB)}/${
          countA + countB
        } `
      )
    })

    return [finalMbti, significance]
  }

  const MBTIDisplay = ({
    mbtiData,
  }: {
    mbtiData: { [key: string]: { type: string; significance: string[] } }
  }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
      }}
    >
      {Object.entries(mbtiData).map(([name, data]) => (
        <div key={name} className="flex-1 text-center">
          <div
            className="text-xl font-semibold mb-2"
            style={{ textAlign: 'center', paddingBottom: '1rem' }}
          >
            {name}
          </div>
          <div
            className="text-[20vw] font-bold leading-none"
            style={{ fontSize: '8rem', display: 'flex', flexDirection: 'row' }}
          >
            {data.type.split('').map((letter, index) => (
              <LetterDisplay
                key={index}
                letter={letter}
                type={data.type}
                significance={data.significance}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  if (isLoading) return <div>Analyzing MBTI types...</div>
  if (error) return <div>{error}</div>
  if (!analysis) return null

  const mbtiData = Object.entries(analysis.finalPredictions).reduce(
    (acc, [name, type]) => {
      acc[name] = {
        type,
        significance: analysis.significances[name] || [],
      }
      return acc
    },
    {} as { [key: string]: { type: string; significance: string[] } }
  )

  return <MBTIDisplay mbtiData={mbtiData} />
}

export default MBTIAnalysis
