import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from django.conf import settings
import pymupdf


class LatexError(Exception):
    def __init__(self, message, details="", status=422):
        super().__init__(message)
        self.details = details
        self.status = status


def compile_pdf(source):
    compiler = os.environ.get("PDFLATEX_PATH") or shutil.which("pdflatex")
    if not compiler:
        candidates = list((settings.BASE_DIR / ".tools" / "TinyTeX" / "bin").glob("*/pdflatex"))
        candidates.append(Path("/Library/TeX/texbin/pdflatex"))
        compiler = next((str(path) for path in candidates if path.is_file()), None)
    if not compiler:
        raise LatexError("The PDF compiler is not installed. See the LaTeX setup in README.md.", status=503)

    with tempfile.TemporaryDirectory(prefix="resume-") as directory:
        workdir = Path(directory)
        (workdir / "resume.tex").write_bytes(source)
        # Keep generated files in this request's directory; disable shell commands.
        env = {**os.environ, "openin_any": "p", "openout_any": "p"}
        command = [compiler, "-no-shell-escape", "-interaction=nonstopmode",
                   "-halt-on-error", "-file-line-error", "resume.tex"]
        try:
            # A second pass resolves references and PDF bookmarks.
            for _ in range(2):
                result = subprocess.run(command, cwd=directory, env=env,
                                        capture_output=True, timeout=20)
                if result.returncode:
                    details = (result.stdout + result.stderr).decode("utf-8", errors="replace")
                    raise LatexError("Could not compile this LaTeX file. Check the compiler details below.",
                                     details[-6000:])
        except subprocess.TimeoutExpired:
            raise LatexError("Compilation timed out. Check your LaTeX file and try again.", status=408)
        except OSError:
            raise LatexError("The PDF compiler could not start. Check the LaTeX setup in README.md.", status=503)

        pdf = workdir / "resume.pdf"
        if not pdf.is_file() or not pdf.read_bytes().startswith(b"%PDF-"):
            raise LatexError("The LaTeX file did not produce a PDF.")
        return pdf.read_bytes()


def compile_png(source):
    pdf = compile_pdf(source)
    try:
        with pymupdf.open(stream=pdf, filetype="pdf") as document:
            if document.page_count == 0:
                raise LatexError("The LaTeX file produced an empty PDF.")
            page = document.load_page(0)
            # Render at twice the PDF's native resolution for readable text.
            pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
            return pixmap.tobytes("png")
    except LatexError:
        raise
    except Exception as error:
        raise LatexError("The compiled resume could not be converted to an image.", str(error))
