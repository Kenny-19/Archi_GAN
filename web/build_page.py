"""Assemble la demonstration web.

Produit deux fichiers a partir de page_template.html :
  archigan-sl.html : version claude.ai (l'hebergeur ajoute lui-meme l'en-tete HTML)
  index.html       : version autonome (Vercel, GitHub, ouverture locale), avec un
                     en-tete complet : encodage, viewport (affichage mobile), langue.
La cle publique Web3Forms (envoi des observations par e-mail) est lue dans la
variable d'environnement WEB3FORMS_KEY.
"""
import os, sys

d = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(d, "page_template.html"), encoding="utf-8").read()
eng = open(os.path.join(d, "archigan.js"), encoding="utf-8").read()
model = open(os.path.join(d, "model.json"), encoding="utf-8").read()
assert "</script" not in eng and "</script" not in model
t = t.replace("/*__ENGINE__*/", eng).replace("/*__MODEL__*/", model)
key = os.environ.get("WEB3FORMS_KEY", "").strip()
if key:
    t = t.replace("__WEB3FORMS_KEY__", key)

out_dir = sys.argv[1] if len(sys.argv) > 1 else d
artifact = os.path.join(out_dir, "archigan-sl.html")
open(artifact, "w", encoding="utf-8").write(t)

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
              + head + "\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")
index = os.path.join(out_dir, "index.html")
open(index, "w", encoding="utf-8").write(standalone)
for p in (artifact, index):
    print(os.path.normpath(p), round(os.path.getsize(p) / 1024), "Ko")
