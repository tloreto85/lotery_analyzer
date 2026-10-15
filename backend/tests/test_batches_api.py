# Game history (batches) + check (conferir) API tests. Run with -n 0 (stateful, shared DB)
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
SAMPLE = "/app/tests/data/lotofacil_exemplo.txt"
C301 = "/app/tests/data/novo_concurso_301.txt"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    created = []
    sess.created = created
    yield sess
    for bid in created:
        sess.delete(f"{API}/batches/{bid}")
    # restore DB to 300 contests
    sess.delete(f"{API}/contests")
    sess.post(f"{API}/contests/upload", json={"content": open(SAMPLE).read()})


def reset_300(s):
    s.delete(f"{API}/contests")
    d = s.post(f"{API}/contests/upload", json={"content": open(SAMPLE).read()}).json()
    assert d["total"] == 300


class TestBatches:
    state = {}

    def test_generate_saves_batch(self, s):
        reset_300(s)
        r = s.post(f"{API}/generate", json={"window": 20, "quantity": 7})
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["id"], str) and len(d["id"]) == 24
        assert d["window"] == 20 and d["based_on"] == 20 and d["last_concurso"] == 300
        assert len(d["games"]) == 7 and d["check"] is None and "created_at" in d
        s.created.append(d["id"])
        TestBatches.state["b1"] = d

    def test_list_newest_first(self, s):
        r2 = s.post(f"{API}/generate", json={"window": 0, "quantity": 3}).json()
        s.created.append(r2["id"])
        TestBatches.state["b2"] = r2
        lst = s.get(f"{API}/batches").json()
        assert lst[0]["id"] == r2["id"] and lst[1]["id"] == TestBatches.state["b1"]["id"]
        assert all("_id" not in b for b in lst)
        dates = [b["created_at"] for b in lst]
        assert dates == sorted(dates, reverse=True)
        assert lst[0]["check"] is None and lst[1]["check"] is None

    def test_get_batch_pending(self, s):
        b = TestBatches.state["b1"]
        r = s.get(f"{API}/batches/{b['id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["check"] is None and d["games"] == b["games"]

    def test_check_after_upload_301(self, s):
        up = s.post(f"{API}/contests/upload", json={"content": open(C301).read()}).json()
        assert up["inserted"] == 1 and up["total"] == 301
        lst = {b["id"]: b for b in s.get(f"{API}/batches").json()}
        for key in ("b1", "b2"):
            b = lst[TestBatches.state[key]["id"]]
            c = b["check"]
            assert c is not None and c["concurso"] == 301 and c["numbers"] == list(range(1, 16))
            exp = [len(set(g["numbers"]) & set(range(1, 16))) for g in b["games"]]
            assert c["hits"] == exp and c["best"] == max(exp)
            assert c["summary"] == {str(k): exp.count(k) for k in range(11, 16)}

    def test_check_specific_contest(self, s):
        b = TestBatches.state["b1"]
        contests = s.get(f"{API}/contests", params={"limit": 2}).json()
        c300 = next(c for c in contests if c["concurso"] == 300)
        d = s.get(f"{API}/batches/{b['id']}", params={"concurso": 300}).json()
        assert d["check"]["concurso"] == 300
        exp = [len(set(g["numbers"]) & set(c300["numbers"])) for g in b["games"]]
        assert d["check"]["hits"] == exp

    def test_check_unknown_contest_404(self, s):
        r = s.get(f"{API}/batches/{TestBatches.state['b1']['id']}", params={"concurso": 9999})
        assert r.status_code == 404 and "9999" in r.json()["detail"]

    @pytest.mark.parametrize("bid", ["abc", "000000000000000000000000"])
    def test_get_invalid_404(self, s, bid):
        assert s.get(f"{API}/batches/{bid}").status_code == 404

    @pytest.mark.parametrize("bid", ["abc", "000000000000000000000000"])
    def test_delete_invalid_404(self, s, bid):
        assert s.delete(f"{API}/batches/{bid}").status_code == 404

    def test_delete_batch(self, s):
        bid = TestBatches.state["b2"]["id"]
        r = s.delete(f"{API}/batches/{bid}")
        assert r.status_code == 200 and r.json() == {"deleted": 1}
        assert s.get(f"{API}/batches/{bid}").status_code == 404
        assert bid not in [b["id"] for b in s.get(f"{API}/batches").json()]
        s.created.remove(bid)
