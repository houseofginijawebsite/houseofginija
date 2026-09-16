import os, sys, json
from PIL import Image as PILImage
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.drawing.image import Image as OpenPyxlImage

def build_full_catalog_excel():
    print("Building full catalog spreadsheet with 85 catalog products + 27 unknown WhatsApp images...")

    # Load existing sorted catalog data
    wb_orig = openpyxl.load_workbook('Boutique_Product_Catalog_Sorted.xlsx', data_only=True)
    ws_orig = wb_orig['All Products (Sorted)']
    orig_rows = list(ws_orig.iter_rows(values_only=True))[1:]
    print(f"Loaded {len(orig_rows)} active catalog products.")

    # Load 27 unknown images
    unk_dir = r'c:\Users\varun\OneDrive\Documents\houseofginija\images\WhatsApp Unknown 2026-09-13 at 2.13.27 PM'
    unk_files = sorted([f for f in os.listdir(unk_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
    print(f"Loaded {len(unk_files)} unknown image files.")

    # Create new workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Full Catalog & New Arrivals"

    # Define headers
    headers = [
        "Product Image",
        "Product ID",
        "Product Name",
        "Selling Price (₹)",
        "Original Price (₹)",
        "Discount (%)",
        "Tags",
        "Category",
        "Description"
    ]

    ws.append(headers)

    # Style Header Row
    header_fill = PatternFill(start_color="B97285", end_color="B97285", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    ws.row_dimensions[1].height = 32

    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_align

    # Styling helper borders
    thin_border = Border(
        left=Side(style='thin', color='E2D9DC'),
        right=Side(style='thin', color='E2D9DC'),
        top=Side(style='thin', color='E2D9DC'),
        bottom=Side(style='thin', color='E2D9DC')
    )

    alt_fill = PatternFill(start_color="FDFBFB", end_color="FDFBFB", fill_type="solid")
    white_fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

    font_regular = Font(name="Calibri", size=10, color="2D2429")
    font_bold = Font(name="Calibri", size=10, bold=True, color="2D2429")
    font_price = Font(name="Calibri", size=10.5, bold=True, color="B97285")

    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")
    align_wrap = Alignment(horizontal="left", vertical="center", wrap_text=True)

    # Create thumbnail output directory
    thumb_dir = 'scripts/thumbnails_full'
    os.makedirs(thumb_dir, exist_ok=True)

    row_idx = 2

    # ----------------------------------------------------
    # SECTION 1: ACTIVE CATALOG PRODUCTS (85 PRODUCTS)
    # ----------------------------------------------------
    for r in orig_rows:
        p_id = str(r[0] or "")
        p_name = str(r[6] or "")
        p_desc = str(r[7] or "")
        orig_price = r[8]
        discount_pct = r[9]
        disc_price = r[10]
        tags = str(r[11] or "")
        category = str(r[12] or "")

        ws.row_dimensions[row_idx].height = 85

        # Fill values
        ws.cell(row=row_idx, column=2, value=p_id).alignment = align_center # Product ID
        ws.cell(row=row_idx, column=3, value=p_name).alignment = align_left # Product Name

        c_disc = ws.cell(row=row_idx, column=4, value=disc_price)
        c_disc.alignment = align_right
        c_disc.number_format = '₹#,##0'
        c_disc.font = font_price

        c_orig = ws.cell(row=row_idx, column=5, value=orig_price)
        c_orig.alignment = align_right
        c_orig.number_format = '₹#,##0'

        c_pct = ws.cell(row=row_idx, column=6, value=discount_pct)
        c_pct.alignment = align_center
        if discount_pct and float(discount_pct) > 0:
            c_pct.number_format = '0"%"'

        ws.cell(row=row_idx, column=7, value=tags).alignment = align_left
        ws.cell(row=row_idx, column=8, value=category).alignment = align_left
        ws.cell(row=row_idx, column=9, value=p_desc).alignment = align_wrap

        # Find primary image thumbnail
        img_candidates = [
            f"scripts/extracted_images/{p_id}_img0.jpg",
            f"scripts/extracted_images/{p_id}_img0.png",
            f"scripts/extracted_images/{p_id}_img0.jpeg",
            f"scripts/extracted_images/{p_id}_img1.jpg",
        ]
        found_img = None
        for cand in img_candidates:
            if os.path.exists(cand):
                found_img = cand
                break

        if found_img:
            try:
                thumb_path = os.path.join(thumb_dir, f"catalog_{p_id}.jpg")
                with PILImage.open(found_img) as im:
                    im = im.convert('RGB')
                    im.thumbnail((105, 105))
                    im.save(thumb_path, 'JPEG', quality=85)
                
                img_obj = OpenPyxlImage(thumb_path)
                ws.add_image(img_obj, f"A{row_idx}")
            except Exception as e:
                print(f"Error thumbnailing product {p_id}: {e}")

        # Format row borders & fonts
        fill_row = alt_fill if row_idx % 2 == 0 else white_fill
        for c in range(1, 10):
            cell = ws.cell(row=row_idx, column=c)
            cell.border = thin_border
            if c != 4: # Keep custom price font
                cell.font = font_regular if c != 2 and c != 3 else font_bold
            if cell.fill.fill_type is None:
                cell.fill = fill_row

        row_idx += 1

    # ----------------------------------------------------
    # SECTION 2: 27 UNKNOWN WHATSAPP IMAGES (READY TO FILL)
    # ----------------------------------------------------
    print("Appending 27 WhatsApp unknown images...")

    for i, file_name in enumerate(unk_files, 1):
        full_img_path = os.path.join(unk_dir, file_name)
        unk_id = f"UNK-{i:02d}"

        ws.row_dimensions[row_idx].height = 85

        # Product ID column
        c_id = ws.cell(row=row_idx, column=2, value=unk_id)
        c_id.alignment = align_center
        c_id.font = Font(name="Calibri", size=10, bold=True, color="B97285")

        # Leave Name, Price, Tags, Category, Description EMPTY for user to fill!
        ws.cell(row=row_idx, column=3, value="").alignment = align_left # Name (Blank)
        
        c_disc = ws.cell(row=row_idx, column=4, value=None) # Selling Price (Blank)
        c_disc.number_format = '₹#,##0'
        
        c_orig = ws.cell(row=row_idx, column=5, value=None) # Original Price (Blank)
        c_orig.number_format = '₹#,##0'
        
        c_pct = ws.cell(row=row_idx, column=6, value=None) # Discount % (Blank)
        c_pct.number_format = '0"%"'
        
        ws.cell(row=row_idx, column=7, value="").alignment = align_left # Tags (Blank)
        ws.cell(row=row_idx, column=8, value="").alignment = align_left # Category (Blank)
        ws.cell(row=row_idx, column=9, value="").alignment = align_wrap # Description (Blank)

        # Generate thumbnail for unknown image
        if os.path.exists(full_img_path):
            try:
                thumb_path = os.path.join(thumb_dir, f"unk_{i:02d}.jpg")
                with PILImage.open(full_img_path) as im:
                    im = im.convert('RGB')
                    im.thumbnail((105, 105))
                    im.save(thumb_path, 'JPEG', quality=85)

                img_obj = OpenPyxlImage(thumb_path)
                ws.add_image(img_obj, f"A{row_idx}")
            except Exception as e:
                print(f"Error thumbnailing unknown image {file_name}: {e}")

        # Format row borders & background
        fill_row = PatternFill(start_color="FFF9FA", end_color="FFF9FA", fill_type="solid") if row_idx % 2 == 0 else PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        for c in range(1, 10):
            cell = ws.cell(row=row_idx, column=c)
            cell.border = thin_border
            cell.fill = fill_row
            if c != 2:
                cell.font = font_regular

        row_idx += 1

    # Column width formatting
    ws.column_dimensions['A'].width = 16 # Image column
    ws.column_dimensions['B'].width = 15 # Product ID
    ws.column_dimensions['C'].width = 34 # Product Name
    ws.column_dimensions['D'].width = 18 # Selling Price
    ws.column_dimensions['E'].width = 18 # Original Price
    ws.column_dimensions['F'].width = 14 # Discount %
    ws.column_dimensions['G'].width = 28 # Tags
    ws.column_dimensions['H'].width = 22 # Category
    ws.column_dimensions['I'].width = 45 # Description

    # Set freeze panes and autofilter
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = f"A1:I{row_idx-1}"
    ws.views.sheetView[0].showGridLines = True

    output_filename = "Boutique_Product_Catalog_Full_Master.xlsx"
    wb.save(output_filename)
    print(f"Successfully generated '{output_filename}' with {row_idx-1} rows ({len(orig_rows)} active products + {len(unk_files)} unknown ready-to-fill products)!")

if __name__ == "__main__":
    build_full_catalog_excel()
