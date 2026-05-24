import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import tempfile
import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def generate_excel_report(incidents):
    """Generates a professional Excel report including AI analysis and 'Happened At' timestamps."""
    data = [{
        "Event Date": i.happened_at.strftime("%Y-%m-%d %H:%M") if i.happened_at else "Unknown",
        "Sync Date": i.date_collected.strftime("%Y-%m-%d %H:%M"),
        "Title": i.title,
        "Severity": i.severity or "Low",
        "Attack Type": i.attack_type or "Unknown",
        "Country": i.country,
        "Financial Sector": i.financial_sector if i.is_financial else "N/A",
        "AI Impact Summary": i.impact_summary or "Analyzing...",
        "Source": i.source,
        "Link": i.link
    } for i in incidents]
    
    df = pd.DataFrame(data)
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, "cyber_intelligence_report.xlsx")
    df.to_excel(file_path, index=False)
    return file_path


def _draw_report_header_footer(canvas, doc):
    """Helper to draw header/footer on every page."""
    canvas.saveState()
    width, height = letter
    
    # Footer
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(colors.grey)
    canvas.drawCentredString(width / 2, 30, f"Page {canvas.getPageNumber()} | Confidential Security intelligence | Official Report by Shivam Mishra")
    
    # Header Accent
    canvas.setFillColor(colors.HexColor("#4f46e5"))
    canvas.rect(0, height - 2, width, 2, fill=1)
    
    # Subtle Watermark
    canvas.setFont("Helvetica-Bold", 60)
    canvas.saveState()
    canvas.translate(width/2, height/2)
    canvas.rotate(45)
    canvas.setFillColor(colors.grey, alpha=0.03)
    canvas.drawCentredString(0, 0, "SHIVAM MISHRA")
    canvas.restoreState()
    
    canvas.restoreState()

def generate_pdf_report(incidents, report_title="Cyber Intelligence Report"):
    """Generates a professional, high-fidelity PDF report with full intelligence details."""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, "cyber_intelligence.pdf")
    
    doc = SimpleDocTemplate(
        file_path, 
        pagesize=letter,
        rightMargin=50, leftMargin=50,
        topMargin=70, bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=26,
        textColor=colors.HexColor("#0a0e17"),
        alignment=TA_LEFT,
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.grey,
        spaceAfter=30
    )
    
    incident_title_style = ParagraphStyle(
        'IncidentTitle',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=colors.HexColor("#1e1b4b"),
        spaceBefore=15,
        spaceAfter=5
    )
    
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
        fontName='Helvetica-Oblique'
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceBefore=8,
        spaceAfter=10
    )

    severity_styles = {
        "CRITICAL": ParagraphStyle('Crit', parent=body_style, textColor=colors.red, fontName='Helvetica-Bold'),
        "HIGH": ParagraphStyle('High', parent=body_style, textColor=colors.orange, fontName='Helvetica-Bold'),
        "MEDIUM": ParagraphStyle('Med', parent=body_style, textColor=colors.HexColor("#b45309"), fontName='Helvetica-Bold'),
        "LOW": ParagraphStyle('Low', parent=body_style, textColor=colors.HexColor("#059669"), fontName='Helvetica-Bold'),
    }

    elements = []
    
    # Report Header
    elements.append(Paragraph(report_title.upper(), title_style))
    elements.append(Paragraph(f"GLOBAL THREAT INTELLIGENCE FEED | GENERATED: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}", subtitle_style))
    elements.append(Spacer(1, 10))

    for idx, i in enumerate(incidents):
        severity = (i.severity or "Low").upper()
        sev_style = severity_styles.get(severity, severity_styles["LOW"])
        
        # Incident Title
        elements.append(Paragraph(f"#{idx+1} {i.title}", incident_title_style))
        
        # Metadata Row
        happened_str = i.happened_at.strftime("%Y-%m-%d %H:%M") if i.happened_at else "Recent"
        meta_text = f"<b>STATUS:</b> <font color='{sev_style.textColor}'>{severity}</font> | <b>DATE:</b> {happened_str} | <b>SOURCE:</b> {i.source} | <b>TARGET:</b> {i.country}"
        elements.append(Paragraph(meta_text, meta_style))
        
        # Intelligence Summary (NOT TRUNCATED)
        summary_text = i.ai_summary or i.impact_summary or i.description or "No detailed analysis available."
        elements.append(Paragraph(summary_text, body_style))
        
        # Separator line
        elements.append(Spacer(1, 5))
        line_table = Table([['']], colWidths=[letter[0]-100], rowHeights=[1])
        line_table.setStyle(TableStyle([('LINEBELOW', (0,0), (-1,-1), 0.5, colors.lightgrey)]))
        elements.append(line_table)
        elements.append(Spacer(1, 10))

    doc.build(elements, onFirstPage=_draw_report_header_footer, onLaterPages=_draw_report_header_footer)
    return file_path


