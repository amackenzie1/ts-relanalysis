import { ChatMessage } from "./types";

/* 
export type ChatMessage = {
  person: string,
  message: string,
  date: Date,
  extra: Object
}
*/ 

/* format: 
[7/29/24, 1:46:27 PM] Andrew: Hahaha wow, beautiful
[7/29/24, 3:06:05 PM] Matthieu Huss: R u at the apart?
[7/29/24, 3:06:18 PM] Matthieu Huss: Thinking of heading back - most ppl left
[7/29/24, 3:06:23 PM] Andrew: Yep
[7/29/24, 3:06:31 PM] Matthieu Huss: Awesome, will be back in a bit
[7/30/24, 1:35:03 PM] Matthieu Huss: Thank you for reserving dinner in Temple Court's main dining room! You are currently booked for 3at 8:15pm on Aug. 1

Please reply "1" to confirm your booking or "9" to cancel. You can make other changes in the Resy app.
[7/30/24, 6:07:25 PM] Matthieu Huss: https://classpass.com/invite/SOVKFMV029?placement=PostBooking
[8/1/24, 5:03:19 PM] Matthieu Huss: On my way! Back
[8/1/24, 5:27:43 PM] Andrew: Awesome!
[8/2/24, 12:43:11 PM] Matthieu Huss: Matthieujhuss@gmail.com
*/

export const whatsapp = (data: string): ChatMessage[] => {
    const messages: ChatMessage[] = [];
    const regex = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}:\d{2}.[AP]M)\] ([^:]+): (.+)/;
    
    let currentMessage: ChatMessage | null = null;
    
    data.split('\n').forEach((line) => {
      const match = line.match(regex);
      
      if (match) {
        if (currentMessage) {
          messages.push(currentMessage);
        }
        
        currentMessage = {
          date: new Date(match[1]),
          person: match[2],
          message: match[3],
        };
      } else if (currentMessage) {
        currentMessage.message += '\n' + line;
      }
    });
    
    if (currentMessage) {
      messages.push(currentMessage);
    }
    
    return messages;
  };

export const whatsapp_regex = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}:\d{2}.[AP]M)\] ([^:]+): (.+)/;