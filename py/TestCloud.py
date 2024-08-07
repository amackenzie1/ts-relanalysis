import colorsys
import logging
from collections import Counter
import re 
import matplotlib.pyplot as plt
import numpy as np
from wordcloud import WordCloud
from parsers.universal import parse

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def clean_and_tokenize(message):
    message = message.lower()
    message = re.sub(r'[^a-z0-9\s]', '', message)
    return message.split()

def generate_soft_color_func(saturation=0.3, value=0.9):
    def color_func(word, font_size, position, orientation, random_state=None, **kwargs):
        hue = np.random.uniform(0, 1)
        r, g, b = colorsys.hsv_to_rgb(hue, saturation, value)
        return f"rgb({int(r*255)}, {int(g*255)}, {int(b*255)})"
    return color_func

def create_word_cloud(word_ratios, title, size_ratio=1.5):
    if not word_ratios:
        logger.warning(f"No words to create word cloud for {title}")
        return
    
    logger.info(f"Creating word cloud for {title}")
    adjusted_ratios = {word: (ratio ** size_ratio) for word, ratio in word_ratios.items()}
    
    wordcloud = WordCloud(width=800, height=400, 
                          background_color='white', 
                          color_func=generate_soft_color_func(),
                          min_font_size=10,
                          max_font_size=100).generate_from_frequencies(adjusted_ratios)
    
    plt.figure(figsize=(10, 5))
    plt.imshow(wordcloud, interpolation='bilinear')
    plt.axis('off')
    plt.title(title)
    plt.tight_layout(pad=0)
    plt.show()


file_path = 'files/mini_hangouts.txt'
user_messages = parse(open(file_path).read())
users = set([i.user for i in user_messages])

if user_messages:
    total_messages = len(user_messages)
    logger.info(f"\nTotal number of messages: {total_messages}")

    user_word_counts = {user: Counter() for user in users}
    total_word_counts = {user: 0 for user in users}

    for message in user_messages:
        words = clean_and_tokenize(message.message)
        user = message.user
        user_word_counts[user].update(words)
        total_word_counts[user] += len(words)

    logger.info("\nPer-user statistics:")
    for user in users:
        logger.info(f"  {user}:")
        logger.info(f"    Messages: {len([m for m in user_messages if m.user == user])}")
        logger.info(f"    Total words: {total_word_counts[user]}")
        logger.info(f"    Unique words: {len(user_word_counts[user])}")

    word_ratios = {}
    for user in users:
        word_ratios[user] = {}
        for word in user_word_counts[user]:
            user_count = user_word_counts[user][word]
            other_users_count = sum(user_word_counts[other_user][word] for other_user in users if other_user != user)
            ratio = (user_count + 1) / (other_users_count + 1)
            word_ratios[user][word] = ratio

    logger.info("\nGenerating word clouds...")
    for user in users:
        create_word_cloud(word_ratios[user], f"Word Cloud for {user}")

    logger.info("Script execution completed")
else:
    logger.error("Failed to parse the chat. Please check the logs above for more details.")