def generate_single_impact_pdf(report, mitre_mappings, forensic_content=None):
    """Generates a detailed, premium PDF for a single AI Impact Analysis report."""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"AI_Impact_Report_{report.id}.pdf")
    
    doc = SimpleDocTemplate(
        file_path, 
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=60, bottomMargin=50
    )
    styles = getSampleStyleSheet()
    
    # Custom premium styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#1e1b4b"), # Deep navy
        alignment=TA_CENTER,
        spaceAfter=25
    )
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor("#4f46e5"), # Indigo accent
        fontName='Helvetica-Bold',
        spaceBefore=15,
        spaceAfter=10,
        borderPadding=5,
        borderWidth=0,
        leftIndent=0,
        textTransform='uppercase'
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY
    )
    
    elements = []
    
    # Top ID Banner
    id_text = f"<font color='#4f46e5'><b>AI IMPACT ANALYSIS</b></font> | REPORT #{report.id} | INCIDENT #{report.incident_id}"
    elements.append(Paragraph(id_text, ParagraphStyle('IDStyle', parent=styles['Normal'], alignment=TA_CENTER, fontSize=9, textColor=colors.grey)))
    elements.append(Spacer(1, 20))
    
    # Title
    elements.append(Paragraph(report.incident_title or "Cyber Impact Forensic Deep-Dive", title_style))
    
    # Metadata Grid (Table)
    incident = getattr(report, 'incident', None)
    if incident:
        sev = (incident.severity or "Low").upper()
        sev_color = "#ef4444" if sev == "CRITICAL" else ("#f59e0b" if sev == "HIGH" else "#6366f1")
        
        source_para = f"{incident.source or 'Unknown'} (<a href='{incident.link}' color='blue'>Source Link</a>)" if incident.link else (incident.source or "Unknown")
        meta_data = [
            [Paragraph("<b>SOURCE</b>", body_style), Paragraph(source_para, body_style)],
            [Paragraph("<b>SEVERITY</b>", body_style), Paragraph(f"<font color='{sev_color}'><b>{sev}</b></font>", body_style)],
            [Paragraph("<b>ENTITY</b>", body_style), Paragraph(incident.target_entity or incident.country, body_style)],
            [Paragraph("<b>INCIDENT DATE</b>", body_style), Paragraph(incident.happened_at.strftime("%Y-%m-%d %H:%M") if incident.happened_at else "Unknown", body_style)],
            [Paragraph("<b>CAPTURED DATE</b>", body_style), Paragraph(incident.date_collected.strftime("%Y-%m-%d %H:%M"), body_style)],
            [Paragraph("<b>METHOD</b>", body_style), Paragraph(report.breach_method or "Unknown", body_style)]
        ]
        t = Table(meta_data, colWidths=[120, 360])
        t.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f9fafb")),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 20))

    # Intelligence Summary
    if incident and (incident.ai_summary or incident.description):
        elements.append(Paragraph("INTELLIGENCE SUMMARY", header_style))
        summary_text = incident.ai_summary or incident.description
        elements.append(Paragraph(summary_text, body_style))
        elements.append(Spacer(1, 15))

    # AI Forensic Deep-Dive Analysis (optional)
    if forensic_content:
        forensic_header = ParagraphStyle(
            'ForensicHeader',
            parent=header_style,
            textColor=colors.HexColor("#7c3aed"),  # Purple accent
        )
        forensic_body = ParagraphStyle(
            'ForensicBody',
            parent=body_style,
            fontSize=10,
            leading=15,
            spaceBefore=5,
            spaceAfter=5
        )
        elements.append(Paragraph("AI FORENSIC ANALYSIS (DEEP-DIVE)", forensic_header))
        # Split long content into paragraphs for better formatting
        for paragraph in forensic_content.split('\n'):
            paragraph = paragraph.strip()
            if paragraph:
                elements.append(Paragraph(paragraph, forensic_body))
        elements.append(Spacer(1, 20))

    # Source Evidence
    if incident and incident.link:
        elements.append(Paragraph("SOURCE EVIDENCE", header_style))
        elements.append(Paragraph(f"<b>Intelligence Link:</b> <font color='blue'>{incident.link}</font>", body_style))
        elements.append(Spacer(1, 15))
    
    # Executive Summary
    elements.append(Paragraph("EXECUTIVE SUMMARY", header_style))
    elements.append(Paragraph(report.official_report or "No official report generated.", body_style))
    elements.append(Spacer(1, 20))
    
    # Impact Analysis Table
    elements.append(Paragraph("BUSINESS IMPACT ANALYSIS", header_style))
    impact_data = [
        [Paragraph("<b>BUSINESS IMPACT</b>", body_style), Paragraph(report.business_impact or "N/A", body_style)],
        [Paragraph("<b>OPERATIONAL</b>", body_style), Paragraph(report.operational_impact or "N/A", body_style)],
        [Paragraph("<b>FINANCIAL</b>", body_style), Paragraph(report.financial_impact or "N/A", body_style)],
        [Paragraph("<b>REPUTATIONAL</b>", body_style), Paragraph(report.reputational_impact or "N/A", body_style)]
    ]
    it = Table(impact_data, colWidths=[120, 360])
    it.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
    ]))
    elements.append(it)
    elements.append(Spacer(1, 25))
    
    # Technical Vectors
    elements.append(Paragraph("TECHNICAL VECTORS", header_style))
    vectors_info = [
        f"<b>Root Cause:</b> {report.root_cause or 'Unknown'}",
        f"<b>Attack Type:</b> {report.attack_type or 'Unknown'}",
        f"<b>Breach Method:</b> {report.breach_method or 'Unknown'}"
    ]
    for info in vectors_info:
        elements.append(Paragraph(info, body_style))
        elements.append(Spacer(1, 5))
    
    # Data Exposure
    elements.append(Paragraph("DATA EXPOSURE", header_style))
    exposure_info = [
        f"<b>Data Involved:</b> {report.data_involved or 'Unknown'}",
        f"<b>Classification:</b> {report.data_classification or 'Unknown'}",
        f"<b>Affected Entities:</b> {report.affected_customers or 'Unknown'}"
    ]
    for info in exposure_info:
        elements.append(Paragraph(info, body_style))
        elements.append(Spacer(1, 5))
    
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("DEEP-DIVE ANALYSIS", header_style))
    elements.append(Paragraph(report.technical_analysis or "No technical analysis available.", body_style))
    elements.append(Spacer(1, 25))
    
    # MITRE Mapping
    if mitre_mappings:
        elements.append(Paragraph("MITRE ATT&CK INTELLIGENCE MAPPING", header_style))
        for m in mitre_mappings:
            elements.append(Paragraph(f"<b>{m.tactic}</b> - {m.technique_id}: {m.technique_name}", body_style))
            elements.append(Paragraph(f"<i>{m.analysis_justification}</i>", ParagraphStyle('Justify', parent=body_style, fontSize=9, textColor=colors.grey, leftIndent=15)))
            elements.append(Spacer(1, 8))
        elements.append(Spacer(1, 20))
    
    # Breach Process
    elements.append(Paragraph("BREACH TIMELINE & PROCESS", header_style))
    process_data = report.breach_process
    steps = []
    if process_data:
        import json
        try:
            parsed = json.loads(process_data)
            if isinstance(parsed, list):
                steps = parsed
            elif isinstance(parsed, dict):
                steps = list(parsed.values())
        except Exception:
            if isinstance(process_data, str):
                steps = [s.strip() for s in process_data.split('\n') if s.strip()]
    
    if steps:
        for idx, step in enumerate(steps, 1):
            step_text = f"<b>{idx}.</b> {step}"
            elements.append(Paragraph(step_text, body_style))
            elements.append(Spacer(1, 4))
    else:
        elements.append(Paragraph("No timeline available.", body_style))
    elements.append(Spacer(1, 20))

    # Executive Statement
    elements.append(Paragraph("EXECUTIVE STATEMENT", header_style))
    elements.append(Paragraph(f'"{report.official_report}"', ParagraphStyle('ExecStyle', parent=body_style, fontName='Helvetica-Oblique')))
    elements.append(Spacer(1, 20))
    
    # Crawled Intelligence Source Content
    if incident and incident.crawled_content:
        elements.append(Paragraph("CRAWLED INTELLIGENCE SOURCE CONTENT", header_style))
        for p_text in incident.crawled_content.split('\n'):
            p_text = p_text.strip()
            if p_text:
                elements.append(Paragraph(p_text, ParagraphStyle('CrawledStyle', parent=body_style, fontSize=9, textColor=colors.HexColor("#4b5563"))))
                elements.append(Spacer(1, 4))
        elements.append(Spacer(1, 20))
    
    # Footer Section
    elements.append(Spacer(1, 40))
    elements.append(Paragraph("________________________________________________", styles['Normal']))
    elements.append(Paragraph("CONFIDENTIAL SECURITY INTELLIGENCE REPORT", styles['Normal']))
    elements.append(Paragraph("Cyber Incident Intelligence Command Center | Created By Shivam Mishra", styles['Normal']))
    
    doc.build(elements, onFirstPage=_draw_report_header_footer, onLaterPages=_draw_report_header_footer)
    return file_path


