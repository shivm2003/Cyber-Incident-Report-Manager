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


def _draw_impact_report_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#3b82f6")) # Blue
    canvas.rect(0, letter[1] - 4, letter[0], 4, fill=1, stroke=0)
    
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    footer_text = "Generated by Shivam AI | Confidential Security Intelligence Impact Report"
    canvas.drawString(40, 30, footer_text)
    canvas.line(40, 45, letter[0]-40, 45)
    
    page_num = canvas.getPageNumber()
    canvas.drawRightString(letter[0]-40, 30, f"Page {page_num}")
    canvas.restoreState()

def generate_single_impact_pdf(report, mitre_mappings, forensic_content=None):
    """Generates a detailed, premium PDF for a single AI Impact Analysis report."""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"AI_Impact_Report_{report.id}.pdf")
    
    from reportlab.platypus import HRFlowable

    doc = SimpleDocTemplate(
        file_path, 
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=50, bottomMargin=60
    )
    styles = getSampleStyleSheet()
    
    # Custom Modern Styles
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor("#0f172a"), spaceAfter=2, fontName="Helvetica-Bold", leading=28)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor("#64748b"), spaceAfter=15, fontName="Helvetica")
    
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor("#1e293b"), spaceBefore=18, spaceAfter=10, fontName="Helvetica-Bold", textTransform='uppercase')
    h3_style = ParagraphStyle('H3', parent=styles['Heading3'], fontSize=12, textColor=colors.HexColor("#334155"), spaceBefore=12, spaceAfter=6, fontName="Helvetica-Bold")
    
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10.5, leading=16, textColor=colors.HexColor("#334155"))
    body_bold = ParagraphStyle('BodyBold', parent=body_style, fontName="Helvetica-Bold")
    
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor("#64748b"), textTransform='uppercase', spaceAfter=2, fontName="Helvetica-Bold")
    
    mono_style = ParagraphStyle('Mono', parent=styles['Normal'], fontSize=9, fontName="Courier", textColor=colors.HexColor("#0f172a"), wordWrap='CJK')
    link_style = ParagraphStyle('Link', parent=styles['Normal'], fontSize=9.5, fontName="Courier", textColor=colors.HexColor("#3b82f6"), wordWrap='CJK')
    
    elements = []
    
    incident = getattr(report, 'incident', None)
    sev = (incident.severity or "LOW").upper() if incident else "LOW"
    
    sev_bg = "#f59e0b"
    if sev == "CRITICAL": sev_bg = "#ef4444"
    elif sev == "HIGH": sev_bg = "#f97316"
    elif sev == "MEDIUM": sev_bg = "#eab308"
    elif sev == "LOW": sev_bg = "#22c55e"
    
    # Header Section
    elements.append(Paragraph("AI IMPACT ANALYSIS", label_style))
    title_p = Paragraph(report.incident_title or "Cyber Impact Forensic Deep-Dive", title_style)
    sub_p = Paragraph(f"<b>REPORT #{report.id}</b> &bull; INCIDENT #{report.incident_id} &bull; PUBLISHED", subtitle_style)
    
    badge_data = [[
        Paragraph(f"<font size=10 color='white'><b>SEVERITY</b></font><br/><br/><font size=14 color='white'><b>{sev}</b></font>", ParagraphStyle('b', alignment=TA_CENTER))
    ]]
    badge_table = Table(badge_data, colWidths=[80], rowHeights=[70])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), colors.HexColor(sev_bg)),
        ('ALIGN', (0,0), (0,0), 'CENTER'),
        ('VALIGN', (0,0), (0,0), 'MIDDLE'),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))

    header_layout = Table([[ [title_p, sub_p], badge_table ]], colWidths=[400, 100])
    header_layout.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(header_layout)
    
    # Custom Divider
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceBefore=0, spaceAfter=20))
    
    # Intelligence Summary
    if incident and (incident.ai_summary or incident.description):
        elements.append(Paragraph("INTELLIGENCE SUMMARY", h2_style))
        summary_text = incident.ai_summary or incident.description
        elements.append(Paragraph(summary_text, body_style))
        elements.append(Spacer(1, 20))
        
    # AI Forensic Deep-Dive Analysis
    if forensic_content:
        forensic_header = ParagraphStyle('ForensicHeader', parent=h2_style, textColor=colors.HexColor("#7c3aed"))
        elements.append(Paragraph("AI FORENSIC ANALYSIS (DEEP-DIVE)", forensic_header))
        for paragraph in forensic_content.split('\n'):
            paragraph = paragraph.strip()
            if paragraph:
                elements.append(Paragraph(paragraph, body_style))
        elements.append(Spacer(1, 20))

    # Grid info
    inc_date = incident.happened_at.strftime("%Y-%m-%d %H:%M") if incident and incident.happened_at else "Unknown"
    cap_date = incident.date_collected.strftime("%Y-%m-%d %H:%M") if incident else "Unknown"
    entity = incident.target_entity or incident.country if incident else "Unknown"
    source = incident.source or 'Unknown' if incident else "Unknown"
    
    grid_data = [
        [Paragraph("INCIDENT DATE", label_style), Paragraph("CAPTURED DATE", label_style)],
        [Paragraph(f"<b>{inc_date}</b>", body_style), Paragraph(f"<b>{cap_date}</b>", body_style)],
        [Paragraph("TARGET ENTITY", label_style), Paragraph("SOURCE", label_style)],
        [Paragraph(f"<b>{entity}</b>", body_style), Paragraph(f"<b>{source}</b>", body_style)]
    ]
    grid_table = Table(grid_data, colWidths=[250, 250])
    grid_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ('LINEABOVE', (0,2), (-1,2), 1, colors.HexColor("#e2e8f0")),
        ('LINEBEFORE', (1,0), (1,-1), 1, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,0), 2),
        ('BOTTOMPADDING', (0,2), (-1,2), 2),
    ]))
    elements.append(grid_table)
    elements.append(Spacer(1, 20))

    # Source Evidence
    if incident and incident.link:
        elements.append(Paragraph("SOURCE EVIDENCE", h2_style))
        elements.append(Paragraph(f"&bull; <a href='{incident.link}'>{incident.link}</a>", link_style))
        elements.append(Spacer(1, 20))

    # Executive Summary
    elements.append(Paragraph("EXECUTIVE SUMMARY", h2_style))
    elements.append(Paragraph(report.official_report or "No official report generated.", body_style))
    elements.append(Spacer(1, 20))

    # Business Impact Analysis Grid
    elements.append(Paragraph("BUSINESS IMPACT ANALYSIS", h2_style))
    impact_data = [
        [Paragraph("BUSINESS IMPACT", label_style), Paragraph("OPERATIONAL IMPACT", label_style)],
        [Paragraph(f"{report.business_impact or 'N/A'}", body_style), Paragraph(f"{report.operational_impact or 'N/A'}", body_style)],
        [Paragraph("FINANCIAL IMPACT", label_style), Paragraph("REPUTATIONAL IMPACT", label_style)],
        [Paragraph(f"{report.financial_impact or 'N/A'}", body_style), Paragraph(f"{report.reputational_impact or 'N/A'}", body_style)]
    ]
    it = Table(impact_data, colWidths=[250, 250])
    it.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ('LINEABOVE', (0,2), (-1,2), 1, colors.HexColor("#e2e8f0")),
        ('LINEBEFORE', (1,0), (1,-1), 1, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BOTTOMPADDING', (0,2), (-1,2), 6),
    ]))
    elements.append(it)
    elements.append(Spacer(1, 25))

    # Vectors and Data Exposure
    vectors_data = [
        [Paragraph("ROOT CAUSE", label_style), Paragraph(report.root_cause or 'Unknown', body_style)],
        [Paragraph("ATTACK TYPE", label_style), Paragraph(report.attack_type or 'Unknown', body_style)],
        [Paragraph("BREACH METHOD", label_style), Paragraph(report.breach_method or 'Unknown', body_style)],
        [Paragraph("DATA INVOLVED", label_style), Paragraph(report.data_involved or 'Unknown', body_style)],
        [Paragraph("CLASSIFICATION", label_style), Paragraph(report.data_classification or 'Unknown', body_style)],
        [Paragraph("AFFECTED ENTITIES", label_style), Paragraph(report.affected_customers or 'Unknown', body_style)],
    ]
    vt = Table(vectors_data, colWidths=[150, 350])
    vt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(Paragraph("TECHNICAL VECTORS & DATA EXPOSURE", h2_style))
    elements.append(vt)
    elements.append(Spacer(1, 25))

    # Deep-Dive Analysis
    elements.append(Paragraph("DEEP-DIVE ANALYSIS", h2_style))
    elements.append(Paragraph(report.technical_analysis or "No technical analysis available.", body_style))
    elements.append(Spacer(1, 25))

    # MITRE Mapping
    if mitre_mappings:
        elements.append(Paragraph("MITRE ATT&CK INTELLIGENCE MAPPING", h2_style))
        mitre_data = []
        for m in mitre_mappings:
            mitre_data.append([
                Paragraph(f"<b>{m.tactic}</b><br/><font size=8 color='#64748b'>{m.technique_id}</font>", body_style),
                Paragraph(f"<b>{m.technique_name}</b><br/>{m.analysis_justification}", body_style)
            ])
        if mitre_data:
            mt = Table(mitre_data, colWidths=[150, 350])
            mt.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(mt)
        elements.append(Spacer(1, 20))

    # Breach Process Timeline
    elements.append(Paragraph("BREACH TIMELINE & PROCESS", h2_style))
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
        step_data = [[Paragraph(f"<b>{idx}</b>", body_style), Paragraph(step, body_style)] for idx, step in enumerate(steps, 1)]
        st = Table(step_data, colWidths=[30, 470])
        st.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 4)
        ]))
        elements.append(st)
    else:
        elements.append(Paragraph("No timeline available.", body_style))
    elements.append(Spacer(1, 20))

    # Crawled Intelligence Source Content
    if incident and incident.crawled_content:
        elements.append(Paragraph("CRAWLED INTELLIGENCE SOURCE CONTENT", h2_style))
        for p_text in incident.crawled_content.split('\n'):
            p_text = p_text.strip()
            if p_text:
                elements.append(Paragraph(p_text, ParagraphStyle('CrawledStyle', parent=body_style, fontSize=9, textColor=colors.HexColor("#64748b"))))
                elements.append(Spacer(1, 4))
        elements.append(Spacer(1, 20))

    doc.build(elements, onFirstPage=_draw_impact_report_footer, onLaterPages=_draw_impact_report_footer)
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


