import aiohttp
import asyncio
import logging
import time
from collections import Counter, defaultdict
from scipy.stats import binomtest
import math
import json
import os
import nest_asyncio
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

openai_api_key = os.getenv("API_KEY")

def read_whatsapp_chat(file_path):
    logger.info(f"Reading WhatsApp chat from {file_path}")
    start_time = time.time()
    with open(file_path, 'r', encoding='utf-8') as file:
        chat_lines = file.readlines()
    logger.info(f"Read {len(chat_lines)} lines in {time.time() - start_time:.2f} seconds")
    return chat_lines

def extract_conversations(chat_lines, message_range=None):
    logger.info("Extracting conversations from chat lines")
    start_time = time.time()
    messages = []
    message_counts = defaultdict(int)
    current_sender = None
    current_message = ""

    # Regular expressions for different date formats
    patterns = [
        r'\[(\d{1,2}/\d{1,2}/\d{2,4},\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M)\]\s+([^:]+):\s+(.*)',  # Format 1
        r'(\d{2}/\d{2}/\d{4},\s+\d{2}:\d{2})\s+-\s+([^:]+):\s+(.*)',  # Format 2
        r'(\d{4}-\d{2}-\d{2},\s+\d{1,2}:\d{2}\s+[ap]\.m\.)\s+-\s+([^:]+):\s+(.*)'  # Format 3
    ]

    for line in chat_lines:
        matched = False
        for pattern in patterns:
            match = re.match(pattern, line)
            if match:
                if current_sender and current_message:
                    messages.append((current_sender, current_message.strip()))
                    message_counts[current_sender] += 1
                
                if len(match.groups()) == 3:
                    _, current_sender, current_message = match.groups()
                else:
                    current_sender, current_message = match.groups()[1:]
                
                matched = True
                break
        
        if not matched:
            current_message += " " + line.strip()

    if current_sender and current_message:
        messages.append((current_sender, current_message.strip()))
        message_counts[current_sender] += 1

    # Remove system messages and empty senders
    messages = [(sender, msg) for sender, msg in messages if sender and sender not in ["Les messages et les appels sont chiffrés de bout en bout.", "Messages and calls are end-to-end encrypted."]]

    if message_range:
        messages = messages[message_range[0]:message_range[1]]
        # Recalculate message counts for the range
        message_counts = defaultdict(int)
        for sender, _ in messages:
            message_counts[sender] += 1

    logger.info(f"Extracted {len(messages)} messages in {time.time() - start_time:.2f} seconds")
    logger.info(f"Message counts per participant: {dict(message_counts)}")
    
    # Log the first few messages for debugging
    for i, (sender, message) in enumerate(messages[:5]):
        logger.debug(f"Message {i+1}: {sender}: {message[:50]}...")

    return messages, dict(message_counts)

def log_progress(current, total, message):
    percent = (current / total) * 100
    logger.info(f"{message}: {percent:.2f}% ({current}/{total})")

def create_adaptive_chunks(messages, target_chunk_count=100, min_messages_per_participant=3):
    logger.info(f"Creating adaptive chunks with target count of {target_chunk_count}")
    start_time = time.time()
    total_messages = len(messages)
    initial_chunk_size = max(math.ceil(total_messages / target_chunk_count), min_messages_per_participant * 2)
    chunks = []
    
    start = 0
    while start < total_messages:
        end = min(start + initial_chunk_size, total_messages)
        
        # Efficiently count messages per participant
        participant_counts = {}
        for i in range(start, end):
            sender, _ = messages[i]
            participant_counts[sender] = participant_counts.get(sender, 0) + 1
        
        # Extend chunk if necessary, but limit extension
        extension_limit = min(initial_chunk_size, total_messages - end)
        for i in range(extension_limit):
            if all(count >= min_messages_per_participant for count in participant_counts.values()):
                break
            if end + i < total_messages:
                sender, _ = messages[end + i]
                participant_counts[sender] = participant_counts.get(sender, 0) + 1
                end = end + i + 1
        
        chunks.append((start, end))
        start = end
    
    logger.info(f"Created {len(chunks)} chunks in {time.time() - start_time:.2f} seconds")
    return chunks