def generate_single_impact_docx(report, mitre_mappings, forensic_content=None):
    """Generates a professional Word document for a single AI Impact Analysis report."""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"AI_Impact_Report_{report.id}.docx")
    
    doc = Document()
    
    # Title
    doc.add_heading('CYBER IMPACT FORENSIC REPORT', 0).alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_heading(report.incident_title or "Incident Analysis Deep-Dive", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Header Info
    p = doc.add_paragraph()
    p.add_run(f"REPORT ID: #{report.id} | INCIDENT ID: #{report.incident_id}\n").bold = True
    p.add_run(f"CONFIDENTIAL SECURITY INTELLIGENCE\n")
    p.add_run(f"Generated on: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}")
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    
    # Metadata Table
    incident = getattr(report, 'incident', None)
    doc.add_heading('INCIDENT METADATA', level=2)
    table = doc.add_table(rows=3, cols=4)
    table.style = 'Table Grid'
    
    def fill_cell(r, c, label, value):
        cell = table.cell(r, c)
        cell.text = label
        run = cell.paragraphs[0].runs[0]
        run.bold = True
        run.font.size = Pt(9)
        
        cell = table.cell(r, c+1)
        cell.text = str(value or "N/A")
        cell.paragraphs[0].runs[0].font.size = Pt(9)

    if incident:
        source_val = f"{incident.source or 'Unknown'} (Link: {incident.link})" if incident.link else (incident.source or "Unknown")
        fill_cell(0, 0, "Source:", source_val)
        fill_cell(0, 2, "Severity:", (incident.severity or "Low").upper())
        fill_cell(1, 0, "Entity:", incident.target_entity or incident.country)
        fill_cell(1, 2, "Incident Date:", incident.happened_at.strftime("%Y-%m-%d %H:%M") if incident.happened_at else "Recent")
        fill_cell(2, 0, "Captured Date:", incident.date_collected.strftime("%Y-%m-%d %H:%M"))
        fill_cell(2, 2, "Breach Method:", report.breach_method)

    doc.add_paragraph()
    
    # Intelligence Summary & Evidence
    if incident:
        doc.add_heading('INTELLIGENCE SUMMARY', level=2)
        doc.add_paragraph(incident.ai_summary or incident.description or "N/A")
        
        if incident.link:
            doc.add_heading('SOURCE EVIDENCE', level=2)
            p = doc.add_paragraph()
            p.add_run("Intelligence Link: ").bold = True
            p.add_run(incident.link)
    
    # AI Forensic Deep-Dive Analysis (optional)
    if forensic_content:
        doc.add_heading('AI FORENSIC ANALYSIS (DEEP-DIVE)', level=2)
        for paragraph in forensic_content.split('\n'):
            paragraph = paragraph.strip()
            if paragraph:
                p = doc.add_paragraph(paragraph)
                for run in p.runs:
                    run.font.size = Pt(10)
        doc.add_paragraph()  # spacer

    # Executive Summary
    doc.add_heading('EXECUTIVE SUMMARY', level=2)
    doc.add_paragraph(report.official_report or "No official report generated.")
    
    # Impact Analysis
    doc.add_heading('BUSINESS IMPACT ANALYSIS', level=2)
    impacts = [
        ("Business Impact", report.business_impact),
        ("Operational Impact", report.operational_impact),
        ("Financial Impact", report.financial_impact),
        ("Reputational Impact", report.reputational_impact)
    ]
    for label, val in impacts:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(f"{label}: ").bold = True
        p.add_run(str(val or "N/A"))
        
    # Technical Vectors
    doc.add_heading('TECHNICAL VECTORS', level=2)
    p = doc.add_paragraph()
    p.add_run("Root Cause: ").bold = True
    p.add_run(str(report.root_cause or "Unknown"))
    
    p = doc.add_paragraph()
    p.add_run("Attack Type: ").bold = True
    p.add_run(str(report.attack_type or "Unknown"))
    
    p = doc.add_paragraph()
    p.add_run("Breach Method: ").bold = True
    p.add_run(str(report.breach_method or "Unknown"))
    
    # Data Exposure
    doc.add_heading('DATA EXPOSURE', level=2)
    p = doc.add_paragraph()
    p.add_run("Data Involved: ").bold = True
    p.add_run(str(report.data_involved or "Unknown"))
    
    p = doc.add_paragraph()
    p.add_run("Classification: ").bold = True
    p.add_run(str(report.data_classification or "Unknown"))
    
    p = doc.add_paragraph()
    p.add_run("Affected Entities: ").bold = True
    p.add_run(str(report.affected_customers or "Unknown"))
    
    doc.add_heading('DEEP-DIVE ANALYSIS', level=2)
    doc.add_paragraph(report.technical_analysis or "No technical analysis available.")
    
    # MITRE Mapping
    if mitre_mappings:
        doc.add_heading('MITRE ATT&CK INTELLIGENCE MAPPING', level=2)
        for m in mitre_mappings:
            p = doc.add_paragraph(style='List Bullet')
            p.add_run(f"{m.tactic}: ").bold = True
            p.add_run(f"{m.technique_id} - {m.technique_name}")
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.5)
            run = p.add_run(f"Justification: {m.analysis_justification}")
            run.italic = True
            run.font.size = Pt(9)
            
    # Breach Process
    doc.add_heading('BREACH TIMELINE & PROCESS', level=2)
    process_data = report.breach_process
    steps = []
    if process_data:
        import json
        try:
            parsed = json.loads(process_data)
            if isinstance(parsed, list):
                steps = parsed
            elif isinstance(parsed, dict):
                steps = list(parsed.values())
        except Exception:
            if isinstance(process_data, str):
                steps = [s.strip() for s in process_data.split('\n') if s.strip()]
    if steps:
        for idx, step in enumerate(steps, 1):
            doc.add_paragraph(f"{idx}. {step}")
    else:
        doc.add_paragraph("No timeline available.")
    
    # Executive Statement
    doc.add_heading('EXECUTIVE STATEMENT', level=2)
    p = doc.add_paragraph()
    p.add_run(f'"{report.official_report}"').italic = True

    # Crawled Intelligence Source Content
    if incident and incident.crawled_content:
        doc.add_heading('CRAWLED INTELLIGENCE SOURCE CONTENT', level=2)
        for line in incident.crawled_content.split('\n'):
            line = line.strip()
            if line:
                p_crawled = doc.add_paragraph(line)
                for run in p_crawled.runs:
                    run.font.size = Pt(9)
                    run.font.color.rgb = RGBColor(0x64, 0x74, 0x8b)


    # Footer
    doc.add_page_break()
    doc.add_paragraph("\n" * 5)
    footer = doc.add_paragraph()
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.add_run("Shivam Mishra | Cyber Incident Intelligence Command Center\n").bold = True
    footer.add_run("CONFIDENTIAL SECURITY INTELLIGENCE REPORT\n")
    footer.add_run("This document is AI-generated and reviewed for forensic accuracy.")
    
    doc.save(file_path)
    return file_path


