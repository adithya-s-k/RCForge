"""Render the published numerical snapshot; no simulator or measured data is invented.

Requires matplotlib==3.10.7. Generated SVG text stays searchable and selectable.
"""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FormatStrFormatter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/benchmarks/2026-09-08.json"
data = json.loads(SOURCE.read_text())["nasa"]
plt.rcParams.update({"font.family": "sans-serif", "font.sans-serif": ["DejaVu Sans", "Arial", "sans-serif"], "font.size": 11,
                     "svg.fonttype": "none", "svg.hashsalt": "rcforge-benchmarks-2026-09-08"})

for mode, bg, ink, muted, grid, standard, finer in [
    ("", "#101317", "#e7eaed", "#a6afb9", "#343b44", "#efc878", "#7dbbb3"),
    ("-light", "#f5f7fa", "#202833", "#566372", "#d6dde5", "#955a0b", "#247d75"),
]:
    fig, ax = plt.subplots(figsize=(10, 5.8), facecolor=bg)
    ax.set_facecolor(bg)
    fig.subplots_adjust(left=.14, right=.94, bottom=.24, top=.72)
    fig.text(.04, .93, "Checking the same rotating body", fontsize=19, weight="bold", color=ink)
    fig.text(.04, .866, "Five published NASA outputs · 30 seconds · no aerodynamic forces", color=muted)
    for i, (a, b) in enumerate(zip(data["at120"], data["at240"], strict=True)):
        assert a["file"] == b["file"]
        ax.scatter(a["maxRateErrorDegS"], i-.10, c=standard, s=55, zorder=3,
                   label="120 Hz · normal physics step" if i == 0 else None)
        ax.scatter(b["maxRateErrorDegS"], i+.10, c=finer, s=45, marker="D", zorder=3,
                   label="240 Hz · smaller comparison step" if i == 0 else None)
    ax.set_yticks(range(5), ["Source " + a["file"].split("_")[-1][:-4] for a in data["at120"]])
    ax.invert_yaxis()
    ax.set_xlim(-.00015, .0106)
    ax.axvline(data["limitDegS"], color=muted, linewidth=1, linestyle=(0, (4, 4)))
    ax.text(data["limitDegS"], -.48, "Limit: 0.01", ha="right", color=muted, fontsize=10)
    ax.xaxis.set_major_formatter(FormatStrFormatter("%.3f"))
    ax.set_xlabel("Largest angular-rate difference (degrees/second) · lower is closer", color=ink, labelpad=12)
    ax.grid(axis="x", color=grid, linewidth=.7)
    ax.tick_params(colors=muted, length=0, pad=9)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.legend(loc="lower left", bbox_to_anchor=(-.01, 1.04), ncol=2,
              frameon=False, labelcolor=ink, fontsize=10)
    fig.text(.04, .075, "This checks torque-free rotation. It does not measure RC aircraft handling.", color=ink, fontsize=11)
    fig.text(.04, .027, "NESC 2015 case 02 · all five available outputs retained · snapshot 8 Sep 2026", color=muted, fontsize=9)
    out = ROOT / f"docs/images/benchmark-nasa{mode}.svg"
    fig.savefig(out, metadata={"Date": None, "Title": "RCForge versus published NASA angular rates",
                              "Description": "Maximum three-axis inertial body-rate differences over 30 seconds at 120 and 240 Hz; all five reference datasets are below the 0.01 degree per second engineering limit."})
    out.write_text("\n".join(line.rstrip() for line in out.read_text().splitlines()) + "\n")
    plt.close(fig)
    print(out.relative_to(ROOT))
