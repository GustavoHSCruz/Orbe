"""Original geometric covers and generated tones for marketing screenshots only."""
from pathlib import Path
from PIL import Image, ImageDraw
import subprocess
import math

ROOT = Path(__file__).resolve().parents[1]
folder = ROOT / 'test-results/orbe-preview-media'
folder.mkdir(parents=True, exist_ok=True)
titles = [('Entre orbitas', 'Entre órbitas'), ('Mare baixa', 'Maré baixa'), ('Depois da chuva', 'Depois da chuva'), ('Lado de dentro', 'Lado de dentro'), ('Horizonte', 'Horizonte')]
colors = [('#e98a78', '#4c2841'), ('#91b4ad', '#204b57'), ('#e8bb78', '#805245'), ('#b6a4c5', '#4d3d71'), ('#8cabcb', '#243f67')]
for index, ((filename, title), (light, dark)) in enumerate(zip(titles, colors)):
    image = Image.new('RGB', (800, 800), dark)
    draw = ImageDraw.Draw(image)
    if index == 0:
        for radius in range(330, 30, -38):
            draw.ellipse((400-radius, 400-radius, 400+radius, 400+radius), outline=light, width=14)
        draw.rectangle((0, 560, 800, 800), fill=dark)
    elif index == 1:
        for y in range(90, 850, 100):
            draw.line([(x, y+int(75*math.sin(x/200))) for x in range(-20, 825, 5)], fill=light, width=28)
    elif index == 2:
        draw.ellipse((170, 90, 630, 550), fill=light)
        for y in range(430, 800, 45):
            draw.rectangle((0, y, 800, y+20), fill=dark)
    elif index == 3:
        for j in range(5):
            draw.rounded_rectangle((90+j*45, 90+j*45, 710-j*45, 710-j*45), radius=180-j*25, outline=light, width=15)
    else:
        for j in range(8):
            draw.line((0, 180+j*58, 800, 420+j*58), fill=light, width=20)
    cover = folder / f'{index}.png'
    image.save(cover)
    subprocess.run([str(ROOT / 'resources/bin/ffmpeg.exe'), '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', f'sine=frequency={220+index*30}:duration=180', '-i', str(cover), '-map', '0:a', '-map', '1:v', '-c:a', 'libmp3lame', '-q:a', '8', '-c:v', 'mjpeg', '-disposition:v', 'attached_pic', '-id3v2_version', '3', '-metadata', f'title={title}', '-metadata', 'artist=Coleção Orbe', '-y', str(folder / f'{filename}.mp3')], check=True)
    (folder / f'{filename}.lrc').write_text('[00:00.00]Um lugar para ficar\n[00:08.00]Deixe o tempo passar\n[00:16.00]O mundo pode esperar\n[00:24.00]A gente encontra o tom\n[00:32.00]Na sua órbita\n', encoding='utf-8')
print('Generated original demo artwork, three-minute audio fixtures and local lyrics.')