def generate_combined_pdf(report, incidents, cves, include_crawled_content=True):
    """Generates a professional combined Intelligence Report (PDF)."""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"Intelligence_Report_{report.id}.pdf")
    
    doc = SimpleDocTemplate(
        file_path, 
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=60, bottomMargin=50
    )
    styles = getSampleStyleSheet()
    
    # Custom premium styles
    title_style = ParagraphStyle(
        'CombinedTitle',
        parent=styles['Heading1'],
        fontSize=32,
        textColor=colors.HexColor("#1e1b4b"),
        alignment=TA_CENTER,
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    credit_style = ParagraphStyle(
        'CreditStyle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor("#4f46e5"),
        alignment=TA_CENTER,
        spaceAfter=40,
        fontName='Helvetica-Bold'
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.white,
        backColor=colors.HexColor("#4f46e5"),
        fontName='Helvetica-Bold',
        spaceBefore=20,
        spaceAfter=15,
        leftIndent=0,
        borderPadding=8
    )
    
    item_title = ParagraphStyle(
        'ItemTitle',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor("#3730a3"),
        spaceBefore=10,
        spaceAfter=5
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    )
    
    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
        spaceAfter=5
    )

    elements = []
    
    # Title Page Info
    elements.append(Spacer(1, 150))
    elements.append(Paragraph(report.report_title.upper(), title_style))
    elements.append(Paragraph("OFFICIAL SECURITY INTELLIGENCE REPORT", ParagraphStyle('SubTitle', parent=styles['Normal'], alignment=TA_CENTER, fontSize=14, textColor=colors.grey, spaceAfter=10)))
    elements.append(Paragraph("Created by Shivam Mishra", credit_style))
    date_range = f"<b>PERIOD:</b> {report.from_date.strftime('%Y-%m-%d')} TO {report.to_date.strftime('%Y-%m-%d')}"
    elements.append(Paragraph(date_range, ParagraphStyle('DateRange', parent=styles['Normal'], alignment=TA_CENTER, fontSize=11, textColor=colors.HexColor("#4f46e5"))))
    elements.append(Spacer(1, 40))
    
    # Executive Summary placeholder or report stats
    elements.append(Paragraph("EXECUTIVE SUMMARY", section_header))
    summary_data = [
        [f"Total Incidents Identified:", f"{len(incidents)}"],
        [f"Total Vulnerabilities (CVE):", f"{len(cves)}"],
        [f"Report Generation Date:", f"{pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}"],
        [f"Classification:", f"CONFIDENTIAL / INTERNAL USE ONLY"]
    ]
    st = Table(summary_data, colWidths=[200, 300])
    st.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f9fafb")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(st)
    elements.append(PageBreak())
    
    # Section 1: Incident Intelligence
    if incidents:
        elements.append(Paragraph("SECTION 1: CYBER INCIDENT INTELLIGENCE", section_header))
        for idx, inc in enumerate(incidents):
            elements.append(Paragraph(f"1.{idx+1} {inc.title}", item_title))
            meta = f"<b>Date:</b> {inc.happened_at.strftime('%Y-%m-%d') if inc.happened_at else 'N/A'} | <b>Severity:</b> {inc.severity} | <b>Source:</b> {inc.source}"
            elements.append(Paragraph(meta, meta_style))
            if inc.link:
                elements.append(Paragraph(f"<b>Source URL:</b> {inc.link}", meta_style))
            elements.append(Paragraph(inc.ai_summary or inc.description or "No detailed analysis.", body_style))
            if include_crawled_content and inc.crawled_content:
                elements.append(Spacer(1, 6))
                elements.append(Paragraph("<b>Source Article Details (Crawled Content):</b>", body_style))
                # Truncate very long crawled content to keep PDF manageable
                crawled_text = inc.crawled_content[:3000] + ('...' if len(inc.crawled_content) > 3000 else '')
                elements.append(Paragraph(crawled_text, body_style))
            elements.append(Spacer(1, 10))
            if idx < len(incidents) - 1:
                elements.append(Spacer(1, 5))

    # Section 2: Vulnerability Landscape
    if cves:
        if incidents: elements.append(PageBreak())
        elements.append(Paragraph("SECTION 2: VULNERABILITY LANDSCAPE (CVE/NVD)", section_header))
        for idx, cve in enumerate(cves):
            elements.append(Paragraph(f"2.{idx+1} {cve.cve_id} - {cve.company_name or 'Global Vulnerability'}", item_title))
            meta = f"<b>Published:</b> {cve.published_date.strftime('%Y-%m-%d') if cve.published_date else 'N/A'} | <b>Severity:</b> {cve.severity} | <b>Score:</b> {cve.cvss_score or 'N/A'}"
            elements.append(Paragraph(meta, meta_style))
            elements.append(Paragraph("<b>Raw NVD Description:</b>", body_style))
            elements.append(Paragraph(cve.description or "No description available.", body_style))
            if cve.ai_summary:
                elements.append(Paragraph("<b>AI Intelligence Summary:</b>", body_style))
                elements.append(Paragraph(cve.ai_summary, body_style))
            elements.append(Spacer(1, 10))

    doc.build(elements, onFirstPage=_draw_report_header_footer, onLaterPages=_draw_report_header_footer)
    return file_path


