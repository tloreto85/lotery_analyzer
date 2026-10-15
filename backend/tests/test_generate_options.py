# Generator options tests: fixed / excluded / delayed (atrasadas) + validation + batch options + delays stats. Run with -n 0
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.created = []
    yield sess
    for bid in sess.created:
        sess.delete(f"{API}/batches/{bid}")


def gen(s, **kw):
    r = s.post(f"{API}/generate", json=kw)
    if r.status_code == 200:
        s.created.append(r.json()["id"])
    return r


def expected_late(s, window, fixed=(), excluded=()):
    d = s.get(f"{API}/stats", params={"window": window}).json()["delays"]
    return [x["number"] for x in d if x["current"] > 0 and x["number"] not in set(fixed) | set(excluded)][:5]


# Stats: delays (Atraso tab)
class TestDelaysStats:
    def test_delays_structure(self, s):
        d = s.get(f"{API}/stats").json()
        assert d["total"] == 300
        dl = d["delays"]
        assert len(dl) == 25 and sorted(x["number"] for x in dl) == list(range(1, 26))
        for x in dl:
            assert x["max"] >= x["current"] >= 0 and x["avg"] >= 0
        cur = [(-x["current"], -x["max"]) for x in dl]
        assert cur == sorted(cur)
        last = set(d["last_numbers"])
        for x in dl:
            if x["number"] in last:
                assert x["current"] == 0 and x["last_seen"] == 300

    def test_delays_window(self, s):
        d = s.get(f"{API}/stats", params={"window": 10}).json()
        assert d["total"] == 10 and len(d["delays"]) == 25
        assert all(x["current"] <= 10 for x in d["delays"])


# Generate with fixed/excluded/delayed
class TestGenerateOptions:
    def test_fixed_excluded(self, s):
        fixed, excl = [1, 7, 13], [2, 20, 25]
        r = gen(s, window=0, quantity=20, fixed=fixed, excluded=excl)
        assert r.status_code == 200, r.text
        b = r.json()
        assert len(b["games"]) == 20
        assert b["options"]["fixed"] == fixed and b["options"]["excluded"] == excl and b["options"]["delayed"] == 0
        keys = set()
        for g in b["games"]:
            n = g["numbers"]
            assert len(set(n)) == 15 and all(1 <= x <= 25 for x in n) and n == sorted(n)
            assert set(fixed) <= set(n) and not set(excl) & set(n)
            assert g["sum"] == sum(n)
            keys.add(tuple(n))
        assert len(keys) == 20

    @pytest.mark.parametrize("k", [1, 2])
    def test_delayed_exact(self, s, k):
        r = gen(s, window=20, quantity=30, delayed=k)
        assert r.status_code == 200, r.text
        b = r.json()
        late = b["options"]["late"]
        assert late == expected_late(s, 20)
        assert len(late) == 5
        for g in b["games"]:
            got = [x for x in g["numbers"] if x in late]
            assert len(got) == k, (g, late)
            assert g["late"] == got

    def test_delayed_with_fixed_excluded(self, s):
        top = expected_late(s, 0)
        fixed, excl = [top[0]], [top[1]]
        r = gen(s, window=0, quantity=15, fixed=fixed, excluded=excl, delayed=2)
        assert r.status_code == 200, r.text
        b = r.json()
        late = b["options"]["late"]
        assert late == expected_late(s, 0, fixed, excl)
        assert top[0] not in late and top[1] not in late
        for g in b["games"]:
            assert top[0] in g["numbers"] and top[1] not in g["numbers"]
            assert len([x for x in g["numbers"] if x in late]) == 2

    def test_fifteen_fixed_one_game(self, s):
        t = time.time()
        r = gen(s, window=0, quantity=10, fixed=list(range(1, 16)))
        el = time.time() - t
        assert r.status_code == 200, r.text
        b = r.json()
        assert len(b["games"]) == 1 and b["games"][0]["numbers"] == list(range(1, 16))
        print(f"15 fixed qty=10 took {el:.2f}s")

    def test_ten_excluded(self, s):
        excl = list(range(16, 26))
        r = gen(s, window=0, quantity=5, excluded=excl)
        assert r.status_code == 200
        assert [g["numbers"] for g in r.json()["games"]] == [list(range(1, 16))]


# Validation 422
class TestValidation:
    @pytest.mark.parametrize("payload", [
        {"quantity": 5, "fixed": [3], "excluded": [3]},
        {"quantity": 5, "fixed": [0]},
        {"quantity": 5, "fixed": [26]},
        {"quantity": 5, "excluded": [-1]},
        {"quantity": 5, "fixed": list(range(1, 15)), "delayed": 2},
        {"quantity": 5, "excluded": list(range(1, 12))},
        {"quantity": 5, "delayed": 3},
        {"quantity": 5, "delayed": -1},
        {"quantity": 0},
        {"quantity": 101},
    ])
    def test_422(self, s, payload):
        r = s.post(f"{API}/generate", json=payload)
        assert r.status_code == 422, (payload, r.status_code, r.text)

    def test_boundary_ok(self, s):
        r = gen(s, quantity=2, fixed=list(range(1, 14)), delayed=2)
        assert r.status_code == 200, r.text
        for g in r.json()["games"]:
            assert set(range(1, 14)) <= set(g["numbers"])


# Batches list with options
class TestBatchOptions:
    def test_batches_have_options(self, s):
        r = gen(s, quantity=3, fixed=[5], excluded=[6], delayed=1)
        bid = r.json()["id"]
        lst = s.get(f"{API}/batches").json()
        mine = next(b for b in lst if b["id"] == bid)
        assert mine["options"]["fixed"] == [5] and mine["options"]["excluded"] == [6] and mine["options"]["delayed"] == 1
        assert len(mine["options"]["late"]) <= 5
        assert all("options" in b for b in lst)
        one = s.get(f"{API}/batches/{bid}").json()
        assert one["options"] == mine["options"]
