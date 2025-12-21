"""
AI Models Auto-Update Script for Node-RED AI Agent.
This script fetches the latest model data from OpenRouter API, updates the local JSON cache,
and injects the formatted HTML model options into the 'ai-model.html' configuration file.

Usage:
    python scripts/update_models.py
"""

import json
import os
import urllib.request
import sys

# --- Configuration ---
# API endpoint for OpenRouter models (public, no auth required)
API_URL = "https://openrouter.ai/api/v1/models"

# Only consider models created after this date (Unix timestamp)
# 1735689600 = 2025-01-01 00:00:00 UTC
# !!! This is because there are too many models and dropdown is getting too long !!!
MIN_CREATION_DATE = 1735689600

# Base directory of the project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Paths to the model data JSON and the Node-RED HTML template
JSON_PATH = os.path.join(BASE_DIR, 'model', 'openrouter-models.json')
HTML_PATH = os.path.join(BASE_DIR, 'model', 'ai-model.html')

# Providers that should have their own dedicated optgroup in the dropdown
MAJOR_PROVIDERS = {
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'google': 'Google',
    'mistralai': 'Mistral',
    'deepseek': 'DeepSeek',
    'meta-llama': 'Meta',
    'x-ai': 'xAI Grok',
    'qwen': 'Qwen',
}

# Mapping for input/output modalities to shorthand notation
MODALITY_MAP = {
    'text': 'T',
    'image': 'I',
    'audio': 'A',
    'video': 'V',
    'file': 'F'
}

def fetch_models():
    """
    Fetches the latest model list from OpenRouter API.
    Saves the result to a local JSON file for reference and backup.
    Returns:
        list: A list of model objects on success, or the cached data on failure.
    """
    print(f"[*] Fetching models from {API_URL}...")
    try:
        # Use urllib for zero dependencies
        with urllib.request.urlopen(API_URL) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                
                # Ensure the target directory exists
                os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
                
                # Update the local cache
                with open(JSON_PATH, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=4)
                print(f"[+] Successfully fetched and cached {len(data['data'])} models.")
                return data['data']
            else:
                print(f"[!] API returned status code: {response.status}")
    except Exception as e:
        print(f"[!] Error fetching models: {e}")
    
    # Fallback to local cache if API fetch fails
    if os.path.exists(JSON_PATH):
        print("[*] Falling back to local cache...")
        try:
            with open(JSON_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)['data']
        except Exception as e:
            print(f"[!] Error reading cache: {e}")
            
    return None

def generate_html_options(models):
    """
    Generates the <optgroup> and <option> HTML tags for the model selection dropdown.
    Groups models by major provider and formats the label with modality, price, and context.
    Args:
        models (list): List of model objects from the API.
    Returns:
        str: A string containing the formatted HTML snippet.
    """
    grouped_models = {name: [] for name in MAJOR_PROVIDERS.values()}
    grouped_models['Others'] = []

    for model in models:
        provider_id = model['id'].split('/')[0]
        provider_name = MAJOR_PROVIDERS.get(provider_id, 'Others')
        
        # 1. Format modalities shorthand (e.g., [T+I -> T])
        arch = model.get('architecture', {})
        in_mods = arch.get('input_modalities', [])
        out_mods = arch.get('output_modalities', [])
        
        in_shorthand = '+'.join([MODALITY_MAP.get(m, m[0].upper()) for m in in_mods])
        out_shorthand = '+'.join([MODALITY_MAP.get(m, m[0].upper()) for m in out_mods])
        modality_str = f"[{in_shorthand} -> {out_shorthand}]"
        
        # 2. Format pricing per 1M tokens
        pricing = model.get('pricing', {})
        prompt_price = float(pricing.get('prompt', 0)) * 1000000
        comp_price = float(pricing.get('completion', 0)) * 1000000
        
        if prompt_price == 0 and comp_price == 0:
            price_str = "(Free)"
        else:
            price_str = f"(${prompt_price:.4f}/1M in, ${comp_price:.4f}/1M out)"
        
        # 3. Format context length (supports K and M notation)
        context = model.get('context_length', 0)
        if context >= 1000000:
            context_str = f"{context/1000000:.1f}M context"
        elif context >= 1000:
            context_str = f"{context//1000}K context"
        else:
            context_str = f"{context} context"
        
        # Construct the final label
        label = f"{model['name']} {modality_str} {price_str}, {context_str}"
        grouped_models[provider_name].append((model['id'], label))

    # Assemble HTML by provider group
    html_parts = []
    # Major providers first in the specified order, then 'Others'
    for p_name in list(MAJOR_PROVIDERS.values()) + ['Others']:
        models_list = grouped_models[p_name]
        if not models_list:
            continue
        html_parts.append(f'            <optgroup label="{p_name}">')
        # Sort models alphabetically by label within each group
        for m_id, m_label in sorted(models_list, key=lambda x: x[1]):
            html_parts.append(f'                <option value="{m_id}">{m_label}</option>')
        html_parts.append('            </optgroup>')
    
    return '\n'.join(html_parts)

def update_html_file(options_html):
    """
    Injects the generated HTML options into 'ai-model.html' between specific marker tags.
    Args:
        options_html (str): The HTML options string to inject.
    Returns:
        bool: True if injection was successful, False otherwise.
    """
    if not os.path.exists(HTML_PATH):
        print(f"[!] Error: Template file not found at {HTML_PATH}")
        return False

    with open(HTML_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # The markers used to identify the replacement range
    start_marker = '<select id="node-config-input-model" style="width: 70%;">'
    end_marker = '</select>'

    start_idx = content.find(start_marker)
    if start_idx == -1:
        print("[!] Error: Start marker not found in HTML template.")
        return False

    start_idx += len(start_marker)
    end_idx = content.find(end_marker, start_idx)

    if end_idx == -1:
        print("[!] Error: End marker not found in HTML template.")
        return False

    # Perform the replacement, maintaining indentation
    new_content = content[:start_idx] + '\n' + options_html + '\n            ' + content[end_idx:]

    with open(HTML_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return True

def main():
    """Main execution entry point."""
    print("[*] Starting AI Models update...")
    
    models = fetch_models()
    if not models:
        print("[!] Critical: No model data available. Aborting.")
        sys.exit(1)
        
    # Filter models by creation date
    total_found = len(models)
    models = [m for m in models if m.get('created', 0) >= MIN_CREATION_DATE]
    print(f"[*] Filtered {len(models)} models from {total_found} (created >= 2025-01-01)")
    
    options_html = generate_html_options(models)
    
    if update_html_file(options_html):
        print(f"[+] Successfully updated {len(models)} models in {HTML_PATH}")
        # Remove the JSON cache if injection was successful, as requested
        if os.path.exists(JSON_PATH):
            os.remove(JSON_PATH)
            print(f"[*] Cleaned up model data cache: {JSON_PATH}")
    else:
        print("[!] Failed to update HTML file.")
        sys.exit(1)

if __name__ == "__main__":
    main()