def generate_combined_docx(report, incidents, cves, include_crawled_content=True):
    """Generates a professional combined Intelligence Report (Word)."""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"Intelligence_Report_{report.id}.docx")
    
    doc = Document()
    
    # Title Page
    title = doc.add_heading('', 0)
    run = title.add_run(report.report_title.upper())
    run.font.size = Pt(36)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    p_subtitle = doc.add_paragraph()
    p_subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_subtitle.add_run("OFFICIAL SECURITY INTELLIGENCE REPORT")
    run_sub.font.size = Pt(16)
    run_sub.font.color.rgb = RGBColor(0x64, 0x74, 0x8b)
    
    p_credit = doc.add_paragraph()
    p_credit.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_cred = p_credit.add_run("Created by Shivam Mishra")
    run_cred.bold = True
    run_cred.font.size = Pt(14)
    run_cred.font.color.rgb = RGBColor(0x4f, 0x46, 0xe5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"PERIOD: {report.from_date.strftime('%Y-%m-%d')} TO {report.to_date.strftime('%Y-%m-%d')}")
    run.bold = True
    run.font.color.rgb = RGBColor(0x4f, 0x46, 0xe5)
    
    doc.add_paragraph("\n" * 5)
    doc.add_heading('EXECUTIVE SUMMARY', level=1)
    doc.add_paragraph(f"Report Generated: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}")
    doc.add_paragraph(f"Total Incidents: {len(incidents)}")
    doc.add_paragraph(f"Total CVEs: {len(cves)}")
    
    # Incidents
    if incidents:
        doc.add_page_break()
        doc.add_heading('SECTION 1: CYBER INCIDENT INTELLIGENCE', level=1)
        for idx, inc in enumerate(incidents):
            doc.add_heading(f"1.{idx+1} {inc.title}", level=2)
            p = doc.add_paragraph()
            p.add_run(f"Date: {inc.happened_at.strftime('%Y-%m-%d') if inc.happened_at else 'N/A'} | Severity: {inc.severity} | Source: {inc.source}").italic = True
            if inc.link:
                p_link = doc.add_paragraph()
                p_link.add_run("Source URL: ").bold = True
                p_link.add_run(inc.link)
            doc.add_paragraph(inc.ai_summary or inc.description or "No detailed analysis.")
            if include_crawled_content and inc.crawled_content:
                p_crawl = doc.add_paragraph()
                p_crawl.add_run("Source Article Details (Crawled Content): ").bold = True
                crawled_text = inc.crawled_content[:3000] + ('...' if len(inc.crawled_content) > 3000 else '')
                p_crawl.add_run(crawled_text)
            
    # CVEs
    if cves:
        doc.add_page_break()
        doc.add_heading('SECTION 2: VULNERABILITY LANDSCAPE (CVE/NVD)', level=1)
        for idx, cve in enumerate(cves):
            doc.add_heading(f"2.{idx+1} {cve.cve_id} - {cve.company_name or 'Global Vulnerability'}", level=2)
            p = doc.add_paragraph()
            p.add_run(f"Published: {cve.published_date.strftime('%Y-%m-%d') if cve.published_date else 'N/A'} | Severity: {cve.severity} | Score: {cve.cvss_score or 'N/A'}").italic = True
            p2 = doc.add_paragraph()
            p2.add_run("Raw NVD Description: ").bold = True
            p2.add_run(cve.description or "No description available.")
            if cve.ai_summary:
                p3 = doc.add_paragraph()
                p3.add_run("AI Intelligence Summary: ").bold = True
                p3.add_run(cve.ai_summary)
                
    doc.save(file_path)
    return file_path


