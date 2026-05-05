from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ── Colour palette ────────────────────────────────────────────────────────────
TEAL       = colors.HexColor("#1A7F8E")   # ocean teal
DARK_TEAL  = colors.HexColor("#115F6B")
SAND       = colors.HexColor("#F5F0E8")
CHARCOAL   = colors.HexColor("#2D2D2D")
MID_GREY   = colors.HexColor("#555555")
LIGHT_GREY = colors.HexColor("#AAAAAA")
WHITE      = colors.white


# ── Styles ────────────────────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()

    name = ParagraphStyle(
        "Name",
        fontName="Helvetica-Bold",
        fontSize=28,
        textColor=WHITE,
        leading=32,
        alignment=TA_LEFT,
    )
    title = ParagraphStyle(
        "Title",
        fontName="Helvetica",
        fontSize=13,
        textColor=colors.HexColor("#C8EEF2"),
        leading=18,
        alignment=TA_LEFT,
    )
    section_header = ParagraphStyle(
        "SectionHeader",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=TEAL,
        leading=14,
        spaceBefore=14,
        spaceAfter=4,
        alignment=TA_LEFT,
    )
    job_title = ParagraphStyle(
        "JobTitle",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        textColor=CHARCOAL,
        leading=14,
    )
    company = ParagraphStyle(
        "Company",
        fontName="Helvetica",
        fontSize=9.5,
        textColor=TEAL,
        leading=13,
    )
    date_style = ParagraphStyle(
        "Date",
        fontName="Helvetica-Oblique",
        fontSize=9,
        textColor=LIGHT_GREY,
        leading=13,
        alignment=TA_RIGHT,
    )
    body = ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=9.5,
        textColor=MID_GREY,
        leading=14,
        spaceAfter=2,
    )
    bullet = ParagraphStyle(
        "Bullet",
        fontName="Helvetica",
        fontSize=9.5,
        textColor=MID_GREY,
        leading=14,
        leftIndent=12,
        bulletIndent=0,
        spaceAfter=2,
    )
    skill_label = ParagraphStyle(
        "SkillLabel",
        fontName="Helvetica-Bold",
        fontSize=9.5,
        textColor=CHARCOAL,
        leading=14,
    )
    contact = ParagraphStyle(
        "Contact",
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#C8EEF2"),
        leading=14,
        alignment=TA_LEFT,
    )
    summary = ParagraphStyle(
        "Summary",
        fontName="Helvetica",
        fontSize=9.5,
        textColor=MID_GREY,
        leading=15,
        spaceAfter=4,
    )

    return {
        "name": name,
        "title": title,
        "section_header": section_header,
        "job_title": job_title,
        "company": company,
        "date_style": date_style,
        "body": body,
        "bullet": bullet,
        "skill_label": skill_label,
        "contact": contact,
        "summary": summary,
    }


# ── Header banner ─────────────────────────────────────────────────────────────
def header_table(styles):
    name_para    = Paragraph("Chelcy Maee", styles["name"])
    title_para   = Paragraph(
        "Social Media Manager &amp; Content Creator", styles["title"]
    )
    contact_info = Paragraph(
        "chelcymaee@email.com &nbsp;|&nbsp; +1 (000) 000-0000 &nbsp;|&nbsp; "
        "linkedin.com/in/chelcymaee &nbsp;|&nbsp; @chelcymaee",
        styles["contact"],
    )

    left_col = [name_para, Spacer(1, 4), title_para, Spacer(1, 8), contact_info]

    header_data = [[left_col]]
    t = Table(header_data, colWidths=[7.5 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), TEAL),
                ("TOPPADDING",    (0, 0), (-1, -1), 22),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 22),
                ("LEFTPADDING",   (0, 0), (-1, -1), 24),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 24),
            ]
        )
    )
    return t


# ── Section rule ──────────────────────────────────────────────────────────────
def section_rule(styles, label):
    return [
        Paragraph(label.upper(), styles["section_header"]),
        HRFlowable(width="100%", thickness=1.5, color=TEAL, spaceAfter=6),
    ]


# ── Experience entry ──────────────────────────────────────────────────────────
def experience_entry(styles, job_title, company, location, date_range, bullets):
    # Title + date on same row
    row = Table(
        [[Paragraph(job_title, styles["job_title"]),
          Paragraph(date_range, styles["date_style"])]],
        colWidths=[4.5 * inch, 3.0 * inch],
    )
    row.setStyle(
        TableStyle([
            ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING",    (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",   (0, 0), (-1, -1), 0),
            ("TOPPADDING",     (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING",  (0, 0), (-1, -1), 0),
        ])
    )

    items = [
        row,
        Paragraph(f"{company} &nbsp;·&nbsp; {location}", styles["company"]),
        Spacer(1, 4),
    ]
    for b in bullets:
        items.append(Paragraph(f"• &nbsp;{b}", styles["bullet"]))
    items.append(Spacer(1, 10))
    return items


# ── Skills grid ───────────────────────────────────────────────────────────────
def skills_section(styles):
    skill_groups = [
        ("Platforms",
         "Instagram · TikTok · Facebook · LinkedIn · Pinterest · YouTube Shorts"),
        ("Content Creation",
         "Short-form Reels · Graphic Design · Photography Editing · Copywriting · "
         "Brand Storytelling"),
        ("Tools",
         "Adobe Premiere Pro · Lightroom · Canva · CapCut · Meta Business Suite · "
         "Later · Hootsuite"),
        ("Analytics",
         "Meta Insights · TikTok Analytics · Google Analytics · "
         "Audience Growth Strategy · A/B Testing"),
        ("Specialisms",
         "Luxury Hospitality · Outdoor & Adventure · Sports & Collectibles · "
         "Lifestyle Branding · UGC"),
    ]

    rows = []
    for label, value in skill_groups:
        rows.append(
            [Paragraph(label, styles["skill_label"]),
             Paragraph(value, styles["body"])]
        )

    t = Table(rows, colWidths=[1.5 * inch, 6.0 * inch])
    t.setStyle(
        TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LINEBELOW",     (0, 0), (-1, -2), 0.3, colors.HexColor("#E0E0E0")),
        ])
    )
    return [t]


