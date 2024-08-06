import { ChatMessage } from './types'

export const basic = (data: string): ChatMessage[] => {
  const messages: ChatMessage[] = []
  const regex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) <([^>]+)> (.+)/

  let currentMessage: ChatMessage | null = null

  data.split('\n').forEach((line) => {
    const match = line.match(regex)

    if (match) {
      if (currentMessage) {
        messages.push(currentMessage)
      }

      currentMessage = {
        date: new Date(match[1]),
        person: match[2],
        message: match[3],
      }
    } else if (currentMessage) {
      currentMessage.message += '\n' + line
    }
  })

  if (currentMessage) {
    messages.push(currentMessage)
  }

  return messages
}

export const basic_regex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) <([^>]+)> (.+)/