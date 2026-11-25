# Construit public/direct.html (mode direct pour OBS) : la page source + le logo Motipop et un QR code vers motipop.fr intégrés.
# python3 outils/direct/build_direct.py   (QR code : pip install qrcode)
import os, re, qrcode
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(D, "..", ".."))
src = open(os.path.join(D, "direct_src.html"), encoding="utf8").read()
logo = open(os.path.join(ROOT, "outils", "marque", "motipop-logo.svg"), encoding="utf8").read()
logo = re.sub(r"<\?xml[^>]*>", "", logo).strip()
q = qrcode.QRCode(border=1, error_correction=qrcode.constants.ERROR_CORRECT_M); q.add_data("https://motipop.fr/?ref=live"); q.make()
m = q.get_matrix(); n = len(m); d = "".join(f"M{x},{y}h1v1h-1z" for y, r in enumerate(m) for x, v in enumerate(r) if v)
qr = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges" role="img" aria-label="QR code vers motipop.fr"><rect width="{n}" height="{n}" fill="#fff"/><path d="{d}" fill="#12152e"/></svg>'
out = src.replace("__LOGO__", logo).replace("__QR__", qr)
open(os.path.join(ROOT, "public", "direct.html"), "w", encoding="utf8").write(out); print("public/direct.html", len(out) // 1024, "Ko")