# ── Main ──────────────────────────────────────────────────────────────────────
def build_resume(output_path="Chelcy_Maee_Resume.pdf"):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0,          # header bleeds to top edge
        bottomMargin=0.6 * inch,
    )

    styles = build_styles()
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(header_table(styles))
    story.append(Spacer(1, 16))

    # ── Professional Summary ──────────────────────────────────────────────────
    story += section_rule(styles, "Professional Summary")
    story.append(
        Paragraph(
            "Creative and data-driven Social Media Manager with proven experience growing "
            "multi-platform audiences for luxury hospitality, adventure, and lifestyle brands "
            "across three continents. Specialist in short-form video production, community "
            "engagement, and translating brand identity into scroll-stopping content. "
            "Passionate about travel, outdoor adventure, and authentic storytelling — "
            "ready to bring that same energy to Lapoint Surf Camp's global community.",
            styles["summary"],
        )
    )
    story.append(Spacer(1, 6))

    # ── Experience ────────────────────────────────────────────────────────────
    story += section_rule(styles, "Experience")

    # Triple Creek Ranch
    story += experience_entry(
        styles,
        job_title="Social Media Manager & Content Creator",
        company="Triple Creek Ranch",
        location="Darby, Montana, USA",
        date_range="2023 – Present",
        bullets=[
            "Manage and grow all social media channels (Instagram, Facebook, Pinterest, TikTok) "
            "for a Forbes Five-Star wilderness resort, crafting content that showcases the "
            "ranch's luxury outdoor experiences.",
            "Produce and edit short-form Reels and TikTok videos — fly-fishing, horseback "
            "riding, and mountain dining — driving measurable increases in follower count "
            "and engagement rate.",
            "Develop monthly content calendars aligned with seasonal promotions, achieving "
            "consistent growth in organic reach and website referral traffic.",
            "Analyse platform insights weekly to refine posting strategy, optimal timing, "
            "and content format mix.",
            "Coordinate with the resort's marketing and PR team to align social content "
            "with press features and influencer campaigns.",
        ],
    )

    # Ataraxis Hotel
    story += experience_entry(
        styles,
        job_title="Social Media Manager & Content Creator",
        company="Ataraxis",
        location="Maldives",
        date_range="2023 – Present",
        bullets=[
            "Sole creator of all social media content for a boutique Maldivian hotel, "
            "building the brand's visual identity from the ground up across Instagram and "
            "TikTok.",
            "Shoot, direct, and edit all short-form Reels — underwater footage, sunset "
            "overwater-bungalow experiences, dining — achieving high save and share rates "
            "typical of aspirational travel content.",
            "Design all branded graphics, Stories templates, and promotional materials "
            "using Adobe Lightroom, Premiere Pro, and Canva.",
            "Grow and engage an international luxury-travel audience through targeted "
            "hashtag strategy, collaborations, and consistent brand voice.",
        ],
    )

    # Break and Bad
    story += experience_entry(
        styles,
        job_title="Social Media Manager & Content Creator",
        company="Break and Bad",
        location="United States",
        date_range="2022 – Present",
        bullets=[
            "Manage social media presence for a sports-card company, creating engaging "
            "content across Instagram, TikTok, and Facebook targeting collectors and "
            "hobbyists nationwide.",
            "Produce high-energy pack-break Reels and product-reveal videos that drive "
            "real-time audience interaction and direct sales.",
            "Build and execute social campaigns around new product launches, "
            "collaborations, and card show appearances.",
            "Monitor analytics to optimise content strategy and grow an engaged "
            "community of collectors.",
        ],
    )

    # ── Skills ────────────────────────────────────────────────────────────────
    story += section_rule(styles, "Skills & Tools")
    story += skills_section(styles)
    story.append(Spacer(1, 10))

    # ── Why Lapoint ───────────────────────────────────────────────────────────
    story += section_rule(styles, "Why Lapoint")
    story.append(
        Paragraph(
            "Lapoint's mission — making surf travel accessible and community-driven — aligns "
            "perfectly with the way I approach content: real moments, genuine community, and "
            "a passion for life lived outdoors. My track record spans remote Montana ranches "
            "and overwater Maldivian bungalows; Lapoint's surf camps across six continents "
            "is the next chapter. I'm ready to paddle out, camera in hand.",
            styles["summary"],
        )
    )

    doc.build(story)
    print(f"Resume saved → {output_path}")


if __name__ == "__main__":
    build_resume()
