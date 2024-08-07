import { ChatMessage } from './types'

interface AnalysisResult {
  person1: string
  person2: string
  topWords1: { text: string; value: number }[]
  topWords2: { text: string; value: number }[]
  sentiment1: { week: string; sentiment: number }[]
  sentiment2: { week: string; sentiment: number }[]
}

export const analyzeText = (messages: ChatMessage[]): AnalysisResult => {
  const LIMIT = 100
  const names = new Set<string>()
  const wordRegex = /\b[a-z]+\b/gi

  // Use a Map for faster lookups and insertions
  const count1 = new Map<string, number>()
  const count2 = new Map<string, number>()

  // Process messages in a single pass
  messages.forEach(({ message, user }) => {
    if (user) names.add(user)

    const words = message.toLowerCase().match(wordRegex) || []
    const countMap = user === Array.from(names)[0] ? count1 : count2

    words.forEach((word) => {
      if (!/\d/.test(word)) {
        countMap.set(word, (countMap.get(word) || 0) + 1)
      }
    })
  })

  if (names.size < 2) {
    throw new Error('Could not identify two distinct persons in the chat')
  }

  const [person1, person2] = Array.from(names)

  // Calculate ratios and sort in a single pass
  const ratios: [string, number][] = []
  const allWords = new Set([...count1.keys(), ...count2.keys()])

  allWords.forEach((word) => {
    const c1 = count1.get(word) || 0
    const c2 = count2.get(word) || 0
    ratios.push([word, (c1 + 1) / (c2 + 1)])
  })

  ratios.sort((a, b) => b[1] - a[1])

  // Extract top words
  const topWords1 = ratios
    .slice(0, LIMIT)
    .map(([text, value]) => ({ text, value }))
  const topWords2 = ratios
    .slice(-LIMIT)
    .reverse()
    .map(([text, value]) => ({ text, value: 1 / value }))

  return {
    person1,
    person2,
    topWords1,
    topWords2,
    sentiment1: [],
    sentiment2: [],
  }
}