def generate_ai_report_attachment(report, output_format="pdf"):
    """Render saved Gemma Markdown as a downloadable PDF or Word document."""
    import html
    import re

    stem = f"AI_Incident_Report_{report.id}"
    temp_dir = tempfile.gettempdir()
    lines = (report.content or "").splitlines()
    if output_format == "docx":
        file_path = os.path.join(temp_dir, f"{stem}.docx")
        doc = Document()
        doc.add_heading(report.report_title, 0)
        doc.add_paragraph(f"Generated {report.created_at.strftime('%Y-%m-%d %H:%M UTC') if report.created_at else ''} | Database-grounded AI report")
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith("### "):
                doc.add_heading(stripped[4:], level=3)
            elif stripped.startswith("## "):
                doc.add_heading(stripped[3:], level=2)
            elif stripped.startswith("# "):
                doc.add_heading(stripped[2:], level=1)
            elif stripped.startswith(("- ", "* ")):
                doc.add_paragraph(stripped[2:], style="List Bullet")
            elif re.match(r"^\d+[.)]\s", stripped):
                doc.add_paragraph(re.sub(r"^\d+[.)]\s", "", stripped), style="List Number")
            else:
                doc.add_paragraph(stripped)
        doc.add_heading("Report command", level=2)
        doc.add_paragraph(report.command or "")
        if getattr(report, "sources", None):
            doc.add_heading("Evidence sources", level=1)
            for source in report.sources:
                line = f"[{source.get('citation', '')}] {source.get('title', 'Untitled')} — {source.get('source') or 'Unknown source'} — {source.get('date') or 'Date not recorded'}"
                if source.get("url"):
                    line += f" — {source['url']}"
                doc.add_paragraph(line, style="List Bullet")
        doc.save(file_path)
        return file_path

    file_path = os.path.join(temp_dir, f"{stem}.pdf")
    doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=48, leftMargin=48, topMargin=54, bottomMargin=48)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("AIReportTitle", parent=styles["Title"], textColor=colors.HexColor("#1e1b4b"), spaceAfter=14)
    heading_style = ParagraphStyle("AIReportHeading", parent=styles["Heading2"], textColor=colors.HexColor("#3730a3"), spaceBefore=14, spaceAfter=7)
    body_style = ParagraphStyle("AIReportBody", parent=styles["BodyText"], fontSize=9.5, leading=13, spaceAfter=7)
    elements = [Paragraph(html.escape(report.report_title), title_style), Paragraph("Database-grounded AI security intelligence report", body_style), Spacer(1, 10)]
    for line in lines:
        stripped = line.strip()
        if not stripped:
            elements.append(Spacer(1, 4))
        elif stripped.startswith("### "):
            elements.append(Paragraph(html.escape(stripped[4:]), styles["Heading3"]))
        elif stripped.startswith("## "):
            elements.append(Paragraph(html.escape(stripped[3:]), heading_style))
        elif stripped.startswith("# "):
            elements.append(Paragraph(html.escape(stripped[2:]), heading_style))
        else:
            if stripped.startswith(("- ", "* ")):
                stripped = "- " + stripped[2:]
            elif re.match(r"^\d+[.)]\s", stripped):
                stripped = re.sub(r"^(\d+[.)])\s", r"\1  ", stripped)
            safe = html.escape(stripped).replace("  ", " &nbsp;")
            elements.append(Paragraph(safe, body_style))
    elements.extend([Spacer(1, 14), Paragraph("Report command", heading_style), Paragraph(html.escape(report.command or ""), body_style)])
    if getattr(report, "sources", None):
        elements.extend([Spacer(1, 8), Paragraph("Evidence sources", heading_style)])
        for source in report.sources:
            source_line = f"[{source.get('citation', '')}] {source.get('title', 'Untitled')} — {source.get('source') or 'Unknown source'} — {source.get('date') or 'Date not recorded'}"
            if source.get("url"):
                source_line += f" — {source['url']}"
            elements.append(Paragraph(html.escape(source_line), body_style))
    doc.build(elements)
    return file_path