def generate_combined_excel(report, incidents, cves, include_crawled_content=True):
    """Generates a structured multi-sheet Excel report for combined data."""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"Intelligence_Report_{report.id}.xlsx")
    
    with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
        # Sheet 1: Report Metadata
        metadata = pd.DataFrame([{
            "Report Title": report.report_title,
            "Period From": report.from_date.strftime('%Y-%m-%d'),
            "Period To": report.to_date.strftime('%Y-%m-%d'),
            "Generated At": pd.Timestamp.now().strftime('%Y-%m-%d %H:%M'),
            "Author": "Shivam Mishra",
            "Classification": "Confidential Security Intelligence"
        }])
        metadata.to_excel(writer, sheet_name='Summary & Meta', index=False)
        if incidents:
            inc_data = [{
                "Date": i.happened_at.strftime("%Y-%m-%d") if i.happened_at else "N/A",
                "Severity": i.severity,
                "Title": i.title,
                "Source": i.source,
                "Source URL": i.link,
                "Description": i.description,
                "AI Summary": i.ai_summary,
                "Attack Type": i.attack_type,
                "Crawled Content": i.crawled_content if include_crawled_content else ""
            } for i in incidents]
            pd.DataFrame(inc_data).to_excel(writer, sheet_name="Incidents", index=False)
            
        if cves:
            cve_data = [{
                "CVE ID": c.cve_id,
                "Severity": c.severity,
                "Score": c.cvss_score,
                "Company": c.company_name,
                "Product": c.product_name,
                "Published": c.published_date.strftime("%Y-%m-%d") if c.published_date else "N/A",
                "Description": c.description,
                "AI Summary": c.ai_summary
            } for c in cves]
            pd.DataFrame(cve_data).to_excel(writer, sheet_name="Vulnerabilities", index=False)
            
        # Summary Sheet
        summary_data = [
            {"Parameter": "Report Title", "Value": report.report_title},
            {"Parameter": "From Date", "Value": report.from_date.strftime("%Y-%m-%d")},
            {"Parameter": "To Date", "Value": report.to_date.strftime("%Y-%m-%d")},
            {"Parameter": "Generated On", "Value": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M")},
            {"Parameter": "Total Incidents", "Value": len(incidents)},
            {"Parameter": "Total CVEs", "Value": len(cves)}
        ]
        pd.DataFrame(summary_data).to_excel(writer, sheet_name="Summary", index=False)

    return file_path

def generate_single_cve_pdf(cve):
    """
    Generates a professional, high-fidelity PDF report for a single CVE vulnerability.
    """
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"CVE_Report_{cve.cve_id.replace('-', '_')}.pdf")
    
    doc = SimpleDocTemplate(
        file_path, 
        pagesize=letter,
        rightMargin=50, leftMargin=50,
        topMargin=70, bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#0a0e17"),
        spaceAfter=5
    )
    
    header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor("#1e1b4b"),
        spaceBefore=15,
        spaceAfter=8,
        borderPadding=(0, 0, 2, 0),
        borderColor=colors.HexColor("#e5e7eb")
    )
    
    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontSize=9.5,
        leading=14,
        spaceAfter=8
    )

    elements = []
    
    # Top Banner
    banner_text = "<font color='#4f46e5'><b>VULNERABILITY INTELLIGENCE REPORT</b></font> | CVE EXTRACTOR"
    elements.append(Paragraph(banner_text, ParagraphStyle('Banner', parent=styles['Normal'], alignment=TA_CENTER, fontSize=9, textColor=colors.grey)))
    elements.append(Spacer(1, 20))
    
    # Title
    elements.append(Paragraph(cve.cve_id, title_style))
    
    # Severity & Score Banner
    sev = (cve.severity or "Unknown").upper()
    sev_color = "#ef4444" if sev == "CRITICAL" else ("#f59e0b" if sev == "HIGH" else ("#3b82f6" if sev == "MEDIUM" else "#10b981"))
    
    elements.append(Paragraph(f"<b>Severity:</b> <font color='{sev_color}'>{sev}</font> | <b>CVSS Score:</b> {cve.cvss_score or 'N/A'}", body_style))
    elements.append(Spacer(1, 10))
    
    # Meta Information Table
    meta_data = [
        [Paragraph("<b>AFFECTED VENDOR</b>", body_style), Paragraph(cve.company_name or "Unknown", body_style)],
        [Paragraph("<b>AFFECTED PRODUCT</b>", body_style), Paragraph(cve.product_name or "Unknown", body_style)],
        [Paragraph("<b>PULL TYPE</b>", body_style), Paragraph(cve.pull_type or "N/A", body_style)],
        [Paragraph("<b>PUBLISHED DATE</b>", body_style), Paragraph(cve.published_date.strftime("%Y-%m-%d") if cve.published_date else "Unknown", body_style)],
        [Paragraph("<b>LAST MODIFIED</b>", body_style), Paragraph(cve.last_modified_date.strftime("%Y-%m-%d") if cve.last_modified_date else "Unknown", body_style)],
        [Paragraph("<b>RADAR PROXIMITY IMPACT SCORE</b>", body_style), Paragraph(f"<b>{cve.company_impact_score}/100</b>", body_style)]
    ]
    t = Table(meta_data, colWidths=[150, 330])
    t.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f9fafb")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 15))
    
    # Vulnerability Description
    elements.append(Paragraph("VULNERABILITY DESCRIPTION", header_style))
    elements.append(Paragraph(cve.description or "No description available.", body_style))
    elements.append(Spacer(1, 10))
    
    # Radar Proximity Reasoning
    if cve.company_impact_reason:
        elements.append(Paragraph("RADAR PROXIMITY ASSESSMENT", header_style))
        elements.append(Paragraph(cve.company_impact_reason, body_style))
        elements.append(Spacer(1, 10))
        
    # AI Intelligence Enrichment
    if cve.ai_summary:
        elements.append(Paragraph("AI INTELLIGENCE ENRICHMENT", header_style))
        elements.append(Paragraph(cve.ai_summary, body_style))
        if cve.ai_tags:
            tags_str = ", ".join(cve.ai_tags) if isinstance(cve.ai_tags, list) else str(cve.ai_tags)
            elements.append(Paragraph(f"<b>AI Tags:</b> {tags_str}", body_style))
        elements.append(Spacer(1, 10))
        
    # Affected Products / CPE List
    if cve.affected_products:
        elements.append(Paragraph("AFFECTED CPE CRITERIA (MAX 10)", header_style))
        cpes = cve.affected_products if isinstance(cve.affected_products, list) else []
        for cpe in cpes[:10]:
            elements.append(Paragraph(f"• <font face='Courier' size='8'>{cpe}</font>", body_style))
        elements.append(Spacer(1, 10))
        
    # Reference URLs
    if cve.references:
        elements.append(Paragraph("INTEL AND ADVISORY REFERENCES", header_style))
        refs = cve.references if isinstance(cve.references, list) else []
        for ref in refs[:5]:
            elements.append(Paragraph(f"• <a href='{ref}' color='blue'>{ref}</a>", body_style))
            
    doc.build(elements, onFirstPage=_draw_report_header_footer, onLaterPages=_draw_report_header_footer)
    return file_path

