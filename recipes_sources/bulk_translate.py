import json
import os
import time
from deep_translator import GoogleTranslator

# Configuration
TARGET_DIRS = ["fr", "es"]
# Text fields we want to translate
TEXT_FIELDS = ["title", "description", "strMeal", "strCategory", "strArea", "strInstructions"]
# List fields we want to translate item by item
LIST_FIELDS = ["ingredients", "method"]

def translate_text(text, target_lang):
    if not text:
        return text
    
    # Remove our placeholder prefixes if present so we don't translate them weirdly
    clean_text = text.replace("[FR] ", "").replace("[ES] ", "").replace("(Translation pending) ", "")
    
    try:
        # Use GoogleTranslator
        translated = GoogleTranslator(source='auto', target=target_lang).translate(clean_text)
        return translated
    except Exception as e:
        print(f"Error translating text: {e}")
        return text # Return original if failure

def process_item(item, target_lang):
    # Translate simple string fields
    for field in TEXT_FIELDS:
        if field in item and isinstance(item[field], str):
            # Check if it looks like it needs translation (simple heuristic)
            # or just force translate everything that isn't already translated
            # For now, we translate everything to ensure quality, assuming input is English
            print(f"  Translating {field}...")
            item[field] = translate_text(item[field], target_lang)

    # Translate lists (ingredients, method)
    for field in LIST_FIELDS:
        if field in item and isinstance(item[field], list):
            print(f"  Translating list {field} ({len(item[field])} items)...")
            new_list = []
            for sub_item in item[field]:
                if isinstance(sub_item, str):
                    new_list.append(translate_text(sub_item, target_lang))
                else:
                    new_list.append(sub_item)
            item[field] = new_list
            
    return item

def process_file(file_path, target_lang):
    print(f"Processing {file_path} for language: {target_lang}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        modified = False
        
        # Handle list of objects (common in this dataset)
        if isinstance(data, list):
            for i, item in enumerate(data):
                print(f" Item {i+1}/{len(data)}")
                process_item(item, target_lang)
            modified = True
            
        # Handle "meals" dictionary object
        elif isinstance(data, dict) and "meals" in data and isinstance(data["meals"], list):
            for i, item in enumerate(data["meals"]):
                print(f" Item {i+1}/{len(data['meals'])}")
                process_item(item, target_lang)
            modified = True

        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print(f"Saved translated file: {file_path}")

    except Exception as e:
        print(f"Failed to process {file_path}: {e}")

def main():
    for lang_dir in TARGET_DIRS:
        if not os.path.exists(lang_dir):
            continue
            
        target_lang = "fr" if lang_dir == "fr" else "es"
        
        for root, dirs, files in os.walk(lang_dir):
            for file in files:
                if file.endswith(".json"):
                    file_path = os.path.join(root, file)
                    process_file(file_path, target_lang)

if __name__ == "__main__":
    main()
