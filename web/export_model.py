import json, torch, numpy as np, sys
ck = torch.load(sys.argv[1], map_location="cpu", weights_only=False)
sd = ck["G"]
r = lambda t: [float(f"{x:.6g}") for x in t.flatten().tolist()]
def lin(i):
    W = sd[f"model.{i}.weight"]
    return {"W": [[float(f"{v:.6g}") for v in row] for row in W.tolist()], "b": r(sd[f"model.{i}.bias"])}
def bn(i):
    return {"w": r(sd[f"model.{i}.weight"]), "b": r(sd[f"model.{i}.bias"]),
            "mean": r(sd[f"model.{i}.running_mean"]), "var": r(sd[f"model.{i}.running_var"])}
model = {"latent_dim": ck["latent_dim"], "max_vec": [float(x) for x in ck["max_per_room"]],
         "names": ck["room_names"],
         "weights": {"l0": lin(0), "bn2": bn(2), "l3": lin(3), "bn5": bn(5), "l6": lin(6), "l8": lin(8)}}
json.dump(model, open(sys.argv[2], "w"), separators=(",", ":"))
# jeux de test pour comparer avec la passe avant JavaScript
import torch.nn as nn
L = nn.Sequential(nn.Linear(32 + 30, 128), nn.LeakyReLU(0.2), nn.BatchNorm1d(128),
                  nn.Linear(128, 128), nn.LeakyReLU(0.2), nn.BatchNorm1d(128),
                  nn.Linear(128, 64), nn.LeakyReLU(0.2), nn.Linear(64, 15), nn.Sigmoid())
L.load_state_dict({k.replace("model.", ""): v for k, v in sd.items()}); L.eval()
g = torch.Generator().manual_seed(0)
z = torch.randn(20, 32, generator=g); c = torch.rand(20, 30, generator=g); c[:, 15:] = (c[:, 15:] > 0.5).float()
with torch.no_grad(): out = L(torch.cat([z, c], 1))
json.dump({"z": z.tolist(), "c": c.tolist(), "out": out.tolist()}, open(sys.argv[3], "w"))
print("export ok", sum(p.numel() for p in L.parameters()), "parametres")
