import re
from datetime import datetime

def parse_whatsapp(chat_text):
    lines = chat_text.strip().split('\n')
    parsed_data = []
    
    pattern = r'\[(\d+/\d+/\d+, \d+:\d+:\d+ [AP]M)\] ([^:]+): (.+)'
    
    for line in lines:
        match = re.match(pattern, line)
        if match:
            date_str, participant, message = match.groups()
            date = datetime.strptime(date_str, '%m/%d/%y, %I:%M:%S %p')
            
            parsed_data.append({
                'participant': participant,
                'message': message,
                'date': date.isoformat()
            })
    
    return parsed_data

# Example usage:
chat_text = """
[7/29/24, 3:06:05 PM] Matthieu Huss: R u at the apart?
[7/29/24, 3:06:18 PM] Matthieu Huss: Thinking of heading back - most ppl left
[7/29/24, 3:06:23 PM] Andrew: Yep
[7/29/24, 3:06:31 PM] Matthieu Huss: Awesome, will be back in a bit
[7/30/24, 1:35:03 PM] Matthieu Huss: Thank you for reserving dinner in Temple Court's main dining room! You are currently booked for 3at 8:15pm on Aug. 1
Please reply "1" to confirm your booking or "9" to cancel. You can make other changes in the Resy app.
[7/30/24, 6:07:25 PM] Matthieu Huss: https://classpass.com/invite/SOVKFMV029?placement=PostBooking
[8/1/24, 5:03:19 PM] Matthieu Huss: On my way! Back
[8/1/24, 5:27:43 PM] Andrew: Awesome!
"""

result = parse_whatsapp(chat_text)
print(result)