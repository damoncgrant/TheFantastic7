from typing import Any


PREAMBLE = r"""\documentclass[letterpaper,11pt]{article}
\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}
\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}
\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}
\titleformat{\section}{\vspace{-4pt}\scshape\raggedright\large}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]
\pdfgentounicode=1
\newcommand{\resumeItem}[1]{\item\small{{#1 \vspace{-2pt}}}}
\newcommand{\resumeSubheading}[4]{\vspace{-2pt}\item\begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}\textbf{#1} & #2 \\ \textit{\small#3} & \textit{\small #4} \\ \end{tabular*}\vspace{-7pt}}
\newcommand{\resumeProjectHeading}[2]{\item\begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}\small#1 & #2 \\ \end{tabular*}\vspace{-7pt}}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
\begin{document}
"""


def text(value: Any) -> str:
    value = str(value or "").strip()
    replacements = {
        "\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$",
        "#": r"\#", "_": r"\_", "{": r"\{", "}": r"\}",
        "~": r"\textasciitilde{}", "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(character, character) for character in value)


def items(value: Any) -> list[dict]:
    return value if isinstance(value, list) else []


def bullets(value: Any) -> list[str]:
    return [text(bullet) for bullet in str(value or "").splitlines() if bullet.strip()]


def build_resume(data: dict) -> bytes:
    contact = data.get("contact", {}) if isinstance(data.get("contact"), dict) else {}
    name = text(contact.get("name"))
    if not name:
        raise ValueError("Add your name before rendering your resume.")

    contact_details = [text(contact.get(key)) for key in ("phone", "email", "linkedin", "github")]
    contact_details = [detail for detail in contact_details if detail]
    document = [PREAMBLE, "\\begin{center}", f"\\textbf{{\\Huge \\scshape {name}}} \\\\ \\vspace{{1pt}}"]
    if contact_details:
        document.append("\\small " + " $|$ ".join(contact_details))
    document.append("\\end{center}")

    education = [entry for entry in items(data.get("education")) if text(entry.get("school"))]
    if education:
        document.extend(["\\section{Education}", "\\resumeSubHeadingListStart"])
        for entry in education:
            document.append("\\resumeSubheading{%s}{%s}{%s}{%s}" % (
                text(entry.get("school")), text(entry.get("location")),
                text(entry.get("degree")), text(entry.get("expectedGraduation") or entry.get("dates")),
            ))
        document.append("\\resumeSubHeadingListEnd")

    experience = [entry for entry in items(data.get("experience")) if text(entry.get("title"))]
    if experience:
        document.extend(["\\section{Experience}", "\\resumeSubHeadingListStart"])
        for entry in experience:
            document.append("\\resumeSubheading{%s}{%s}{%s}{%s}" % (
                text(entry.get("title")), text(entry.get("dates")),
                text(entry.get("company")), text(entry.get("location")),
            ))
            entry_bullets = bullets(entry.get("bullets"))
            if entry_bullets:
                document.append("\\resumeItemListStart")
                document.extend(f"\\resumeItem{{{bullet}}}" for bullet in entry_bullets)
                document.append("\\resumeItemListEnd")
        document.append("\\resumeSubHeadingListEnd")

    projects = [entry for entry in items(data.get("projects")) if text(entry.get("name"))]
    if projects:
        document.extend(["\\section{Projects}", "\\resumeSubHeadingListStart"])
        for entry in projects:
            heading = r"\textbf{%s}" % text(entry.get("name"))
            stack = text(entry.get("stack"))
            if stack:
                heading += r" $|$ \emph{%s}" % stack
            document.append(r"\resumeProjectHeading{%s}{%s}" % (heading, text(entry.get("dates"))))
            entry_bullets = bullets(entry.get("bullets"))
            if entry_bullets:
                document.append("\\resumeItemListStart")
                document.extend(f"\\resumeItem{{{bullet}}}" for bullet in entry_bullets)
                document.append("\\resumeItemListEnd")
        document.append("\\resumeSubHeadingListEnd")

    skills = data.get("skills", {}) if isinstance(data.get("skills"), dict) else {}
    skill_rows = [(label, text(skills.get(key))) for key, label in (
        ("languages", "Languages"), ("frameworks", "Frameworks"),
        ("tools", "Developer Tools"), ("libraries", "Libraries"),
    )]
    skill_rows = [(label, value) for label, value in skill_rows if value]
    if skill_rows:
        document.extend([r"\section{Technical Skills}", r"\begin{itemize}[leftmargin=0.15in, label={}]", r"\small{\item{"])
        document.extend(r"\textbf{%s}{: %s} \\" % row for row in skill_rows)
        document.extend([r"}}", r"\end{itemize}"])

    document.append("\\end{document}")
    return "\n".join(document).encode("utf-8")
