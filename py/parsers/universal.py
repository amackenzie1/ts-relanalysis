from openai import OpenAI
import os 
import re 
import json 
import logging 
from pydantic import BaseModel
from datetime import datetime
from dateutil import parser


# Set up OpenAI API key
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RegexResponse(BaseModel):
    user1: str
    user2: str
    regex_pattern: str

class Message(BaseModel):
    user: str 
    message: str
    date: datetime

def clean(text):
    return re.sub(r'http\S+|www\S+|https\S+|\U0001F600-\U0001F64F|\U0001F300-\U0001F5FF|\U0001F680-\U0001F6FF|\U0001F1E0-\U0001F1FF', '', text, flags=re.MULTILINE)

def get_parsing_info_from_llm(content_sample):
    logger.info("Requesting parsing information from LLM")
    prompt = f"""
    Analyze the following chat transcript sample and provide the following information:
    1. The names of the two main users in the conversation.
    2. A Python regex pattern to extract the timestamp, user, and message content.

    Chat transcript sample:
    {content_sample}

    Provide your answer in the following JSON format:
    {{
        "user1": "Name1",
        "user2": "Name2",
        "regex_pattern": "your_regex_pattern_here"
    }}
    
    Instructions for the regex pattern:
    - Use named groups for 'timestamp', 'user', and 'message'.
    - The pattern should match the entire line, including the timestamp and user name.
    - Ensure the pattern accounts for variations in time format (e.g., "7:07 p.m." or "19:07").
    - Same goes for date format (for example, months/days could be 1 or 2 digits). Better to be too flexible than too strict.
    - The 'message' group should capture the entire message, including any punctuation or special characters.
    - Do not include the 'r' prefix in the regex pattern string.

    Example regex pattern (adjust as needed):
    "(?P<timestamp>\\d{4}-\\d{2}-\\d{2},\\s\\d{1,2}:\\d{2}\\s(?:AM|PM))\\s-\\s(?P<user>[^:]+):\\s(?P<message>.*)"
    """

    response = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that analyzes chat transcripts."},
            {"role": "user", "content": prompt}
        ],
        response_format=RegexResponse,
        temperature=0
    )

    return response.choices[0].message.parsed

def good_regex(content, regex):
    matches = re.findall(regex, content, re.MULTILINE)
    # find the total length 
    all_text = " ".join([" ".join(match) for match in matches]) 
    if len(all_text) > 0.7 * len(content):
        return True
    return False
    
def parse(chat_text):
    regexes = json.load(open("parsers/regexes.json", "r"))
    # find one that matches 
    pattern = None 
    for regex in regexes:
        if good_regex(chat_text, regex):
            pattern = regex
            break
    if not pattern:
        logger.info("No regex pattern matched the chat transcript, using LLM")
        pattern = get_parsing_info_from_llm(chat_text[:3000]).regex_pattern

    matches = re.finditer(pattern, chat_text, re.MULTILINE)
    parsed_data = []
    for match in matches:
        if match:
            groups = match.groupdict()
            timestamp = parser.parse(groups['timestamp'])
            user = groups['user']
            message = clean(groups['message'])
            parsed_data.append(Message(user=user, message=message, date=timestamp))
    regexes.append(pattern)
    regexes = list(set(regexes))
    with open("parsers/regexes.json", "w") as f:
        f.write(json.dumps(regexes, indent=4)) 
    return parsed_data


if __name__ == "__main__":
    content = open("files/kai.txt").read()
    for i in parse(content)[-30:]:
        print(i)