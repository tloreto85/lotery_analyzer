# Iteration 5: Fechamento com fixas (closure fixed[] + preview) and /api/performance. Run with -n 0
import os
import statistics
from itertools import combinations
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
DATA = "/app/tests/data"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.created = []
    yield sess
    for bid in sess.created:
        sess.delete(f"{API}/batches/{bid}")


def brute(games, nums, fixed, g):
    free = [x for x in nums if x not in fixed]
    sets = [set(x) for x in games]
    for omit in combinations(free, len(nums) - 15):
        draw = set(nums) - set(omit)
        assert max(len(draw & x) for x in sets) >= g, f"draw {sorted(draw)} not covered"


# ---- closure with fixed numbers ----
@pytest.mark.parametrize("nums,g,fixed,expected", [
    (list(range(1, 21)), 14, [1, 2, 3, 4], 170),
    (list(range(1, 19)), 15, [1, 2, 3], 455),
    (list(range(3, 23)), 13, [5, 9], None),
    (list(range(1, 20)), 14, [2, 4, 6, 8, 10, 12, 14, 16, 18, 19], None),
])
def test_closure_fixed(s, nums, g, fixed, expected):
    r = s.post(f"{API}/closure", json={"numbers": nums, "guarantee": g, "fixed": fixed}, timeout=120)
    assert r.status_code == 200, r.text
    b = r.json()
    s.created.append(b["id"])
    games = [x["numbers"] for x in b["games"]]
    if expected is not None:
        assert len(games) == expected
    assert len({tuple(x) for x in games}) == len(games)
    for x in games:
        assert len(x) == 15 and set(fixed) <= set(x) and set(x) <= set(nums)
    assert b["options"]["closure"]["fixed"] == sorted(fixed)
    brute(games, nums, fixed, g)
    p = s.post(f"{API}/closure/preview", json={"numbers": nums, "guarantee": g, "fixed": fixed}, timeout=120)
    assert p.status_code == 200 and p.json() == {"count": len(games)}
    got = s.get(f"{API}/batches/{b['id']}").json()
    assert got["options"]["closure"]["fixed"] == sorted(fixed)


@pytest.mark.parametrize("payload", [
    {"numbers": list(range(1, 20)), "guarantee": 15, "fixed": [1, 2, 3, 4, 5]},  # 1001 > 816
    {"numbers": list(range(1, 19)), "guarantee": 14, "fixed": [1, 25]},  # not subset
    {"numbers": list(range(1, 20)), "guarantee": 14, "fixed": list(range(1, 12))},  # 11 fixed
    {"numbers": list(range(1, 19)), "guarantee": 12, "fixed": []},
])
def test_closure_fixed_validation(s, payload):
    for ep in ("closure", "closure/preview"):
        r = s.post(f"{API}/{ep}", json=payload)
        assert r.status_code == 422, (ep, r.text)


def test_full_19_with_6_fixed_ok(s):
    p = s.post(f"{API}/closure/preview", json={"numbers": list(range(1, 20)), "guarantee": 15, "fixed": list(range(1, 7))})
    assert p.status_code == 200 and p.json()["count"] == 715


def test_preview_does_not_save(s):
    before = len(s.get(f"{API}/batches").json())
    r = s.post(f"{API}/closure/preview", json={"numbers": list(range(1, 18)), "guarantee": 14, "fixed": [1]})
    assert r.status_code == 200 and isinstance(r.json()["count"], int)
    assert len(s.get(f"{API}/batches").json()) == before


# ---- performance ----
def test_performance_manual(s):
    assert s.get(f"{API}/stats").json()["last_concurso"] == 300
    g = s.post(f"{API}/generate", json={"window": 50, "quantity": 7}).json()
    s.created.append(g["id"])
    c = s.post(f"{API}/closure", json={"numbers": list(range(1, 19)), "guarantee": 14, "fixed": [1]}).json()
    s.created.append(c["id"])
    assert s.get(f"{API}/performance").json() == []
    try:
        with open(f"{DATA}/novo_concurso_301.txt") as f:
            assert s.post(f"{API}/contests/upload", json={"content": f.read()}).json()["inserted"] == 1
        drawn = set(range(1, 16))
        batches = s.get(f"{API}/batches").json()
        exp = {}
        for b in batches:
            assert b["check"] and b["check"]["concurso"] == 301
            hits = [len(drawn & set(x["numbers"])) for x in b["games"]]
            assert hits == b["check"]["hits"]
            cl = b["options"].get("closure")
            if cl:
                typ, lab = "fechamento", "Fechamento " + ("completo" if cl["guarantee"] == 15 else f"garante {cl['guarantee']}")
            else:
                typ, lab = "gerador", "Gerador · " + (f"últimos {b['window']}" if b["window"] else "todos os concursos")
            for k in (lab, "Gerador (geral)" if typ == "gerador" else "Fechamento (geral)"):
                e = exp.setdefault(k, {"type": typ, "batches": 0, "hits": []})
                e["batches"] += 1
                e["hits"] += hits
        perf = s.get(f"{API}/performance").json()
        assert {r["label"] for r in perf} == set(exp)
        assert "Gerador · últimos 50" in exp and "Fechamento garante 14" in exp
        for r in perf:
            e = exp[r["label"]]
            h = e["hits"]
            assert r["type"] == e["type"] and r["batches"] == e["batches"] and r["games"] == len(h)
            assert r["avg"] == round(statistics.mean(h), 2) and r["best"] == max(h)
            assert r["pct_11"] == round(sum(x >= 11 for x in h) * 100 / len(h), 2)
            assert r["tiers"] == {str(k): h.count(k) for k in range(11, 16)}
            assert r["overall"] == r["label"].endswith("(geral)")
        # ordering: fechamento first (alphabetical type), overall first within type
        assert perf[0]["label"] == "Fechamento (geral)"
        assert [r for r in perf if r["type"] == "gerador"][0]["label"] == "Gerador (geral)"
        # closure with fixed [1] (drawn) and 18 nums containing all 15 drawn -> guarantee 14 met
        assert next(r for r in perf if r["label"] == "Fechamento garante 14")["best"] >= 14
        # new batch generated at 301 is not counted
        n = s.post(f"{API}/generate", json={"window": 0, "quantity": 3}).json()
        s.created.append(n["id"])
        perf2 = s.get(f"{API}/performance").json()
        assert next(r for r in perf2 if r["label"] == "Gerador (geral)")["games"] == len(exp["Gerador (geral)"]["hits"])
    finally:
        s.delete(f"{API}/contests")
        with open(f"{DATA}/lotofacil_exemplo.txt") as f:
            s.post(f"{API}/contests/upload", json={"content": f.read()})
        st = s.get(f"{API}/stats").json()
        assert st["total"] == 300 and st["last_concurso"] == 300
