"""Ukur antrean merge (keputusan 727): menit dari PR dibuka sampai merge, jumlah commit penggabungan main di PR,
dan jumlah run CI main yang merah sejak waktu tertentu. Data dari GitHub (gh), bukan dari laporan.

    python3 tools/ukur_pr.py 311 312 313             # satu baris per PR + median menit
    python3 tools/ukur_pr.py 311 312 --sejak 2026-10-25T00:00:00Z   # tambah jumlah run main merah sejak waktu itu

Commit penggabungan = commit di PR yang punya lebih dari satu orang tua (git merge ke branch PR). Diambil dari
`gh api repos/{owner}/{repo}/pulls/N/commits`; PR yang di-merge lewat merge commit PR itu sendiri tidak dihitung.
"""
import json
import statistics
import subprocess
import sys
from datetime import datetime


def gh(*args):
    r = subprocess.run(["gh", *args], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"gh {' '.join(args)}: {r.stderr.strip()}")
    return r.stdout


def waktu(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def satu(n):
    pr = json.loads(gh("pr", "view", str(n), "--json", "number,createdAt,mergedAt,state,title,headRefName"))
    komit = json.loads(gh("api", f"repos/{{owner}}/{{repo}}/pulls/{n}/commits", "--paginate", "--jq", "[.[] | {sha: .sha, orang_tua: (.parents | length)}]"))
    gabung = sum(1 for k in komit if k["orang_tua"] > 1)
    menit = None
    if pr["mergedAt"]:
        menit = round((waktu(pr["mergedAt"]) - waktu(pr["createdAt"])).total_seconds() / 60)
    return pr, gabung, menit


def main():
    arg = sys.argv[1:]
    sejak = None
    if "--sejak" in arg:
        i = arg.index("--sejak")
        sejak = arg[i + 1]
        del arg[i:i + 2]
    nomor = [int(a) for a in arg]
    if not nomor and not sejak:
        print(__doc__)
        return
    menits = []
    for n in nomor:
        pr, gabung, menit = satu(n)
        menits.append(menit) if menit is not None else None
        print(f"#{n}\t{pr['state']}\tdibuka {pr['createdAt']}\tmerge {pr['mergedAt'] or '-'}\t"
              f"{'-' if menit is None else str(menit) + ' menit'}\tgabung main {gabung}x\t{pr['headRefName']}")
    if menits:
        print(f"median {statistics.median(menits):.0f} menit dari {len(menits)} PR yang sudah merge (pembanding pemilik: 160)")
    if sejak:
        runs = json.loads(gh("run", "list", "--branch", "main", "--workflow", "cek", "--limit", "200",
                             "--json", "conclusion,createdAt,headSha"))
        merah = [r for r in runs if r["conclusion"] == "failure" and waktu(r["createdAt"]) >= waktu(sejak)]
        total = [r for r in runs if waktu(r["createdAt"]) >= waktu(sejak)]
        print(f"run main sejak {sejak}: {len(total)}, merah {len(merah)}" +
              ("" if not merah else " (" + ", ".join(r["headSha"][:7] for r in merah) + ")"))


if __name__ == "__main__":
    main()
