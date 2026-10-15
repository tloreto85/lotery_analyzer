# Lotofacil API regression tests: upload/parse, stats correctness, windows, generator, clear
import os
import time
import pytest
import requests
from itertools import combinations
from collections import Counter

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
SAMPLE = "/app/tests/data/lotofacil_exemplo.txt"

# Small hand-made dataset (contest numbers included, mixed separators) + 2 invalid lines
SMALL = [
    (1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
    (2, [1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]),
    (3, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 25, 23, 21]),
]
SMALL_TXT = "\n".join([
    "1,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15",
    "2;1;2;3;6;7;8;9;10;11;12;13;14;15;16;17",
    "3 2 4 6 8 10 12 14 16 18 20 22 24 25 23 21",
    "4,1,2,3",  # invalid: too few
    "5,1,1,2,3,4,5,6,7,8,9,10,11,12,13,30",  # invalid: dup/out of range
    "",
])


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def clear(s):
    r = s.delete(f"{API}/contests")
    assert r.status_code == 200
    return r.json()


# Health
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200 and "message" in r.json()


# Clear -> empty stats
def test_clear_and_empty(s):
    clear(s)
    r = s.get(f"{API}/stats")
    assert r.status_code == 200 and r.json() == {"total": 0}


def test_generate_without_data_400(s):
    r = s.post(f"{API}/generate", json={"window": 0, "quantity": 5})
    assert r.status_code == 400


def test_upload_no_valid_400(s):
    r = s.post(f"{API}/contests/upload", json={"content": "abc\n1,2,3"})
    assert r.status_code == 400


# Small dataset correctness
class TestSmallDataset:
    def test_upload_small(self, s):
        clear(s)
        r = s.post(f"{API}/contests/upload", json={"content": SMALL_TXT})
        assert r.status_code == 200
        d = r.json()
        assert d["inserted"] == 3 and d["skipped"] == 0 and d["invalid"] == 2 and d["total"] == 3

    def test_stats_values(self, s):
        st = s.get(f"{API}/stats").json()
        draws = [sorted(n) for _, n in SMALL]
        assert st["total"] == 3 and st["first_concurso"] == 1 and st["last_concurso"] == 3
        sums = [sum(d) for d in draws]  # 120, 144, 225
        assert st["sum"]["min"] == min(sums) and st["sum"]["max"] == max(sums)
        assert abs(st["sum"]["mean"] - round(sum(sums) / 3, 2)) < 0.01
        # first line
        ff = {f["number"]: f["count"] for f in st["first_line_freq"]}
        assert ff == {1: 2, 2: 3, 3: 2, 4: 2, 5: 1}
        tog = {f["qty"]: f["count"] for f in st["first_line_together"]}
        assert tog[5] == 1 and tog[3] == 1 and tog[2] == 1
        # parity
        par = {p["even"]: p["count"] for p in st["parity"]}
        exp = Counter(sum(1 for n in d if n % 2 == 0) for d in draws)
        assert par == dict(exp)
        # repeats
        rep = {r["repeated"]: r["count"] for r in st["repeats"]}
        exp_rep = Counter(len(set(a) & set(b)) for a, b in zip(draws, draws[1:]))
        assert rep == dict(exp_rep)
        # repeats parity label
        for r in st["repeats_parity"]:
            assert r["label"] == f"{r['repeated']} repetidos - {r['even']} pares x {r['odd']} ímpares"
        # top trio count
        trios = Counter(c for d in draws for c in combinations(d, 3))
        assert st["top_trios"][0]["count"] == trios.most_common(1)[0][1]
        quads = Counter(c for d in draws for c in combinations(d, 4))
        assert st["top_quads"][0]["count"] == quads.most_common(1)[0][1]

    def test_window(self, s):
        st = s.get(f"{API}/stats", params={"window": 2}).json()
        assert st["total"] == 2 and st["first_concurso"] == 2

    def test_reupload_skips(self, s):
        d = s.post(f"{API}/contests/upload", json={"content": SMALL_TXT}).json()
        assert d["inserted"] == 0 and d["skipped"] == 3


# Sample file (300 contests)
class TestSampleFile:
    def test_upload_sample(self, s):
        clear(s)
        content = open(SAMPLE).read()
        d = s.post(f"{API}/contests/upload", json={"content": content}).json()
        assert d["inserted"] == 300 and d["total"] == 300

    def test_reupload_sample(self, s):
        content = open(SAMPLE).read()
        d = s.post(f"{API}/contests/upload", json={"content": content}).json()
        assert d["inserted"] == 0 and d["skipped"] == 300

    @pytest.mark.parametrize("w,exp", [(0, 300), (10, 10), (20, 20), (30, 30), (50, 50)])
    def test_stats_windows(self, s, w, exp):
        st = s.get(f"{API}/stats", params={"window": w}).json()
        assert st["total"] == exp and st["last_concurso"] == 300

    @pytest.mark.parametrize("w,q", [(10, 10), (50, 100), (0, 1)])
    def test_generate(self, s, w, q):
        t = time.time()
        r = s.post(f"{API}/generate", json={"window": w, "quantity": q})
        el = time.time() - t
        assert r.status_code == 200
        d = r.json()
        assert d["window"] == w and d["based_on"] == (w or 300)
        games = [tuple(g["numbers"]) for g in d["games"]]
        assert len(games) == q and len(set(games)) == q
        for g in games:
            assert len(set(g)) == 15 and all(1 <= n <= 25 for n in g) and list(g) == sorted(g)
        print(f"generate w={w} q={q} took {el:.2f}s")

    @pytest.mark.parametrize("q", [0, 101])
    def test_generate_invalid_qty(self, s, q):
        r = s.post(f"{API}/generate", json={"window": 10, "quantity": q})
        assert r.status_code == 422

    def test_list_contests(self, s):
        r = s.get(f"{API}/contests", params={"limit": 5})
        assert r.status_code == 200
        d = r.json()
        assert len(d) == 5 and d[0]["concurso"] == 300 and "_id" not in d[0]
