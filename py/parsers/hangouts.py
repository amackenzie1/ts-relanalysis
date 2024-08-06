import re
from datetime import datetime

def parse_hangouts(chat_text):
    lines = chat_text.strip().split('\n')
    parsed_data = []
    
    pattern = r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) <([^>]+)> (.+)'
    
    for line in lines:
        match = re.match(pattern, line)
        if match:
            date_str, participant, message = match.groups()
            date = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
            
            parsed_data.append({
                'participant': participant,
                'message': message,
                'date': date.isoformat()
            })
    
    return parsed_data

# Example usage:
chat_text = """
2020-01-06 13:24:32 <Unknown> Flights at 2pm. Gets in at 11pm today.
2020-01-06 13:25:06 <Unknown> I won't have the harp again for a while.
2020-01-06 13:25:18 <Andrew Mackenzie> Can they rent it again next time you come?
2020-01-06 13:25:21 <Unknown> Well
2020-01-06 13:25:37 <Unknown> Next time I come is just for the weekend at Easter.
2020-01-06 13:25:44 <Unknown> Probably have it again in July
2020-01-06 13:26:01 <Andrew Mackenzie> 6 months gracious. 
2020-01-06 13:26:06 <Unknown> Yeah.
2020-01-06 13:26:25 <Unknown> Realized that last night and just sat behind it and held it then stood up to leave and sort of draped over it.
2020-01-06 13:26:26 <Andrew Mackenzie> We'll have to find a music store, do you know of any in NYC that have harps?
"""

if __name__ == "__main__":
    result = parse_hangouts(chat_text)
    print(result)