import json
import os
import xlsxwriter
from PIL import Image

def get_product_category(p):
    name = (p.get('name') or '').lower()
    desc = (p.get('description') or '').lower()
    slug = (p.get('slug') or '').lower()
    col_slugs = [str(s).lower() for s in (p.get('collection_slugs') or [])]
    col_slug = (p.get('collection_slug') or '').lower()
    tags = [str(t.get('name') if isinstance(t, dict) else t).lower() for t in (p.get('tags') or [])]
    tags_str = ' '.join(tags)
    
    # 1. Drape Saree
    if 'drape' in name or 'saree' in name or 'sharara' in name or 'shararas' in col_slugs or col_slug == 'shararas' or 'drape' in desc or 'drape' in tags_str:
        return 'Drape Saree'
    
    # 2. Gown
    if 'gown' in name or 'gowns' in col_slugs or col_slug == 'gowns' or 'heavy-gown' in col_slugs or 'anarkali' in name or 'gown' in desc:
        return 'Gown'
    
    # 3. Indowestern
    if 'cape' in name or 'indo-western' in col_slugs or col_slug == 'indo-western' or 'co-ord' in name or 'co-ords' in col_slugs or 'jacket' in name or 'bracelet' in name or 'earring' in name or 'necklace' in name or 'ring' in name or 'jewellery' in col_slugs or 'jewellery' in name:
        return 'Indowestern'
    
    # 4. Default: Suit (Kurta)
    return 'Suit (Kurta)'

def format_tags(tags_list):
    if not tags_list:
        return ''
    cleaned = []
    for t in tags_list:
        if isinstance(t, dict):
            name = t.get('name') or t.get('slug') or ''
        else:
            name = str(t)
        name = name.strip()
        if name:
            # If tags contain pipe or commas, split and clean
            sub_tags = [st.strip() for st in name.replace('|', ',').split(',') if st.strip()]
            for st in sub_tags:
                if st not in cleaned:
                    cleaned.append(st)
    return ', '.join(cleaned)

