"""Convert the captured application screens into the website's shipping images."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
for name in ['app-preview', 'library-preview', 'player-preview', 'playlists-preview']:
    source = ROOT / 'test-results/orbe-brand-preview' / f'{name}.png'
    destination = ROOT / 'apps/web/public' / f'{name}.webp'
    Image.open(source).save(destination, quality=91, method=6)
    Path(str(destination) + '.json').write_text(json.dumps({
        'prompt': 'Origin: Actual Orbe Electron application captured locally by scripts/capture-brand-preview.mjs. Original geometric demo covers and synthesized audio from scripts/generate_preview_media.py. Converted to WebP with Pillow, no illustrative UI reconstruction.'
    }, indent=2) + '\n', encoding='utf-8')
print('Published four WebP screenshots and origin sidecars to apps/web/public.')
