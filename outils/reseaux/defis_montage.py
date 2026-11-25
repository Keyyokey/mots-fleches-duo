# Met en page les défis du jour pour les réseaux, à partir des captures de defis_capture.js.
# python3 outils/reseaux/defis_montage.py <dossier des captures> <dossier de sortie>
# Images 1080x1350 (Facebook, Instagram, TikTok photo) et une vidéo Magnético 1080x1920 (TikTok, Reels).
import sys, os, json, glob, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
SRC, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
D = os.path.dirname(os.path.abspath(__file__))
BOLD = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"; MED = "/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf"
F = lambda n, b=True: ImageFont.truetype(BOLD if b else MED, n)
LOGO = Image.open(os.path.join(D, "logo.png")).convert("RGBA"); LOGO = LOGO.crop(LOGO.getbbox())
def fond(w, h):
    im = Image.new("RGB", (w, h)); px = im.load()
    for y in range(h):
        t = y / h; c = (int(18 + 40 * t), int(21 + 10 * t), int(46 + 40 * t))
        for x in range(w): px[x, y] = c
    halo = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(halo)
    d.ellipse([-w * .3, -h * .1, w * .6, h * .45], fill=(0, 173, 181, 70)); d.ellipse([w * .5, h * .55, w * 1.3, h * 1.1], fill=(162, 107, 255, 70))
    im = im.convert("RGBA"); im.alpha_composite(halo.filter(ImageFilter.GaussianBlur(160))); return im
def centre(d, y, txt, f, col=(255, 255, 255), w=1080):
    x = (w - d.textlength(txt, font=f)) / 2; d.text((x, y), txt, font=f, fill=col); return y + f.size * 1.25