def build_catalog_excel():
    with open('scripts/products_raw.json', 'r', encoding='utf-8') as f:
        products = json.load(f)

    # Sort products by ID
    def sort_key(p):
        pid = str(p.get('id', '0'))
        try:
            return (0, int(pid))
        except:
            return (1, pid)
            
    products.sort(key=sort_key)

    output_filename = 'Boutique_Product_Catalog.xlsx'
    
    workbook = xlsxwriter.Workbook(output_filename)
    worksheet = workbook.add_worksheet('Products Catalog')
    
    # Formats
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#4A2E35', # Elegant brand plum/burgundy
        'font_color': '#FFFFFF',
        'font_name': 'Calibri',
        'font_size': 11,
        'align': 'center',
        'valign': 'vcenter',
        'border': 1,
        'text_wrap': True
    })
    
    cell_center = workbook.add_format({
        'align': 'center',
        'valign': 'vcenter',
        'font_name': 'Calibri',
        'font_size': 10,
        'border': 1
    })

    cell_left = workbook.add_format({
        'align': 'left',
        'valign': 'vcenter',
        'font_name': 'Calibri',
        'font_size': 10,
        'border': 1,
        'text_wrap': True
    })

    price_format = workbook.add_format({
        'align': 'right',
        'valign': 'vcenter',
        'font_name': 'Calibri',
        'font_size': 10,
        'border': 1,
        'num_format': '₹#,##0'
    })

    percent_format = workbook.add_format({
        'align': 'center',
        'valign': 'vcenter',
        'font_name': 'Calibri',
        'font_size': 10,
        'border': 1,
        'num_format': '0"%"'
    })

    badge_category_format = workbook.add_format({
        'align': 'center',
        'valign': 'vcenter',
        'font_name': 'Calibri',
        'font_size': 10,
        'bold': True,
        'border': 1,
        'bg_color': '#FAF3F5',
        'font_color': '#8B4254'
    })

    headers = [
        'Product ID',
        'Image 1',
        'Image 2',
        'Image 3',
        'Image 4',
        'Image 5',
        'Product Name',
        'Description',
        'Original Price (₹)',
        'Discount (%)',
        'Discounted Price (₹)',
        'Tags',
        'Category'
    ]

    # Set Column Widths
    worksheet.set_column('A:A', 18) # Product ID
    worksheet.set_column('B:F', 15) # Image 1 to Image 5
    worksheet.set_column('G:G', 26) # Product Name
    worksheet.set_column('H:H', 48) # Description
    worksheet.set_column('I:I', 18) # Original Price
    worksheet.set_column('J:J', 14) # Discount %
    worksheet.set_column('K:K', 20) # Discounted Price
    worksheet.set_column('L:L', 38) # Tags
    worksheet.set_column('M:M', 18) # Category

    # Write Header Row
    worksheet.set_row(0, 32)
    for col_num, header in enumerate(headers):
        worksheet.write(0, col_num, header, header_format)

    # Freeze top row
    worksheet.freeze_panes(1, 0)
    # Enable Autofilters
    worksheet.autofilter(0, 0, len(products), len(headers) - 1)

    thumb_dir = 'scripts/thumbnails'
    row_height = 85 # points

    for row_idx, p in enumerate(products, start=1):
        worksheet.set_row(row_idx, row_height)
        pid = str(p.get('id', ''))
        name = p.get('name', '')
        desc = p.get('description', '')
        
        # Price calculations
        try:
            orig_price = float(p.get('price', 0))
        except:
            orig_price = 0.0

        is_flash = bool(p.get('flash_sale') or p.get('on_sale') or ('flash-sale' in (p.get('collection_slugs') or [])))
        raw_flash_price = p.get('flash_sale_price')
        
        if is_flash and raw_flash_price:
            try:
                disc_price = float(raw_flash_price)
                discount_pct = round(((orig_price - disc_price) / orig_price) * 100) if orig_price > 0 else 0
            except:
                disc_price = orig_price
                discount_pct = 0
        elif is_flash and not raw_flash_price:
            disc_price = round(orig_price * 0.8)
            discount_pct = 20
        else:
            disc_price = orig_price
            discount_pct = None

        tags_str = format_tags(p.get('tags'))
        category = get_product_category(p)

        # 1. Product ID
        worksheet.write(row_idx, 0, pid, cell_center)

        # 2. Images (Columns 1 to 5 -> B to F)
        imgs = p.get('images') or []
        for img_slot in range(5):
            col_pos = 1 + img_slot
            if img_slot < len(imgs) and imgs[img_slot]:
                thumb_filename = f"{pid}_img{img_slot}.jpg"
                thumb_path = os.path.join(thumb_dir, thumb_filename)
                
                # Check if thumbnail exists
                if os.path.exists(thumb_path):
                    # Write empty cell with border
                    worksheet.write(row_idx, col_pos, '', cell_center)
                    
                    # Calculate scaling to fit nicely inside cell (max width 95px, max height 95px)
                    with Image.open(thumb_path) as im:
                        w, h = im.size
                    
                    max_w, max_h = 92.0, 92.0
                    scale = min(max_w / w, max_h / h)
                    
                    # Center the image in cell
                    x_offset = max(2, int((105 - (w * scale)) / 2))
                    y_offset = max(4, int((108 - (h * scale)) / 2))
                    
                    worksheet.insert_image(row_idx, col_pos, thumb_path, {
                        'x_scale': scale,
                        'y_scale': scale,
                        'x_offset': x_offset,
                        'y_offset': y_offset,
                        'object_position': 1
                    })
                else:
                    worksheet.write(row_idx, col_pos, '', cell_center)
            else:
                worksheet.write(row_idx, col_pos, '', cell_center)

        # 3. Product Name
        worksheet.write(row_idx, 6, name, cell_left)

        # 4. Description
        worksheet.write(row_idx, 7, desc, cell_left)

        # 5. Original Price
        worksheet.write_number(row_idx, 8, orig_price, price_format)

        # 6. Discount %
        if discount_pct is not None and discount_pct > 0:
            worksheet.write_number(row_idx, 9, discount_pct, percent_format)
        else:
            worksheet.write(row_idx, 9, '', cell_center)

        # 7. Discounted Price
        worksheet.write_number(row_idx, 10, disc_price, price_format)

        # 8. Tags
        worksheet.write(row_idx, 11, tags_str, cell_left)

        # 9. Category
        worksheet.write(row_idx, 12, category, badge_category_format)

    workbook.close()
    print(f"Successfully generated {output_filename} with {len(products)} products!")

if __name__ == '__main__':
    build_catalog_excel()