def _draw_cve_report_header_footer(canvas, doc):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    canvas.saveState()
    
    # Top Header Bar
    canvas.setFillColor(colors.HexColor("#0f172a"))
    canvas.rect(0, letter[1] - 60, letter[0], 60, fill=1, stroke=0)
    
    # Cyan Square Icon
    canvas.setFillColor(colors.HexColor("#06b6d4"))
    canvas.rect(40, letter[1] - 40, 14, 14, fill=1, stroke=0)
    
    # INTEL COMMAND Text
    canvas.setFont('Helvetica-Bold', 12)
    canvas.setFillColor(colors.white)
    canvas.drawString(62, letter[1] - 37, "INTEL COMMAND")
    
    # Right Header Text
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    canvas.drawRightString(letter[0]-40, letter[1] - 37, "VULNERABILITY INTELLIGENCE REPORT")
    
    # Footer
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    footer_text = "Generated by Shivam AI • Source: MITRE CVE Records"
    canvas.drawString(40, 30, footer_text)
    canvas.line(40, 45, letter[0]-40, 45)
    
    # Page Number
    page_num = canvas.getPageNumber()
    canvas.drawRightString(letter[0]-40, 30, f"Page {page_num}")
    
    canvas.restoreState()

def generate_single_cve_pdf(cve):
    """
    Generates a high-fidelity CVE PDF report matching the new A4 design.
    """
    import os, tempfile, json, dataclasses
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

    mitre_report = None
    try:
        if cve.raw_data and "cveMetadata" in cve.raw_data:
            from Cve_parser import CVEParser
            parser = CVEParser(json.dumps(cve.raw_data))
            mitre_report = parser.generate_report()
            if 'affected' in mitre_report and 'products' in mitre_report['affected']:
                mitre_report['affected']['products'] = [dataclasses.asdict(p) for p in mitre_report['affected']['products']]
    except Exception as e:
        print("MITRE parsing error:", e)

    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"CVE_Report_{cve.cve_id.replace('-', '_')}.pdf")

    doc = SimpleDocTemplate(
        file_path, 
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=80, bottomMargin=60
    )
    
    styles = getSampleStyleSheet()
    
    # --- Custom Typography ---
    title_style = ParagraphStyle('Title', fontName="Helvetica-Bold", fontSize=26, textColor=colors.HexColor("#0f172a"), spaceAfter=6, leading=30)
    subtitle_style = ParagraphStyle('Subtitle', fontName="Helvetica", fontSize=12, textColor=colors.HexColor("#64748b"), spaceAfter=20, leading=16)
    
    h2_style = ParagraphStyle('H2', fontName="Helvetica-Bold", fontSize=14, textColor=colors.HexColor("#0f172a"), spaceBefore=20, spaceAfter=12)
    
    body_style = ParagraphStyle('Body', fontName="Helvetica", fontSize=10, textColor=colors.HexColor("#1e293b"), leading=15)
    body_bold = ParagraphStyle('BodyBold', fontName="Helvetica-Bold", fontSize=10, textColor=colors.HexColor("#0f172a"), leading=15)
    
    # --- Data Extraction ---
    cve_id = cve.cve_id or "CVE-UNKNOWN"
    
    vendor_product = "Unknown Vendor / Product"
    if mitre_report and mitre_report.get("affected", {}).get("products"):
        p = mitre_report["affected"]["products"][0]
        vendor_product = f"{p.get('vendor', 'Unknown')} {p.get('product', '')}".strip()
    elif cve.company_name or cve.product_name:
        vendor_product = f"{cve.company_name or ''} {cve.product_name or ''}".strip()
        
    cwe_id = "N/A"
    cwe_desc = "Unknown"
    if mitre_report and mitre_report.get("vulnerability", {}).get("cwes"):
        cwe_id = mitre_report["vulnerability"]["cwes"][0].get("id", "N/A")
        cwe_desc = mitre_report["vulnerability"]["cwes"][0].get("description", "Unknown CWE")
        
    subtitle_text = f"{vendor_product} — {cwe_desc}"
    
    sev = (cve.severity or "UNKNOWN").upper()
    sev_color = "#f59e0b"
    if sev == "CRITICAL": sev_color = "#ef4444"
    elif sev == "HIGH": sev_color = "#f97316"
    elif sev == "MEDIUM": sev_color = "#f59e0b"
    elif sev == "LOW": sev_color = "#22c55e"
    
    cvss_score = str(cve.cvss_score or "N/A")
    if cvss_score != "N/A": cvss_score += " / 10"
    
    cvss_vector = cve.raw_data.get("metrics", {}).get("cvssMetricV31", [{}])[0].get("cvssData", {}).get("vectorString", "Unknown") if cve.raw_data else "Unknown"
    if cvss_vector == "Unknown" and mitre_report:
        cvss_vector = mitre_report.get("scoring", {}).get("cvss_vector", "Unknown") or "Unknown"
        
    attack_vector = "UNKNOWN"
    if "AV:N" in cvss_vector: attack_vector = "NETWORK"
    elif "AV:L" in cvss_vector: attack_vector = "LOCAL"
    elif "AV:A" in cvss_vector: attack_vector = "ADJACENT"
    elif "AV:P" in cvss_vector: attack_vector = "PHYSICAL"
    
    exec_summary = cve.ai_summary if cve.ai_summary else (cve.description or "No description available.")
    
    elements = []
    
    # 1. Title Section
    elements.append(Paragraph(cve_id, title_style))
    elements.append(Paragraph(subtitle_text, subtitle_style))
    
    # 2. Metrics Grid
    def make_metric_box(label, val, sub, color_hex):
        p_label = Paragraph(f"<font color='{color_hex}'><b>{label}</b></font>", ParagraphStyle('CBL', fontSize=8, alignment=TA_CENTER, fontName="Helvetica-Bold"))
        p_val = Paragraph(f"<font color='{color_hex}'>{val}</font>", ParagraphStyle('CBV', fontSize=18, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=8))
        p_sub = Paragraph(f"<font color='#64748b'>{sub}</font>", ParagraphStyle('CBS', fontSize=8, alignment=TA_CENTER, fontName="Helvetica"))
        
        t = Table([[p_label], [p_val], [p_sub]], colWidths=[120])
        t.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
            ('LINEABOVE', (0,0), (-1,0), 3, colors.HexColor(color_hex)),
            ('BOTTOMPADDING', (0,-1), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,0), 12),
        ]))
        return t

    box1 = make_metric_box("SEVERITY", sev, "CVSS risk level", sev_color)
    box2 = make_metric_box("CVSS 3.1 SCORE", cvss_score, "Base score", "#3b82f6")
    box3 = make_metric_box("ATTACK VECTOR", attack_vector, "Remote attack surface", "#06b6d4")
    box4 = make_metric_box("CWE", cwe_id, cwe_desc[:25] + ("..." if len(cwe_desc) > 25 else ""), "#8b5cf6")
    
    grid_table = Table([[box1, box2, box3, box4]], colWidths=[130, 130, 130, 130])
    grid_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(grid_table)
    elements.append(Spacer(1, 20))
    
    # 3. Executive Summary & Details Table
    p_exec_head = Paragraph("Executive Summary", body_bold)
    p_exec_body = Paragraph(exec_summary, body_style)
    
    left_table = Table([[p_exec_head], [p_exec_body]], colWidths=[290])
    left_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    
    def cvss_extract(vec, key, mapping):
        import re
        m = re.search(f"{key}:([A-Z])", vec)
        return mapping.get(m.group(1), "Unknown") if m else "Unknown"

    priv = cvss_extract(cvss_vector, "PR", {"N":"None", "L":"Low", "H":"High"})
    ui = cvss_extract(cvss_vector, "UI", {"N":"None", "R":"Required"})
    conf = cvss_extract(cvss_vector, "C", {"N":"None", "L":"Low", "H":"High"})
    inte = cvss_extract(cvss_vector, "I", {"N":"None", "L":"Low", "H":"High"})
    avail = cvss_extract(cvss_vector, "A", {"N":"None", "L":"Low", "H":"High"})

    pub_date = cve.published_date.strftime('%Y-%m-%d') if cve.published_date else "N/A"
    upd_date = cve.last_modified_date.strftime('%Y-%m-%d') if cve.last_modified_date else "N/A"
    assigner = mitre_report.get("metadata", {}).get("assigner", "N/A") if mitre_report else "N/A"

    right_data = [
        [Paragraph("<font color='#64748b'><b>Published Date</b></font>", body_style), Paragraph(pub_date, body_style)],
        [Paragraph("<font color='#64748b'><b>Updated Date</b></font>", body_style), Paragraph(upd_date, body_style)],
        [Paragraph("<font color='#64748b'><b>Assigner</b></font>", body_style), Paragraph(assigner, body_style)],
        [Paragraph("<font color='#64748b'><b>Vulnerability Type</b></font>", body_style), Paragraph(cwe_desc[:30], body_style)],
        [Paragraph("<font color='#64748b'><b>Affected Component</b></font>", body_style), Paragraph(vendor_product[:30], body_style)],
        [Paragraph("<font color='#64748b'><b>Privileges Required</b></font>", body_style), Paragraph(priv, body_style)],
        [Paragraph("<font color='#64748b'><b>User Interaction</b></font>", body_style), Paragraph(ui, body_style)],
        [Paragraph("<font color='#64748b'><b>Confidentiality Impact</b></font>", body_style), Paragraph(conf, body_style)],
        [Paragraph("<font color='#64748b'><b>Integrity / Availability</b></font>", body_style), Paragraph(f"{inte} / {avail}", body_style)],
    ]
    right_table = Table(right_data, colWidths=[120, 100])
    right_table.setStyle(TableStyle([
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    exec_split = Table([[left_table, right_table]], colWidths=[310, 230])
    exec_split.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (0,0), 0),
        ('RIGHTPADDING', (-1,-1), (-1,-1), 0),
    ]))
    elements.append(exec_split)
    
    # 4. Risk & Business Context
    elements.append(Paragraph("Risk & Business Context", h2_style))
    
    has_exploit = "Unknown"
    has_exploit_color = "#64748b"
    if cve.references:
        refs_str = json.dumps(cve.references).lower()
        if "exploit" in refs_str or "poc" in refs_str:
            has_exploit = "Possible"
            has_exploit_color = "#f59e0b"
            
    pub_disc = "Yes" if len(cve.references or []) > 0 else "No"
    pub_disc_color = "#10b981" if pub_disc == "Yes" else "#ef4444"
    
    rbc_data = [
        [
            Paragraph("<b>PUBLIC DISCLOSURE</b>", ParagraphStyle('lbl', fontSize=9, fontName="Helvetica-Bold", textColor=colors.HexColor("#0f172a"))),
            Paragraph("<b>EXPLOIT STATUS</b>", ParagraphStyle('lbl', fontSize=9, fontName="Helvetica-Bold", textColor=colors.HexColor("#0f172a"))),
            Paragraph("<b>VENDOR RESPONSE</b>", ParagraphStyle('lbl', fontSize=9, fontName="Helvetica-Bold", textColor=colors.HexColor("#0f172a"))),
            Paragraph("<b>RELEASE MODEL</b>", ParagraphStyle('lbl', fontSize=9, fontName="Helvetica-Bold", textColor=colors.HexColor("#0f172a")))
        ],
        [
            Paragraph(pub_disc, ParagraphStyle('val', fontSize=10, textColor=colors.HexColor(pub_disc_color))),
            Paragraph(has_exploit, ParagraphStyle('val', fontSize=10, textColor=colors.HexColor(has_exploit_color))),
            Paragraph("Unknown", ParagraphStyle('val', fontSize=10, textColor=colors.HexColor("#64748b"))),
            Paragraph("Rolling release", ParagraphStyle('val', fontSize=10, textColor=colors.HexColor("#3b82f6"))),
        ]
    ]
    rbc_table = Table(rbc_data, colWidths=[132.5, 132.5, 132.5, 132.5])
    rbc_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(rbc_table)
    
    # 5. Recommended Actions
    elements.append(Paragraph("Recommended Actions", h2_style))
    
    recs = []
    if cve.ai_summary and "recommend" in cve.ai_summary.lower():
        lines = cve.ai_summary.split('\n')
        for l in lines:
            if l.strip().startswith('-') or l.strip().startswith('*') or (len(l)>2 and l[0].isdigit() and l[1] == '.'):
                recs.append(l.strip().lstrip('-*1234567890. '))
    
    if not recs:
        recs = [
            "Normalize and validate all file paths before file-system access.",
            "Reject traversal sequences and enforce an allow-list of approved directories.",
            "Restrict the application process to the minimum required file permissions.",
            "Review application logs for suspicious path manipulation attempts.",
            "Validate remediation against the upstream project because fixed-version details are unavailable."
        ]
        
    rec_paragraphs = []
    for i, r in enumerate(recs[:5], 1):
        rec_paragraphs.append(Paragraph(f"{i}. {r}", body_style))
        if i < len(recs[:5]):
            rec_paragraphs.append(Spacer(1, 4))
            
    rec_cell = Table([[rec_paragraphs]], colWidths=[530])
    rec_cell.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#f59e0b")),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fffbeb")),
        ('PADDING', (0,0), (-1,-1), 16),
    ]))
    elements.append(rec_cell)
    
    # ---------------- PAGE 2 ----------------
    elements.append(PageBreak())
    
    elements.append(Paragraph("Technical Details & References", title_style))
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph("CVSS 3.1 Vector", h2_style))
    vec_table = Table([[Paragraph(f"<b>{cvss_vector}</b>", ParagraphStyle('vec', fontSize=10, textColor=colors.HexColor("#2563eb")))]], colWidths=[530])
    vec_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bfdbfe")),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eff6ff")),
        ('PADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(vec_table)
    
    elements.append(Paragraph("Affected Product", h2_style))
    prod_data = [[
        Paragraph("<b>PRODUCT</b>", ParagraphStyle('lbl', fontSize=8, textColor=colors.HexColor("#64748b"))),
        Paragraph("<b>AFFECTED VERSION</b>", ParagraphStyle('lbl', fontSize=8, textColor=colors.HexColor("#64748b"))),
        Paragraph("<b>PLATFORM</b>", ParagraphStyle('lbl', fontSize=8, textColor=colors.HexColor("#64748b"))),
        Paragraph("<b>STATUS</b>", ParagraphStyle('lbl', fontSize=8, textColor=colors.HexColor("#64748b")))
    ]]
    
    if mitre_report and mitre_report.get("affected", {}).get("products"):
        for p in mitre_report["affected"]["products"]:
            versions = ", ".join([v.get("version", "") for v in p.get("versions", [])])
            if not versions: versions = "N/A"
            prod_data.append([
                Paragraph(f"{p.get('vendor', '')} {p.get('product', '')}", body_style),
                Paragraph(versions, body_style),
                Paragraph("Not specified", body_style),
                Paragraph("<b>AFFECTED</b>", ParagraphStyle('stat', fontSize=9, textColor=colors.HexColor("#ef4444")))
            ])
    else:
        prod_data.append([
            Paragraph(vendor_product, body_style),
            Paragraph("N/A", body_style),
            Paragraph("Not specified", body_style),
            Paragraph("<b>AFFECTED</b>", ParagraphStyle('stat', fontSize=9, textColor=colors.HexColor("#ef4444")))
        ])
        
    prod_table = Table(prod_data, colWidths=[130, 200, 100, 100])
    prod_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(prod_table)
    
    elements.append(Paragraph("Vulnerability Description", h2_style))
    desc_table = Table([[Paragraph(cve.description or "No description available.", body_style)]], colWidths=[530])
    desc_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('PADDING', (0,0), (-1,-1), 16),
    ]))
    elements.append(desc_table)
    
    elements.append(Paragraph("Intel & Advisory References", h2_style))
    ref_data = [[
        Paragraph("<b>SOURCE</b>", ParagraphStyle('lbl', fontSize=8, textColor=colors.HexColor("#64748b"))),
        Paragraph("<b>REFERENCE</b>", ParagraphStyle('lbl', fontSize=8, textColor=colors.HexColor("#64748b"))),
    ]]
    
    for ref in (cve.references or [])[:8]:
        try:
            import urllib.parse
            domain = urllib.parse.urlparse(ref).netloc.replace("www.", "")
        except:
            domain = "Link"
        ref_data.append([
            Paragraph(domain, body_bold),
            Paragraph(f"<a href='{ref}' color='#3b82f6'>{ref}</a>", ParagraphStyle('lnk', fontSize=9, textColor=colors.HexColor("#3b82f6"), fontName="Helvetica", wordWrap='CJK'))
        ])
        
    if len(ref_data) == 1:
        ref_data.append([Paragraph("N/A", body_style), Paragraph("No references available.", body_style)])
        
    ref_table = Table(ref_data, colWidths=[130, 400])
    ref_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(ref_table)
    
    elements.append(Spacer(1, 20))
    disc_data = [[
        Paragraph("<b>DISCLAIMER</b><br/><font color='#64748b'>This report is generated for vulnerability intelligence and informational purposes. Validate findings and remediation actions before operational use.</font>", ParagraphStyle('disc', fontSize=9, leading=12, textColor=colors.HexColor("#0f172a"))),
        Paragraph("<b>CLASSIFICATION</b><br/><font color='#3b82f6'>Internal Use Only</font>", ParagraphStyle('class', fontSize=9, leading=12, textColor=colors.HexColor("#0f172a")))
    ]]
    disc_table = Table(disc_data, colWidths=[380, 150])
    disc_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(disc_table)

    doc.build(elements, onFirstPage=_draw_cve_report_header_footer, onLaterPages=_draw_cve_report_header_footer)
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
