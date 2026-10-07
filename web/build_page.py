import json, sys, os
d = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(d, "page_template.html")).read()
eng = open(os.path.join(d, "archigan.js")).read()
model = open(os.path.join(d, "model.json")).read()
assert "</script" not in eng and "</script" not in model
t = t.replace("/*__ENGINE__*/", eng).replace("/*__MODEL__*/", model)
out = os.path.join(d, "..", "docs", "index.html")
open(out, "w").write(t)
print(os.path.normpath(out), round(len(t) / 1024), "Ko")
