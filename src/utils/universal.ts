import { parse as chronoparse } from 'chrono-node'
import { OpenAI } from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { regexes } from './regexes'
import { ChatMessage } from './types'

// Set up OpenAI client
const client = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only use this if you're certain it's safe for your use case
})

// Define types
const RegexResponse = z.object({
  user1: z.string(),
  user2: z.string(),
  regex_pattern: z.string(),
})

type RegexResponseType = z.infer<typeof RegexResponse>

// Helper functions
function clean(text: string): string {
  return text.replace(
    /http\S+|www\S+|https\S+|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}/gu,
    ''
  )
}

async function getParsingInfoFromLLM(
  contentSample: string
): Promise<RegexResponseType> {
  console.log('Requesting parsing information from LLM')
  const prompt = `
    Analyze the following chat transcript sample and provide the following information:
    1. The names of the two main users in the conversation.
    2. A JavaScript regex pattern to extract the timestamp, user, and message content.
    Chat transcript sample:
    ${contentSample}
    Provide your answer in the following JSON format:
    {
        "user1": "Name1",
        "user2": "Name2",
        "regex_pattern": "your_regex_pattern_here"
    }
    
    Instructions for the regex pattern:
    - Use named groups for 'timestamp', 'user', and 'message'.
    - The pattern should match the entire line, including the timestamp and user name.
    - Ensure the pattern accounts for variations in time format (e.g., "7:07 p.m." or "19:07").
    - Same goes for date format (for example, months/days could be 1 or 2 digits). Better to be too flexible than too strict.
    - The 'message' group should capture the entire message, including any punctuation or special characters.
    - Do not include the 'r' prefix in the regex pattern string.
    Example regex pattern (adjust as needed):
    "(?<timestamp>\\d{4}-\\d{2}-\\d{2},\\s\\d{1,2}:\\d{2}\\s(?:AM|PM))\\s-\\s(?<user>[^:]+):\\s(?<message>.*)"
  `

  const response = await client.beta.chat.completions.parse({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that analyzes chat transcripts.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: zodResponseFormat(RegexResponse, 'regexResponse'),
    temperature: 0,
  })

  const message = response.choices[0]?.message

  if (message?.parsed) {
    return message.parsed
  }
  throw new Error('Unexpected response from OpenAI API')
}

async function parse(chatText: string): Promise<ChatMessage[]> {
  // check if anything in regexes matches the chatText
  let pattern = null
  for (const regex of regexes) {
    if (chatText.match(new RegExp(regex, 'gm'))) {
      pattern = regex
      break
    } else {
      console.log('No match for regex:', regex)
    }
  }
  if (!pattern) {
    console.log('Getting parsing information from LLM')
    const llmResponse = await getParsingInfoFromLLM(chatText.slice(0, 3000))
    console.log('LLM response:', llmResponse)
    pattern = llmResponse.regex_pattern
  }
  console.log('Using pattern:', pattern)
  console.log('Chat text:', chatText)

  const matches = chatText.matchAll(new RegExp(pattern, 'gm'))
  console.log('Matches:', matches)
  const parsedData: ChatMessage[] = []

  for (const match of matches) {
    if (match.groups) {
      const { timestamp, user, message } = match.groups
      try {
        parsedData.push({
          user,
          message: clean(message),
          date: chronoparse(timestamp)[0].start.date(),
        })
      } catch (error) {
        console.error('Error parsing timestamp: ', timestamp, error)
      }
    }
  }
  console.log('Parsed chat data:', parsedData)
  return parsedData
}

export { parse }
