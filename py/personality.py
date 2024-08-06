import asyncio
import json
import logging
import math
import os
import time
from collections import Counter

import aiohttp
import nest_asyncio
from parsers.whatsapp import parse_whatsapp
from parsers.hangouts import parse_hangouts
from scipy.stats import binomtest

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# load from env 
openai_api_key = os.getenv('OPENAI_API_KEY')

def read_whatsapp_chat(file_path):
    logger.info(f"Reading WhatsApp chat from {file_path}")
    start_time = time.time()
    with open(file_path, 'r', encoding='utf-8') as file:
        chat = file.read()
    return chat

def create_adaptive_chunks(messages, target_chunk_count=100):
    logger.info(f"Creating adaptive chunks with target count of {target_chunk_count}")
    start_time = time.time()
    total_messages = len(messages) 
    print(f"Total: {total_messages}")
    chunk_size = math.ceil(total_messages / target_chunk_count)
    chunks = []
    
    for start in range(0, total_messages, chunk_size):
        end = min(start + chunk_size, total_messages)
        chunks.append((start, end))
    
    logger.info(f"Created {len(chunks)} chunks of size {chunk_size} in {time.time() - start_time:.2f} seconds")
    return chunks

def create_prompt(messages, start, end):
    prompt = "Analyze the following WhatsApp conversation chunk and predict the MBTI personality types of the participants. Provide only the MBTI type for each participant:\n\n"
    for message in messages[start:end]:
        prompt += f"{message['participant']} - {message['message']}\n"
    prompt += "\n"
    prompt += "Based on these messages, what are the likely MBTI types of each participant? Provide only the MBTI type for each participant as json. Use the exact names displayed in the chat. Example response: {'Kathy': 'INTJ', 'Sandy MacKenzie': 'ENFP'}\n"
    print(prompt)
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
    async with session.post('https://api.openai.com/v1/chat/completions', json={
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": { "type": "json_object" },
        "temperature": 0
    }, headers={"Authorization": f"Bearer {openai_api_key}"}) as response:
        result = await response.json()
        print(result)
        prediction = result['choices'][0]['message']['content']
    api_call_duration = time.time() - api_call_start
    logger.info(f"Received response for chunk {chunk_number}/{total_chunks} in {api_call_duration:.2f} seconds: {prediction}")
    
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

def is_significant_difference(count1, count2, alpha=0.05):
    total = count1 + count2
    result = binomtest(count1, total, p=0.5)
    return result.pvalue < alpha

def determine_final_mbti_with_significance(letter_counts):
    final_mbti = ""
    significance = []
    
    print(letter_counts) 
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

async def predict_mbti_from_chat(file_path, target_chunk_count=100):
    overall_start_time = time.time()
    
    chat = read_whatsapp_chat(file_path)
    messages = parse_whatsapp(chat)
    
    chunks = create_adaptive_chunks(messages, target_chunk_count)
    
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
        chunk_predictions = await asyncio.gather(*tasks)
    
    with open(cache_file, 'w') as f:
        json.dump(cache, f)
    logger.info(f"Updated cache file with {len(cache)} entries")
    
    logger.info("Processing predictions")
    predictions = {participant: [] for participant in set([message['participant'] for message in messages])}
    print(predictions)
    for chunk_prediction in chunk_predictions:
        json_prediction = json.loads(chunk_prediction)
        print(json_prediction)
        for p, m in json_prediction.items():
            if p in predictions:
                predictions[p].append(m)
    
    logger.info("Calculating final predictions and significances")
    final_predictions = {}
    letter_counts = {}
    significances = {}
    for participant, mbti_list in predictions.items():
        letter_counts[participant] = count_mbti_letters(mbti_list)
        final_predictions[participant], significances[participant] = determine_final_mbti_with_significance(letter_counts[participant])
    
    logger.info(f"Total processing time: {time.time() - overall_start_time:.2f} seconds")
    return final_predictions, predictions, letter_counts, significances, len(chunks)

async def run_analysis():
    chat_file_path = '_chat.txt'  # Replace with your actual file path
    try:
        logger.info("Starting MBTI prediction process")
        final_predictions, all_predictions, letter_counts, significances, chunk_count = await predict_mbti_from_chat(chat_file_path)
        
        print(f"\nAnalysis completed using {chunk_count} adaptive chunks.")
        print("\nFinal MBTI Predictions:")
        for participant, mbti in final_predictions.items():
            print(f"{participant}: {mbti}")
            print(f"  Letter Counts: {letter_counts[participant]}")
            if significances[participant]:
                interchangeable = " and ".join(significances[participant])
                print(f"  Personality Plot Twist: The {interchangeable} preferences are locked in an epic duel of indecision!")
            print()
        
        print("All Predictions:")
        for participant, predictions in all_predictions.items():
            print(f"{participant}: {predictions}")
        
        logger.info("MBTI prediction process completed")
    except Exception as e:
        logger.error(f"An error occurred: {e}", exc_info=True)
        print(f"An error occurred: {e}")

# Apply nest_asyncio to allow running asyncio in Jupyter
nest_asyncio.apply()

# Run the analysis
asyncio.get_event_loop().run_until_complete(run_analysis())