def create_prompt(messages, start, end):
    prompt = "Analyze the following WhatsApp conversation chunk and predict the MBTI personality types of the participants. Provide only the MBTI type for each participant:\n\n"
    for sender, message in messages[start:end]:
        prompt += f"{sender}: {message}\n"
    prompt += "\nBased on these messages, what are the likely MBTI types of each participant? Provide only the MBTI type for each participant."
    return prompt

async def process_chunk(session, chunk, messages, cache, chunk_number, total_chunks):
    start, end = chunk
    cache_key = f"{start}_{end}"
    
    if cache_key in cache:
        logger.info(f"Cache hit for chunk {chunk_number}/{total_chunks} ({start}-{end})")
        return cache[cache_key]
    
    logger.info(f"Processing chunk {chunk_number}/{total_chunks} ({start}-{end})")
    chunk_start_time = time.time()
    prompt = create_prompt(messages, start, end)
    
    logger.info(f"Sending chunk {chunk_number}/{total_chunks} to OpenAI API")
    api_call_start = time.time()
    try:
        async with session.post('https://api.openai.com/v1/chat/completions', json={
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0
        }, headers={"Authorization": f"Bearer {openai_api_key}"}) as response:
            result = await response.json()
            api_call_duration = time.time() - api_call_start
            logger.info(f"Received response for chunk {chunk_number}/{total_chunks} in {api_call_duration:.2f} seconds")
            
            if 'choices' not in result:
                logger.error(f"Unexpected API response for chunk {chunk_number}/{total_chunks}: {result}")
                return f"API Error: Unexpected response format for chunk {start}-{end}"
            
            prediction = result['choices'][0]['message']['content']
    except Exception as e:
        logger.error(f"API call failed for chunk {chunk_number}/{total_chunks}: {str(e)}")
        return f"API Error: {str(e)} for chunk {start}-{end}"
    
    cache[cache_key] = prediction
    logger.info(f"Processed chunk {chunk_number}/{total_chunks} in {time.time() - chunk_start_time:.2f} seconds")
    return prediction

def count_mbti_letters(mbti_list):
    letter_counts = {'E': 0, 'I': 0, 'N': 0, 'S': 0, 'T': 0, 'F': 0, 'J': 0, 'P': 0}
    for mbti in mbti_list:
        for letter in mbti:
            if letter in letter_counts:
                letter_counts[letter] += 1
    return letter_counts

def is_significant_difference(count1, count2, alpha=0.3):
    total = count1 + count2
    if total == 0:
        return False
    result = binomtest(count1, total, p=0.5)
    return result.pvalue < alpha

def determine_final_mbti_with_significance(letter_counts):
    final_mbti = ""
    significance = []
    
    pairs = [('E', 'I'), ('N', 'S'), ('T', 'F'), ('J', 'P')]
    for a, b in pairs:
        count_a, count_b = letter_counts[a], letter_counts[b]
        if count_a > count_b:
            final_mbti += a
        else:
            final_mbti += b
        
        if not is_significant_difference(count_a, count_b):
            significance.append(f"{a}/{b}")
    
    return final_mbti, significance

