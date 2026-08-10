import os
import openpyxl
from PIL import Image as PILImage
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_cell_border(cell, **kwargs):
    """
    kwargs: top, bottom, left, right
    values: {"sz": 4, "val": "single", "color": "E2D9DC"}
    """
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    for edge, opts in kwargs.items():
        edge_el = parse_xml(f'<w:{edge} {nsdecls("w")} w:val="{opts.get("val", "single")}" w:sz="{opts.get("sz", "4")}" w:space="0" w:color="{opts.get("color", "E2D9DC")}"/>')
        tcBorders.append(edge_el)
    tcPr.append(tcBorders)

def create_word_catalog():
    print("Reading Excel catalog...")
    wb = openpyxl.load_workbook('Boutique_Product_Catalog_Sorted.xlsx', data_only=True)
    ws = wb['All Products (Sorted)']

    rows = list(ws.iter_rows(values_only=True))
    headers = rows[0]
    data_rows = rows[1:]

    doc = Document()

    # Configure Margins: 0.5 in for compact, clean 1-page per product layout
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.45)
        section.bottom_margin = Inches(0.45)
        section.left_margin = Inches(0.55)
        section.right_margin = Inches(0.55)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)

    # ----------------------------------------------------
    # COVER PAGE (PAGE 1)
    # ----------------------------------------------------
    cover_p1 = doc.add_paragraph()
    cover_p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover_p1.paragraph_format.space_before = Pt(80)
    cover_p1.paragraph_format.space_after = Pt(4)
    run_brand = cover_p1.add_run("HOUSE OF GINIJA")
    run_brand.font.name = "Georgia"
    run_brand.font.size = Pt(30)
    run_brand.font.bold = True
    run_brand.font.color.rgb = RGBColor(185, 114, 133) # #B97285

    cover_p2 = doc.add_paragraph()
    cover_p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover_p2.paragraph_format.space_before = Pt(0)
    cover_p2.paragraph_format.space_after = Pt(20)
    run_sub = cover_p2.add_run("LUXURY COUTURE & BESPOKE ETHNIC WEAR")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(10)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(100, 100, 100)

    # Decorative Line
    p_div = doc.add_paragraph()
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_div.paragraph_format.space_after = Pt(30)
    run_div = p_div.add_run("—" * 28)
    run_div.font.color.rgb = RGBColor(185, 114, 133)

    cover_p3 = doc.add_paragraph()
    cover_p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover_p3.paragraph_format.space_after = Pt(8)
    run_title = cover_p3.add_run("PRODUCT LOOKBOOK & CATALOG")
    run_title.font.name = "Georgia"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(45, 36, 41)

    cover_p4 = doc.add_paragraph()
    cover_p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover_p4.paragraph_format.space_after = Pt(40)
    run_desc = cover_p4.add_run("Complete Collection Breakdown with Primary Cover Photos & Specifications")
    run_desc.font.name = "Calibri"
    run_desc.font.size = Pt(11)
    run_desc.font.italic = True
    run_desc.font.color.rgb = RGBColor(120, 120, 120)

    # Meta Table on Cover Page
    table_meta = doc.add_table(rows=5, cols=2)
    table_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_meta.autofit = False

    meta_items = [
        ("Total Active Products", f"{len(data_rows)} Handcrafted Creations"),
        ("Categories Included", "Unstitched Suits, Drape Sarees, Heavy Gowns, Indo-Western, Co-ords"),
        ("Price Range", "Rs. 1 (Unconfirmed) to Rs. 38,000"),
        ("Catalog Version", "2026 Boutique Master Edition (Sorted)"),
        ("Source", "House of Ginija Official Admin Catalog"),
    ]

    for idx, (label, val) in enumerate(meta_items):
        row = table_meta.rows[idx]
        cell_l = row.cells[0]
        cell_r = row.cells[1]
        
        cell_l.width = Inches(2.2)
        cell_r.width = Inches(4.5)
        
        set_cell_margins(cell_l, top=120, bottom=120, left=150, right=150)
        set_cell_margins(cell_r, top=120, bottom=120, left=150, right=150)
        
        set_cell_background(cell_l, "F9F5F6" if idx % 2 == 0 else "FFFFFF")
        set_cell_background(cell_r, "F9F5F6" if idx % 2 == 0 else "FFFFFF")
        
        set_cell_border(cell_l, bottom={"sz": 4, "val": "single", "color": "E8DFE2"})
        set_cell_border(cell_r, bottom={"sz": 4, "val": "single", "color": "E8DFE2"})

        p_l = cell_l.paragraphs[0]
        p_l.paragraph_format.space_before = Pt(2)
        p_l.paragraph_format.space_after = Pt(2)
        r_l = p_l.add_run(label)
        r_l.font.name = "Calibri"
        r_l.font.size = Pt(10)
        r_l.font.bold = True
        r_l.font.color.rgb = RGBColor(185, 114, 133)

        p_r = cell_r.paragraphs[0]
        p_r.paragraph_format.space_before = Pt(2)
        p_r.paragraph_format.space_after = Pt(2)
        r_r = p_r.add_run(val)
        r_r.font.name = "Calibri"
        r_r.font.size = Pt(10)
        r_r.font.color.rgb = RGBColor(45, 36, 41)

    # ----------------------------------------------------
    # PRODUCT PAGES (1 PAGE PER PRODUCT)
    # ----------------------------------------------------
    print(f"Generating {len(data_rows)} product pages...")

    for idx, r in enumerate(data_rows):
        doc.add_page_break()

        p_id = str(r[0] or "")
        p_name = str(r[6] or "Untitled Product")
        p_desc = str(r[7] or "No description available.")
        orig_price = r[8]
        discount_pct = r[9]
        disc_price = r[10]
        tags = str(r[11] or "Untagged")
        category = str(r[12] or "Uncategorized")

        # Format Prices safely without raw unicode issue in docx
        if orig_price is not None:
            try:
                orig_price_str = f"Rs. {float(orig_price):,.0f}"
            except:
                orig_price_str = str(orig_price)
        else:
            orig_price_str = "N/A"

        if disc_price is not None:
            try:
                disc_price_str = f"Rs. {float(disc_price):,.0f}"
            except:
                disc_price_str = str(disc_price)
        else:
            disc_price_str = orig_price_str

        discount_str = f"{int(discount_pct)}% OFF" if discount_pct and float(discount_pct) > 0 else "Full Price"

        # 1. Product Header Bar
        p_hdr = doc.add_paragraph()
        p_hdr.paragraph_format.space_before = Pt(0)
        p_hdr.paragraph_format.space_after = Pt(1)

        # Category pill & ID badge
        r_cat = p_hdr.add_run(f"[{category.upper()}]  ")
        r_cat.font.name = "Calibri"
        r_cat.font.size = Pt(9.5)
        r_cat.font.bold = True
        r_cat.font.color.rgb = RGBColor(185, 114, 133)

        r_id = p_hdr.add_run(f"PRODUCT #{p_id}")
        r_id.font.name = "Calibri"
        r_id.font.size = Pt(9)
        r_id.font.color.rgb = RGBColor(130, 130, 130)

        # 2. Product Name
        p_title = doc.add_paragraph()
        p_title.paragraph_format.space_before = Pt(1)
        p_title.paragraph_format.space_after = Pt(6)
        r_name = p_title.add_run(p_name)
        r_name.font.name = "Georgia"
        r_name.font.size = Pt(17)
        r_name.font.bold = True
        r_name.font.color.rgb = RGBColor(45, 36, 41)

        # 3. Product Primary Cover Image (High-Res, Prominently Visible)
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

        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(2)
        p_img.paragraph_format.space_after = Pt(8)

        if found_img:
            # Check aspect ratio to size appropriately for 1-page fit
            try:
                with PILImage.open(found_img) as pil_im:
                    w, h = pil_im.size
                    aspect = h / w
                    # Max height 5.2 inches, max width 4.8 inches
                    if aspect > 1.2:
                        doc.add_picture = p_img.add_run().add_picture(found_img, height=Inches(4.9))
                    else:
                        doc.add_picture = p_img.add_run().add_picture(found_img, width=Inches(4.6))
            except Exception as e:
                p_img.add_run().add_picture(found_img, height=Inches(4.8))
        else:
            r_noimg = p_img.add_run("[ Primary Image Not Available ]")
            r_noimg.font.color.rgb = RGBColor(180, 180, 180)

        # 4. Product Details Specification Table
        table_prod = doc.add_table(rows=3, cols=2)
        table_prod.alignment = WD_TABLE_ALIGNMENT.CENTER
        table_prod.autofit = False

        # Row 1: Pricing Breakdown
        cell_p1 = table_prod.rows[0].cells[0]
        cell_p2 = table_prod.rows[0].cells[1]
        cell_p1.width = Inches(3.6)
        cell_p2.width = Inches(3.6)
        set_cell_background(cell_p1, "FDF8F9")
        set_cell_background(cell_p2, "FDF8F9")
        set_cell_margins(cell_p1, top=80, bottom=80, left=120, right=120)
        set_cell_margins(cell_p2, top=80, bottom=80, left=120, right=120)
        set_cell_border(cell_p1, bottom={"sz": 4, "val": "single", "color": "E2D9DC"}, top={"sz": 4, "val": "single", "color": "E2D9DC"})
        set_cell_border(cell_p2, bottom={"sz": 4, "val": "single", "color": "E2D9DC"}, top={"sz": 4, "val": "single", "color": "E2D9DC"})

        p_price1 = cell_p1.paragraphs[0]
        p_price1.paragraph_format.space_before = Pt(0)
        p_price1.paragraph_format.space_after = Pt(0)
        r_plbl = p_price1.add_run("Original Price: ")
        r_plbl.font.name = "Calibri"
        r_plbl.font.size = Pt(9.5)
        r_plbl.font.color.rgb = RGBColor(100, 100, 100)
        r_pval = p_price1.add_run(orig_price_str)
        r_pval.font.name = "Calibri"
        r_pval.font.size = Pt(10)
        r_pval.font.bold = True
        r_pval.font.color.rgb = RGBColor(45, 36, 41)

        p_price2 = cell_p2.paragraphs[0]
        p_price2.paragraph_format.space_before = Pt(0)
        p_price2.paragraph_format.space_after = Pt(0)
        r_dlbl = p_price2.add_run("Selling Price: ")
        r_dlbl.font.name = "Calibri"
        r_dlbl.font.size = Pt(9.5)
        r_dlbl.font.color.rgb = RGBColor(100, 100, 100)
        r_dval = p_price2.add_run(disc_price_str)
        r_dval.font.name = "Calibri"
        r_dval.font.size = Pt(10.5)
        r_dval.font.bold = True
        r_dval.font.color.rgb = RGBColor(185, 114, 133)
        if discount_pct and float(discount_pct) > 0:
            r_dpct = p_price2.add_run(f"  ({discount_str})")
            r_dpct.font.name = "Calibri"
            r_dpct.font.size = Pt(9)
            r_dpct.font.bold = True
            r_dpct.font.color.rgb = RGBColor(40, 140, 60)

        # Row 2: Category & Tags
        cell_c1 = table_prod.rows[1].cells[0]
        cell_c2 = table_prod.rows[1].cells[1]
        cell_c1.width = Inches(3.6)
        cell_c2.width = Inches(3.6)
        set_cell_background(cell_c1, "FFFFFF")
        set_cell_background(cell_c2, "FFFFFF")
        set_cell_margins(cell_c1, top=80, bottom=80, left=120, right=120)
        set_cell_margins(cell_c2, top=80, bottom=80, left=120, right=120)
        set_cell_border(cell_c1, bottom={"sz": 4, "val": "single", "color": "E2D9DC"})
        set_cell_border(cell_c2, bottom={"sz": 4, "val": "single", "color": "E2D9DC"})

        p_cat = cell_c1.paragraphs[0]
        p_cat.paragraph_format.space_before = Pt(0)
        p_cat.paragraph_format.space_after = Pt(0)
        r_clbl = p_cat.add_run("Category: ")
        r_clbl.font.name = "Calibri"
        r_clbl.font.size = Pt(9.5)
        r_clbl.font.color.rgb = RGBColor(100, 100, 100)
        r_cval = p_cat.add_run(category)
        r_cval.font.name = "Calibri"
        r_cval.font.size = Pt(9.5)
        r_cval.font.bold = True
        r_cval.font.color.rgb = RGBColor(45, 36, 41)

        p_tag = cell_c2.paragraphs[0]
        p_tag.paragraph_format.space_before = Pt(0)
        p_tag.paragraph_format.space_after = Pt(0)
        r_tlbl = p_tag.add_run("Tags / Attributes: ")
        r_tlbl.font.name = "Calibri"
        r_tlbl.font.size = Pt(9.5)
        r_tlbl.font.color.rgb = RGBColor(100, 100, 100)
        r_tval = p_tag.add_run(tags)
        r_tval.font.name = "Calibri"
        r_tval.font.size = Pt(9.5)
        r_tval.font.italic = (tags == "Untagged")
        r_tval.font.color.rgb = RGBColor(120, 120, 120) if tags == "Untagged" else RGBColor(45, 36, 41)

        # Row 3: Description spanning both columns
        cell_d = table_prod.rows[2].cells[0]
        cell_d_dummy = table_prod.rows[2].cells[1]
        cell_d.merge(cell_d_dummy)
        cell_d.width = Inches(7.2)
        set_cell_background(cell_d, "FDFBFB")
        set_cell_margins(cell_d, top=80, bottom=80, left=120, right=120)
        set_cell_border(cell_d, bottom={"sz": 4, "val": "single", "color": "E2D9DC"})

        p_desc_el = cell_d.paragraphs[0]
        p_desc_el.paragraph_format.space_before = Pt(0)
        p_desc_el.paragraph_format.space_after = Pt(0)
        r_dlbl2 = p_desc_el.add_run("Description: ")
        r_dlbl2.font.name = "Calibri"
        r_dlbl2.font.size = Pt(9.5)
        r_dlbl2.font.bold = True
        r_dlbl2.font.color.rgb = RGBColor(100, 100, 100)
        r_dtxt = p_desc_el.add_run(p_desc)
        r_dtxt.font.name = "Calibri"
        r_dtxt.font.size = Pt(9)
        r_dtxt.font.color.rgb = RGBColor(60, 60, 60)

    output_filename = "Boutique_Product_Catalog_Sorted.docx"
    doc.save(output_filename)
    print(f"Successfully created '{output_filename}' with {len(data_rows) + 1} pages!")

if __name__ == "__main__":
    create_word_catalog()
