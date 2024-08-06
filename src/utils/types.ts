export type ChatMessage = {
  person: string,
  message: string,
  date: Date,
  extra?: MessageExtra
} 

export type MessageExtra = {
    sentiment: number
} 