import datetime

def generate_automation_summary_pdf(db, timeframe_hours=24):
    """
    Generates a PDF summary of the automation cycle's Impact Radar results.
    """
    import tempfile
    import os
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    
    import models

    cutoff_time = datetime.datetime.utcnow() - datetime.timedelta(hours=timeframe_hours)
    
    logs = db.query(models.AutomationAuditLog).filter(
        models.AutomationAuditLog.created_at >= cutoff_time
    ).order_by(models.AutomationAuditLog.created_at.desc()).all()
    
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"Automation_Summary_Report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
    
    doc = SimpleDocTemplate(
        file_path, 
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=50, bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('MainTitle', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor("#0a0e17"))
    header_style = ParagraphStyle('SectionHeader', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor("#1e1b4b"), spaceBefore=15, spaceAfter=8)
    body_style = ParagraphStyle('ReportBody', parent=styles['Normal'], fontSize=9, leading=12)
    
    elements = []
    
    # Title
    elements.append(Paragraph("AUTOMATION & IMPACT RADAR EXECUTION REPORT", title_style))
    elements.append(Paragraph(f"Reporting Period: Last {timeframe_hours} Hours", body_style))
    elements.append(Paragraph(f"Generated On: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC", body_style))
    elements.append(Spacer(1, 20))
    
    # Summary Metrics
    total_scanned = len(logs)
    matched_logs = [log for log in logs if log.impact_score >= 60]
    rejected_logs = [log for log in logs if log.impact_score < 60]
    
    summary_data = [
        [Paragraph("<b>Metric</b>", body_style), Paragraph("<b>Value</b>", body_style)],
        [Paragraph("Total Items Scanned", body_style), Paragraph(str(total_scanned), body_style)],
        [Paragraph("Impact Radar Matches (>= 60)", body_style), Paragraph(f"<font color='red'><b>{len(matched_logs)}</b></font>", body_style)],
        [Paragraph("Impact Radar Rejections (< 60)", body_style), Paragraph(f"<font color='green'><b>{len(rejected_logs)}</b></font>", body_style)]
    ]
    t_summary = Table(summary_data, colWidths=[200, 100])
    t_summary.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t_summary)
    elements.append(Spacer(1, 20))
    
    # Matches Table
    elements.append(Paragraph("IMPACT RADAR MATCHES (High Risk / Pushed to Jira)", header_style))
    if matched_logs:
        match_data = [[Paragraph("<b>ID</b>", body_style), Paragraph("<b>Type</b>", body_style), Paragraph("<b>Target/Vendor</b>", body_style), Paragraph("<b>Score</b>", body_style), Paragraph("<b>Match Details</b>", body_style)]]
        for log in matched_logs[:50]: # Limit to 50 for brevity
            reason = "N/A"
            if log.entity_type.lower() == 'cve':
                cve_obj = db.query(models.CVE).filter(models.CVE.cve_id == log.entity_id).first()
                if cve_obj and cve_obj.company_impact_reason: reason = cve_obj.company_impact_reason
            elif log.entity_type.lower() == 'incident':
                try:
                    inc_obj = db.query(models.Incident).filter(models.Incident.id == int(log.entity_id)).first()
                    if inc_obj and inc_obj.company_impact_reason: reason = inc_obj.company_impact_reason
                except:
                    pass
                    
            match_data.append([
                Paragraph(log.entity_id, body_style),
                Paragraph(log.entity_type.upper(), body_style),
                Paragraph(log.entity_title or "Unknown", body_style),
                Paragraph(f"<font color='red'><b>{log.impact_score}</b></font>", body_style),
                Paragraph(reason, body_style)
            ])
        t_matches = Table(match_data, colWidths=[80, 50, 150, 40, 200])
        t_matches.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#fee2e2")),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t_matches)
    else:
        elements.append(Paragraph("No items matched the Impact Radar criteria in this timeframe.", body_style))
        
    elements.append(Spacer(1, 20))
    
    # Rejections Table
    elements.append(Paragraph("IMPACT RADAR REJECTIONS (Low Risk / Ignored)", header_style))
    if rejected_logs:
        rej_data = [[Paragraph("<b>ID</b>", body_style), Paragraph("<b>Type</b>", body_style), Paragraph("<b>Target/Vendor</b>", body_style), Paragraph("<b>Score</b>", body_style), Paragraph("<b>Match Details</b>", body_style)]]
        for log in rejected_logs[:50]: # Limit to 50
            reason = "N/A"
            if log.entity_type.lower() == 'cve':
                cve_obj = db.query(models.CVE).filter(models.CVE.cve_id == log.entity_id).first()
                if cve_obj and cve_obj.company_impact_reason: reason = cve_obj.company_impact_reason
            elif log.entity_type.lower() == 'incident':
                try:
                    inc_obj = db.query(models.Incident).filter(models.Incident.id == int(log.entity_id)).first()
                    if inc_obj and inc_obj.company_impact_reason: reason = inc_obj.company_impact_reason
                except:
                    pass
                    
            rej_data.append([
                Paragraph(log.entity_id, body_style),
                Paragraph(log.entity_type.upper(), body_style),
                Paragraph(log.entity_title or "Unknown", body_style),
                Paragraph(str(log.impact_score), body_style),
                Paragraph(reason, body_style)
            ])
        t_rej = Table(rej_data, colWidths=[80, 50, 150, 40, 200])
        t_rej.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#dcfce7")),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t_rej)
    else:
        elements.append(Paragraph("No items were rejected by the Impact Radar in this timeframe.", body_style))

    doc.build(elements)
    return file_path
