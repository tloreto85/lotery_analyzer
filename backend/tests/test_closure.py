# Fechamento (closure) tests: counts, guarantee brute-force, validation, batch persistence, 400 w/o contests. Run with -n 0
import os
import time
from itertools import combinations
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

EXPECTED = {15: {16: 16, 17: 136, 18: 816}, 14: {16: 1, 17: 8, 18: 24, 19: 145, 20: 481},
            13: {16: 1, 17: 1, 18: 6, 19: 13, 20: 42}}
NUMS = list(range(1, 21))


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.created = []
    yield sess
    for bid in sess.created:
        sess.delete(f"{API}/batches/{bid}")


def closure(s, numbers, guarantee):
    r = s.post(f"{API}/closure", json={"numbers": numbers, "guarantee": guarantee}, timeout=120)
    if r.status_code == 200:
        s.created.append(r.json()["id"])
    return r


def chosen(n):
    # use a non-contiguous set to avoid trivial ordering luck
    return sorted([2, 4, 5, 7, 9, 10, 11, 13, 14, 16, 18, 19, 20, 21, 22, 23, 24, 25, 1, 3][:n])


@pytest.mark.parametrize("g,n", [(g, n) for g in EXPECTED for n in EXPECTED[g]])
def test_counts_and_guarantee(s, g, n):
    nums = chosen(n)
    t = time.time()
    r = closure(s, nums, g)
    el = time.time() - t
    assert r.status_code == 200, r.text
    d = r.json()
    games = [g_["numbers"] for g_ in d["games"]]
    print(f"g={g} n={n} count={len(games)} time={el:.2f}s")
    assert len(games) == EXPECTED[g][n]
    assert len({tuple(x) for x in games}) == len(games)
    for x in games:
        assert len(x) == 15 and len(set(x)) == 15 and set(x) <= set(nums) and x == sorted(x)
    assert d["options"]["closure"] == {"numbers": nums, "guarantee": g}
    if n <= 20:
        gs = [set(x) for x in games]
        for drawn in combinations(nums, 15):
            ds = set(drawn)
            assert max(len(ds & x) for x in gs) >= g, f"guarantee broken for {drawn}"


@pytest.mark.parametrize("payload", [
    {"numbers": list(range(1, 16)), "guarantee": 14},
    {"numbers": list(range(1, 22)), "guarantee": 14},
    {"numbers": list(range(1, 16)) + [1], "guarantee": 14},
    {"numbers": list(range(1, 16)) + [26], "guarantee": 14},
    {"numbers": list(range(0, 16)), "guarantee": 14},
    {"numbers": list(range(1, 17)), "guarantee": 12},
    {"numbers": list(range(1, 17)), "guarantee": 16},
    {"numbers": list(range(1, 20)), "guarantee": 15},
    {"numbers": list(range(1, 21)), "guarantee": 15},
])
def test_validation_422(s, payload):
    r = closure(s, payload["numbers"], payload["guarantee"])
    assert r.status_code == 422, r.text


def test_unsorted_input_sorted_and_batch_listed(s):
    nums = list(range(17, 0, -1))
    r = closure(s, nums, 14)
    assert r.status_code == 200
    d = r.json()
    assert d["options"]["closure"]["numbers"] == list(range(1, 18))
    batches = s.get(f"{API}/batches").json()
    b = next(x for x in batches if x["id"] == d["id"])
    assert b["options"]["closure"] == {"numbers": list(range(1, 18)), "guarantee": 14}
    assert len(b["games"]) == 8
    # conferir against an existing contest
    one = s.get(f"{API}/batches/{d['id']}", params={"concurso": 300})
    assert one.status_code == 200, one.text
    print("check keys", list(one.json().keys()))


def test_no_contests_400(s):
    contests = s.get(f"{API}/contests", params={"limit": 100000}).json()
    assert len(contests) >= 1
    content = "\n".join(f"{c['concurso']} " + " ".join(map(str, c["numbers"])) for c in sorted(contests, key=lambda c: c["concurso"]))
    try:
        s.delete(f"{API}/contests")
        r = s.post(f"{API}/closure", json={"numbers": list(range(1, 17)), "guarantee": 14})
        assert r.status_code == 400
        assert "Nenhum concurso" in r.json()["detail"]
    finally:
        up = s.post(f"{API}/contests/upload", json={"content": content})
        assert up.status_code == 200 and up.json()["total"] == len(contests)
