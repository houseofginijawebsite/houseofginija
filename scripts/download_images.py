import json
import os
import requests
from PIL import Image
import io

with open('scripts/products_raw.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

img_dir = 'scripts/extracted_images'
thumb_dir = 'scripts/thumbnails'
os.makedirs(img_dir, exist_ok=True)
os.makedirs(thumb_dir, exist_ok=True)

print(f"Processing {len(products)} products...")

downloaded_count = 0
failed_count = 0

for p_idx, p in enumerate(products):
    pid = str(p.get('id', p_idx))
    imgs = p.get('images') or []
    
    for img_idx, img_url in enumerate(imgs):
        if not img_url:
            continue
        
        target_filename = f"{pid}_img{img_idx}.jpg"
        target_path = os.path.join(img_dir, target_filename)
        thumb_path = os.path.join(thumb_dir, target_filename)
        
        if not os.path.exists(target_path):
            if img_url.startswith('/local-products/'):
                local_src = os.path.join('public', img_url.lstrip('/'))
                if os.path.exists(local_src):
                    with open(local_src, 'rb') as sf, open(target_path, 'wb') as df:
                        df.write(sf.read())
                    downloaded_count += 1
                else:
                    print(f"Local file missing: {local_src}")
                    failed_count += 1
            elif img_url.startswith('http'):
                try:
                    res = requests.get(img_url, timeout=15)
                    if res.status_code == 200:
                        with open(target_path, 'wb') as df:
                            df.write(res.content)
                        downloaded_count += 1
                    else:
                        print(f"HTTP error {res.status_code} for {img_url}")
                        failed_count += 1
                except Exception as e:
                    print(f"Download failed for {img_url}: {e}")
                    failed_count += 1
            else:
                # Other local path
                local_src = os.path.join('public', img_url.lstrip('/'))
                if os.path.exists(local_src):
                    with open(local_src, 'rb') as sf, open(target_path, 'wb') as df:
                        df.write(sf.read())
                    downloaded_count += 1
                else:
                    print(f"Unknown image path: {img_url}")
                    failed_count += 1
        
        # Create thumbnail for Excel embedding (max 100x110, preserving aspect ratio)
        if os.path.exists(target_path) and not os.path.exists(thumb_path):
            try:
                with Image.open(target_path) as im:
                    im_rgb = im.convert('RGB')
                    im_rgb.thumbnail((100, 110), Image.Resampling.LANCZOS)
                    im_rgb.save(thumb_path, 'JPEG', quality=85)
            except Exception as e:
                print(f"Thumbnail failed for {target_path}: {e}")

print(f"Done! Downloaded/processed {downloaded_count} images. Failed: {failed_count}")