def entete(im, jeu, sous):
    d = ImageDraw.Draw(im); w = im.width
    lg = LOGO.resize((420, int(LOGO.height * 420 / LOGO.width)), Image.LANCZOS); im.alpha_composite(lg, ((w - 420) // 2, 46))
    y = 60 + lg.height + 22
    pill = F(34); t = "DÉFI DU JOUR · " + jeu.upper(); tw = d.textlength(t, font=pill)
    d.rounded_rectangle([(w - tw) / 2 - 28, y, (w + tw) / 2 + 28, y + 62], 31, fill=(255, 122, 168)); d.text(((w - tw) / 2, y + 9), t, font=pill, fill=(255, 255, 255))
    y += 84; return centre(d, y, sous, F(44, False), (238, 242, 247), w)
def pied(im, lignes, y0=None):
    d = ImageDraw.Draw(im); y = y0 or im.height - 70 - len(lignes) * 56
    for i, l in enumerate(lignes): y = centre(d, y, l, F(46 if i == 0 else 38, i == 0), (255, 225, 140) if i == 0 else (238, 242, 247), im.width)
def colle(im, cap, y, maxw=960, maxh=820, r=34):
    s = min(maxw / cap.width, maxh / cap.height); cap = cap.resize((int(cap.width * s), int(cap.height * s)), Image.LANCZOS).convert("RGBA")
    m = Image.new("L", cap.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, cap.width - 1, cap.height - 1], r, fill=255)
    ombre = Image.new("RGBA", (cap.width + 80, cap.height + 80), (0, 0, 0, 0)); ImageDraw.Draw(ombre).rounded_rectangle([40, 50, cap.width + 40, cap.height + 50], r, fill=(0, 0, 0, 140))
    x = (im.width - cap.width) // 2; im.alpha_composite(ombre.filter(ImageFilter.GaussianBlur(24)), (x - 40, y - 40)); cap.putalpha(m); im.alpha_composite(cap, (x, y)); return y + cap.height
info = json.load(open(os.path.join(SRC, "infos.json")))
# 1) mots fléchés
im = fond(1080, 1350); y = entete(im, "Mots fléchés", "Je vous donne le 1er mot. Qui finit la grille ?")
g = Image.open(os.path.join(SRC, "fleches.png")); g = g.crop((0, 0, g.width, int(g.height * .56)))   # la moitié haute : définitions lisibles sur téléphone
colle(im, g, int(y) + 20, 980, 1350 - int(y) - 200); pied(im, ["Vos réponses en commentaire 👇".replace(" 👇", ""), "Solution demain"])
im.convert("RGB").save(os.path.join(OUT, "defi_mots_fleches.png"))
# 2) mot du jour
m = info.get("motdujour", {}); im = fond(1080, 1350); y = entete(im, "Mot du jour", "Un mot de %d lettres qui commence par %s" % (m.get("len", 6), m.get("first", "?")))
d = ImageDraw.Draw(im); lg = F(30, False); yy = int(y) + 4
for i, (c, t) in enumerate([((20, 184, 166), "bien placée"), ((255, 200, 87), "mal placée"), ((90, 100, 130), "absente")]):
    x = 200 + i * 240; d.rounded_rectangle([x, yy + 6, x + 30, yy + 36], 7, fill=c); d.text((x + 42, yy), t, font=lg, fill=(238, 242, 247))
colle(im, Image.open(os.path.join(SRC, "motdujour.png")), yy + 66, 820, 1350 - yy - 250); pied(im, ["Quel est ce mot ?", "Réponse demain en commentaire"])
im.convert("RGB").save(os.path.join(OUT, "defi_mot_du_jour.png"))
# 3) énigme : un parchemin
e = json.load(open(os.path.join(SRC, "enigme.json"))); im = fond(1080, 1350); y = entete(im, "Énigme", "Saurez-vous répondre ?")
d = ImageDraw.Draw(im); x0, x1, y0, y1 = 110, 970, int(y) + 70, 1010
d.rounded_rectangle([x0 - 14, y0 - 30, x1 + 14, y0 + 4], 16, fill=(185, 141, 85)); d.rounded_rectangle([x0 - 14, y1 - 4, x1 + 14, y1 + 30], 16, fill=(185, 141, 85))
d.rectangle([x0, y0, x1, y1], fill=(245, 230, 194))
qf = F(60); mots = e["q"].split(); L = [""]
for w_ in mots:
    t = (L[-1] + " " + w_).strip()
    if d.textlength(t, font=qf) < x1 - x0 - 110: L[-1] = t
    else: L.append(w_)
yy = (y0 + y1) / 2 - len(L) * 80 / 2
for l in L: d.text(((1080 - d.textlength(l, font=qf)) / 2, yy), l, font=qf, fill=(59, 42, 20)); yy += 80
d.text((x1 - 140, y0 + 24), "n° %s" % e.get("n", ""), font=F(30), fill=(122, 85, 32))
pied(im, ["Qui suis-je ?", "Réponse en commentaire, solution demain"])
im.convert("RGB").save(os.path.join(OUT, "defi_enigme.png"))
# 4) Magnético : vidéo 1080x1920, les bulles qui bougent
mg = os.path.join(SRC, "magnetico"); cl = json.load(open(os.path.join(mg, "clip.json")))["box"]
fr = sorted(glob.glob(os.path.join(mg, "*.jpg"))); ts = [float(x) for x in open(os.path.join(mg, "t.txt")).read().split()]
base = fond(1080, 1920); y = entete(base, "Magnético", "Les syllabes s'entrechoquent…"); pied(base, ["Quel mot se cache ici ?", "Réponse en commentaire 👇".replace(" 👇", "")], 1690)
s = 1000 / cl["width"]; W, H = 1000, int(cl["height"] * s); Y = int(y) + 30
if Y + H > 1660: s = (1660 - Y) / cl["height"]; W, H = int(cl["width"] * s), 1660 - Y
X = (1080 - W) // 2; m_ = Image.new("L", (W, H), 0); ImageDraw.Draw(m_).rounded_rectangle([0, 0, W - 1, H - 1], 34, fill=255)
tmp = os.path.join(OUT, "_mg"); os.makedirs(tmp, exist_ok=True); FPS = 30; T = ts[-1] - ts[0]; n = int(T * FPS); j = 0
p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", os.path.join(OUT, "tmp_mg.mp4")], stdin=subprocess.PIPE)
for k in range(n):
    t = ts[0] + k / FPS
    while j + 1 < len(ts) and ts[j + 1] <= t: j += 1
    f = Image.open(fr[j]).convert("RGB").crop((cl["x"], cl["y"], cl["x"] + cl["width"], cl["y"] + cl["height"])).resize((W, H), Image.LANCZOS)
    # traînée lumineuse derrière les bulles : l'image précédente, assombrie, sous l'image courante
    trail = f if k == 0 else ImageChops.lighter(f, Image.eval(trail, lambda v: int(v * .82)))
    im = base.copy(); im.paste(trail, (X, Y), m_); p.stdin.write(im.convert("RGB").tobytes())
p.stdin.close(); p.wait(); os.replace(os.path.join(OUT, "tmp_mg.mp4"), os.path.join(OUT, "defi_magnetico.mp4"))
print("ok", sorted(os.listdir(OUT)))
