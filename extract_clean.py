import re

with open(r'C:\Users\ruuuu\OneDrive\Desktop\SoulMinePlanner_Final.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract CSS
css_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if css_match:
    with open(r'C:\Users\ruuuu\OneDrive\Desktop\SoulMine-raid-planner-v3\style.css', 'w', encoding='utf-8') as f:
        f.write(css_match.group(1))

# Extract JS
js_match = re.search(r'<script>\s*(// --- Firebase Setup ---.*?)</script>', content, re.DOTALL)
if not js_match:
    js_match = re.search(r'<script>\s*(window\.formatSlotKeyToText.*?)</script>', content, re.DOTALL)

if js_match:
    with open(r'C:\Users\ruuuu\OneDrive\Desktop\SoulMine-raid-planner-v3\app.js', 'w', encoding='utf-8') as f:
        f.write(js_match.group(1))

# Create clean HTML
html_clean = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="style.css">', content, flags=re.DOTALL)
# Only replace the MAIN script, not all scripts!
html_clean = re.sub(r'<script>\s*(?:// --- Firebase Setup ---|window\.formatSlotKeyToText).*?</script>', '<script src="app.js"></script>', html_clean, flags=re.DOTALL)

with open(r'C:\Users\ruuuu\OneDrive\Desktop\SoulMine-raid-planner-v3\index.html', 'w', encoding='utf-8') as f:
    f.write(html_clean)

print("Extraction successful.")
