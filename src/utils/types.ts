export type ChatMessage = {
  user: string,
  message: string,
  date: Date,
  extra?: MessageExtra
} 

export type MessageExtra = {
    sentiment: number
} 