"""Assemble la demonstration web.

Produit deux fichiers a partir de page_template.html :
  archigan-sl.html : version claude.ai (l'hebergeur ajoute lui-meme l'en-tete HTML)
  index.html       : version autonome (Vercel, GitHub, ouverture locale), avec un
                     en-tete complet : encodage, viewport (affichage mobile), langue.
La cle publique Web3Forms (envoi des observations par e-mail) est lue dans la
variable d'environnement WEB3FORMS_KEY.
"""
import os, sys, datetime

d = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(d, "page_template.html"), encoding="utf-8").read()
eng = open(os.path.join(d, "archigan.js"), encoding="utf-8").read()
model = open(os.path.join(d, "model.json"), encoding="utf-8").read()
assert "</script" not in eng and "</script" not in model
t = t.replace("/*__ENGINE__*/", eng).replace("/*__MODEL__*/", model)
key = os.environ.get("WEB3FORMS_KEY", "").strip()
if key:
    t = t.replace("__WEB3FORMS_KEY__", key)

root = os.path.normpath(os.path.join(d, ".."))
# Le site est publie depuis archigan_site/ (Vercel) et docs/ : on ecrit les deux.
out_dirs = sys.argv[1:] or [os.path.join(root, "archigan_site"), os.path.join(root, "docs")]
version = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
artifact = os.path.join(d, "archigan-sl.html")          # version claude.ai
assert "const ON_CLAUDE = false;" in t
open(artifact, "w", encoding="utf-8").write(t.replace("const ON_CLAUDE = false;", "const ON_CLAUDE = true;"))

cut = t.index("</style>") + len("</style>")
head, body = t[:cut], t[cut:]
icon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
        "%3Crect width='32' height='32' fill='%23f3ecc8'/%3E%3Cpath d='M5 5h22v22H5zM5 16h12V5M17 16v11' "
        "fill='none' stroke='%2326231c' stroke-width='2.5'/%3E%3C/svg%3E")
standalone = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
              '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
              '<meta name="description" content="Esquisses de logements 2D dessinées à partir d\'une phrase, '
              'par un GAN conditionnel et un algorithme de placement.">\n'
              f'<link rel="icon" href="{icon}">\n'
              f'<meta name="version" content="{version}">\n'
              + head + "\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")
written = [artifact]
for od in out_dirs:
    os.makedirs(od, exist_ok=True)
    index = os.path.join(od, "index.html")
    open(index, "w", encoding="utf-8").write(standalone)
    written.append(index)
for p in written:
    print(os.path.relpath(p, root), round(os.path.getsize(p) / 1024), "Ko")
print("version", version)