async def predict_mbti_from_chat(file_path, target_chunk_count=100, min_messages_per_participant=3, message_range=None):
    overall_start_time = time.time()
    
    chat_lines = read_whatsapp_chat(file_path)
    messages, message_counts = extract_conversations(chat_lines, message_range)
    
    chunks = create_adaptive_chunks(messages, target_chunk_count, min_messages_per_participant)
      
    cache_file = f"{file_path}_cache.json"
    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            cache = json.load(f)
        logger.info(f"Loaded cache with {len(cache)} entries")
    else:
        cache = {}
        logger.info("No existing cache found")
    
    async with aiohttp.ClientSession() as session:
        logger.info("Starting asynchronous processing of chunks")
        tasks = [process_chunk(session, chunk, messages, cache, i+1, len(chunks)) for i, chunk in enumerate(chunks)]
        chunk_predictions = []
        for i, task in enumerate(asyncio.as_completed(tasks)):
            try:
                result = await task
                if result.startswith("API Error:"):
                    logger.warning(f"Skipping error chunk: {result}")
                else:
                    chunk_predictions.append(result)
            except Exception as e:
                logger.error(f"Error processing chunk {i+1}: {str(e)}")
            log_progress(i+1, len(tasks), "Processing chunks")
    
    with open(cache_file, 'w') as f:
        json.dump(cache, f)
    logger.info(f"Updated cache file with {len(cache)} entries")
    
    logger.info("Processing predictions")
    predictions = {}
    for chunk_prediction in chunk_predictions:
        for line in chunk_prediction.split('\n'):
            if ':' in line:
                participant, mbti = line.split(':')
                participant = participant.strip()
                mbti = mbti.strip()
                if participant not in predictions:
                    predictions[participant] = []
                predictions[participant].append(mbti)
    
    logger.info("Calculating final predictions and significances")
    final_predictions = {}
    letter_counts = {}
    significances = {}
    for participant, mbti_list in predictions.items():
        letter_counts[participant] = count_mbti_letters(mbti_list)
        final_predictions[participant], significances[participant] = determine_final_mbti_with_significance(letter_counts[participant])
    
    logger.info(f"Total processing time: {time.time() - overall_start_time:.2f} seconds")
    return final_predictions, predictions, letter_counts, significances, len(chunks), message_counts

async def run_analysis():
    chat_file_path = '_chat.txt'  # Replace with your actual file path
    message_range = None  # Set to None to process all messages, or use a tuple like (0, 3000) for the first 3000 messages
    try:
        logger.info("Starting MBTI prediction process")
        final_predictions, all_predictions, letter_counts, significances, chunk_count, message_counts = await predict_mbti_from_chat(
            chat_file_path, 
            target_chunk_count=100, 
            min_messages_per_participant=3, 
            message_range=message_range
        )
        
        if not final_predictions:
            logger.error("No predictions were made. Check if conversations were extracted correctly.")
            return

        total_messages = sum(message_counts.values())
        
        # Prepare the output
        output = []
        output.append(f"\nAnalysis completed using {chunk_count} adaptive chunks.")
        output.append(f"Total messages analyzed: {total_messages}")
        
        if message_range:
            output.append(f"Analyzed messages from index {message_range[0]} to {message_range[1]}")
        
        output.append("\nMessage count per participant:")
        for participant, count in message_counts.items():
            output.append(f"{participant}: {count} messages")
        
        output.append("\nFinal MBTI Predictions:")
        for participant, mbti in final_predictions.items():
            output.append(f"{participant}: {mbti}")
            output.append(f"  Letter Counts: {letter_counts[participant]}")
            if significances[participant]:
                interchangeable = " and ".join(significances[participant])
                output.append(f"  Personality Plot Twist: The {interchangeable} preferences are locked in an epic duel of indecision!")
            output.append("")
        
        output.append("All Predictions:")
        for participant, predictions in all_predictions.items():
            output.append(f"{participant}: {predictions}")
        
        # Print the output
        print("\n".join(output))
        
        # Log the output
        for line in output:
            logger.info(line)
        
        logger.info("MBTI prediction process completed")
    except Exception as e:
        logger.error(f"An error occurred: {e}", exc_info=True)
        print(f"An error occurred: {e}")

# Apply nest_asyncio to allow running asyncio in Jupyter
nest_asyncio.apply()

# Run the analysis
asyncio.get_event_loop().run_until_complete(run_analysis())