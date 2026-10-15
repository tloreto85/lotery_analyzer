from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import random
import logging
import statistics
import math
import numpy as np
from collections import Counter
from itertools import combinations
from pathlib import Path
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, model_validator
from typing import List, Optional, Annotated
from datetime import datetime, timezone
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

PyObjectId = Annotated[str, BeforeValidator(str)]
FIRST_LINE = {1, 2, 3, 4, 5}


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self):
        d = self.model_dump(by_alias=True)
        d.pop("_id", None)
        return d

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc)


class Contest(BaseDocument):
    concurso: int
    numbers: List[int]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GameBatch(BaseDocument):
    window: int
    based_on: int
    last_concurso: int
    games: List[dict]
    options: dict = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def check_batch(batch: GameBatch, contest: Optional[Contest]):
    out = batch.model_dump()
    out["check"] = None
    if contest:
        drawn = set(contest.numbers)
        hits = [len(drawn & set(g["numbers"])) for g in batch.games]
        out["check"] = {"concurso": contest.concurso, "numbers": contest.numbers, "hits": hits,
                        "best": max(hits), "summary": {str(k): hits.count(k) for k in range(11, 16)}}
    return out


class UploadIn(BaseModel):
    content: str


class GenerateIn(BaseModel):
    window: int = 0
    quantity: int = Field(ge=1, le=100)
    fixed: List[int] = []
    excluded: List[int] = []
    delayed: int = Field(default=0, ge=0, le=2)

    @model_validator(mode="after")
    def check_numbers(self):
        f, e = set(self.fixed), set(self.excluded)
        if any(n < 1 or n > 25 for n in f | e):
            raise ValueError("Dezenas devem estar entre 1 e 25.")
        if f & e:
            raise ValueError("Uma dezena não pode ser fixa e excluída ao mesmo tempo.")
        if len(f) + self.delayed > 15:
            raise ValueError("Dezenas fixas + atrasadas não podem passar de 15.")
        if 25 - len(e) < 15:
            raise ValueError("Exclua no máximo 10 dezenas.")
        self.fixed, self.excluded = sorted(f), sorted(e)
        return self


class ClosureIn(BaseModel):
    numbers: List[int]
    guarantee: int = Field(ge=13, le=15)
    fixed: List[int] = []

    @model_validator(mode="after")
    def check_numbers(self):
        nums = set(self.numbers)
        if len(nums) != len(self.numbers) or any(n < 1 or n > 25 for n in nums):
            raise ValueError("Dezenas devem ser únicas e entre 1 e 25.")
        if not 16 <= len(nums) <= 20:
            raise ValueError("Escolha de 16 a 20 dezenas.")
        fx = set(self.fixed)
        if not fx <= nums:
            raise ValueError("As dezenas fixas devem estar entre as escolhidas.")
        if len(fx) > 10:
            raise ValueError("Fixe no máximo 10 dezenas.")
        if self.guarantee == 15 and math.comb(len(nums) - len(fx), len(nums) - 15) > 816:
            raise ValueError("Fechamento completo limitado a 816 jogos. Fixe mais dezenas ou use Garante 14/13.")
        self.numbers, self.fixed = sorted(nums), sorted(fx)
        return self


def parse_text(content: str):
    rows, invalid = [], 0
    for line in content.splitlines():
        tokens = [int(t) for t in re.findall(r"\d+", line)]
        if len(tokens) < 15:
            if tokens:
                invalid += 1
            continue
        concurso = tokens[0] if len(tokens) > 15 else None
        nums = tokens[-15:]
        if len(set(nums)) != 15 or any(n < 1 or n > 25 for n in nums):
            invalid += 1
            continue
        rows.append((concurso, sorted(nums)))
    return rows, invalid


async def load_contests(window: int):
    cursor = db.contests.find({}).sort("concurso", -1)
    if window > 0:
        cursor = cursor.limit(window)
    docs = await cursor.to_list(100000)
    return list(reversed([Contest.from_mongo(d) for d in docs]))


def pct(c, total):
    return round(c * 100 / total, 2) if total else 0


def compute_stats(contests: List[Contest]):
    draws = [c.numbers for c in contests]
    total = len(draws)
    if total == 0:
        return {"total": 0}

    num_freq = Counter(n for d in draws for n in d)
    first_freq = sorted(({"number": n, "count": num_freq[n], "pct": pct(num_freq[n], total)} for n in FIRST_LINE),
                        key=lambda x: -x["count"])
    together = Counter(len(FIRST_LINE & set(d)) for d in draws)
    first_together = [{"qty": k, "count": together[k], "pct": pct(together[k], total)} for k in range(6)]

    trios, quads = Counter(), Counter()
    for d in draws:
        trios.update(combinations(d, 3))
        quads.update(combinations(d, 4))
    top_trios = [{"numbers": list(k), "count": v, "pct": pct(v, total)} for k, v in trios.most_common(10)]
    top_quads = [{"numbers": list(k), "count": v, "pct": pct(v, total)} for k, v in quads.most_common(10)]

    sums = [sum(d) for d in draws]
    bins = Counter((s // 10) * 10 for s in sums)
    histogram = [{"range": f"{b}-{b + 9}", "start": b, "count": bins[b], "pct": pct(bins[b], total)} for b in sorted(bins)]
    top_bin = max(histogram, key=lambda x: x["count"])
    mean = statistics.mean(sums)
    std = statistics.pstdev(sums)
    sum_stats = {"min": min(sums), "max": max(sums), "mean": round(mean, 2), "std": round(std, 2),
                 "most_frequent_range": top_bin["range"], "most_frequent_range_count": top_bin["count"],
                 "histogram": histogram}

    par = Counter(sum(1 for n in d if n % 2 == 0) for d in draws)
    parity = [{"label": f"{e}P x {15 - e}I", "even": e, "odd": 15 - e, "count": c, "pct": pct(c, total)}
              for e, c in sorted(par.items(), key=lambda x: -x[1])]

    rep, rep_par = Counter(), Counter()
    for prev, cur in zip(draws, draws[1:]):
        common = set(prev) & set(cur)
        e = sum(1 for n in common if n % 2 == 0)
        rep[len(common)] += 1
        rep_par[(len(common), e)] += 1
    rep_total = max(total - 1, 0)
    repeats = [{"repeated": k, "count": v, "pct": pct(v, rep_total)} for k, v in sorted(rep.items())]
    plural = lambda n, s, p: f"{n} {s if n == 1 else p}"
    repeats_parity = [{"repeated": k, "even": e, "odd": k - e,
                       "label": f"{plural(k, 'repetido', 'repetidos')} - {plural(e, 'par', 'pares')} x {plural(k - e, 'ímpar', 'ímpares')}",
                       "count": v, "pct": pct(v, rep_total)}
                      for (k, e), v in sorted(rep_par.items(), key=lambda x: (-x[0][0], -x[1]))]
    avg_rep = round(sum(k * v for k, v in rep.items()) / rep_total, 2) if rep_total else 0

    delays = []
    for n in range(1, 26):
        idx = [i for i, d in enumerate(draws) if n in d]
        bounds = [-1] + idx + [total]
        gaps = [b - a - 1 for a, b in zip(bounds, bounds[1:])]
        delays.append({"number": n, "current": gaps[-1], "max": max(gaps),
                       "avg": round(statistics.mean(gaps), 2),
                       "last_seen": contests[idx[-1]].concurso if idx else None})
    delays.sort(key=lambda x: (-x["current"], -x["max"]))

    return {
        "total": total,
        "first_concurso": contests[0].concurso,
        "last_concurso": contests[-1].concurso,
        "last_numbers": draws[-1],
        "number_freq": [{"number": n, "count": num_freq[n], "pct": pct(num_freq[n], total)} for n in range(1, 26)],
        "first_line_freq": first_freq,
        "first_line_together": first_together,
        "top_trios": top_trios,
        "top_quads": top_quads,
        "sum": sum_stats,
        "parity": parity,
        "repeats": repeats,
        "repeats_parity": repeats_parity,
        "avg_repeats": avg_rep,
        "delays": delays,
    }


def top_values(items, key, cover=0.7):
    chosen, acc = set(), 0
    for it in sorted(items, key=lambda x: -x["count"]):
        chosen.add(it[key])
        acc += it["pct"]
        if acc >= cover * 100:
            break
    return chosen


POPCOUNT = np.array([bin(i).count("1") for i in range(1 << 20)], dtype=np.int8)


def closure_games(numbers: List[int], guarantee: int, fixed: List[int] = ()):
    """guarantee=15 -> all combinations; 14/13 -> greedy covering assuming fixed drawn and all 15 drawn in numbers."""
    free = [x for x in numbers if x not in set(fixed)]
    n = len(free)
    k = len(numbers) - 15
    omits = list(combinations(range(n), k))
    if guarantee == 15:
        chosen = range(len(omits))
    else:
        m = guarantee - 15 + k
        masks = np.array([sum(1 << i for i in o) for o in omits], dtype=np.int64)
        covered = np.zeros(len(masks), dtype=bool)
        neigh = lambda u: np.nonzero(POPCOUNT[masks & masks[u]] >= m)[0]
        gain = np.array([len(neigh(u)) for u in range(len(masks))]) if m > 0 else np.full(len(masks), len(masks))
        chosen = []
        while not covered.all():
            c = int(np.argmax(gain))
            chosen.append(c)
            for u in neigh(c) if m > 0 else range(len(masks)):
                if not covered[u]:
                    covered[u] = True
                    gain[neigh(u) if m > 0 else slice(None)] -= 1
    return [sorted(list(fixed) + [free[i] for i in range(n) if i not in set(omits[c])]) for c in chosen]


def game_info(g, last, late=()):
    return {"numbers": g, "sum": sum(g), "even": sum(1 for n in g if n % 2 == 0),
            "repeated": len(last & set(g)), "late": [n for n in g if n in late]}


def generate_games(stats, quantity, fixed=(), excluded=(), delayed=0):
    weights = {f["number"]: f["count"] + 1 for f in stats["number_freq"]}
    s = stats["sum"]
    lo, hi = s["mean"] - s["std"], s["mean"] + s["std"]
    ok_even = top_values(stats["parity"], "even")
    ok_first = top_values([f for f in stats["first_line_together"] if f["count"]], "qty")
    ok_rep = top_values(stats["repeats"], "repeated") if stats["repeats"] else None
    last = set(stats["last_numbers"])
    fixed, excluded = set(fixed), set(excluded)
    pool = [n for n in range(1, 26) if n not in excluded]
    late = [d["number"] for d in stats["delays"] if d["current"] > 0 and d["number"] not in fixed | excluded][:5]
    games, seen = [], set()
    limit = quantity * 3000
    for i in range(limit + quantity * 50):
        if len(games) >= quantity:
            break
        chosen_late = set(random.sample(late, min(delayed, len(late))))
        picked = set(fixed) | chosen_late
        blocked = set(late) - chosen_late if delayed else set()
        if len(set(pool) - blocked) < 15:
            blocked = set()
        while len(picked) < 15:
            cand = [n for n in pool if n not in picked and n not in blocked]
            picked.add(random.choices(cand, weights=[weights[n] for n in cand])[0])
        g = tuple(sorted(picked))
        if g in seen:
            continue
        if i < limit and not (
            lo <= sum(g) <= hi
            and sum(1 for n in g if n % 2 == 0) in ok_even
            and len(FIRST_LINE & picked) in ok_first
            and (ok_rep is None or len(last & picked) in ok_rep)
        ):
            continue
        seen.add(g)
        games.append(g)
    return [game_info(list(g), last, late) for g in games], late


@api_router.get("/")
async def root():
    return {"message": "Lotofacil API"}


@api_router.post("/contests/upload")
async def upload(payload: UploadIn):
    rows, invalid = parse_text(payload.content)
    if not rows:
        raise HTTPException(400, "Nenhum concurso válido encontrado no arquivo.")
    existing = await db.contests.find({}, {"concurso": 1, "numbers": 1}).to_list(100000)
    by_num = {d["concurso"] for d in existing}
    sets = {tuple(d["numbers"]) for d in existing}
    next_num = max(by_num, default=0) + 1
    inserted, skipped = 0, 0
    for concurso, nums in rows:
        key = tuple(nums)
        if concurso is None:
            if key in sets:
                skipped += 1
                continue
            concurso = next_num
        if concurso in by_num:
            skipped += 1
            continue
        await db.contests.insert_one(Contest(concurso=concurso, numbers=nums).to_mongo())
        by_num.add(concurso)
        sets.add(key)
        next_num = max(next_num, concurso + 1)
        inserted += 1
    return {"inserted": inserted, "skipped": skipped, "invalid": invalid, "total": len(by_num)}


@api_router.get("/contests")
async def list_contests(limit: int = 50):
    docs = await db.contests.find({}).sort("concurso", -1).limit(limit).to_list(limit)
    return [Contest.from_mongo(d).model_dump() for d in docs]


@api_router.delete("/contests")
async def clear_contests():
    r = await db.contests.delete_many({})
    return {"deleted": r.deleted_count}


@api_router.get("/stats")
async def stats(window: int = 0):
    return compute_stats(await load_contests(window))


@api_router.post("/generate")
async def generate(payload: GenerateIn):
    st = compute_stats(await load_contests(payload.window))
    if st["total"] == 0:
        raise HTTPException(400, "Nenhum concurso salvo. Faça upload de um arquivo primeiro.")
    games, late = generate_games(st, payload.quantity, payload.fixed, payload.excluded, payload.delayed)
    options = {"fixed": sorted(payload.fixed), "excluded": sorted(payload.excluded), "delayed": payload.delayed, "late": late}
    batch = GameBatch(window=payload.window, based_on=st["total"], last_concurso=st["last_concurso"],
                      games=games, options=options)
    r = await db.game_batches.insert_one(batch.to_mongo())
    batch.id = str(r.inserted_id)
    return check_batch(batch, None)


@api_router.post("/closure/preview")
async def closure_preview(payload: ClosureIn):
    return {"count": len(closure_games(payload.numbers, payload.guarantee, payload.fixed))}


def group_key(b: GameBatch):
    c = b.options.get("closure")
    if c:
        return "fechamento", "Fechamento " + ("completo" if c["guarantee"] == 15 else f"garante {c['guarantee']}")
    return "gerador", "Gerador · " + (f"últimos {b.window}" if b.window else "todos os concursos")


@api_router.get("/performance")
async def performance():
    docs = await db.game_batches.find({}).to_list(1000)
    groups = {}
    for d in docs:
        b = GameBatch.from_mongo(d)
        contest = await find_contest(b.last_concurso + 1)
        if not contest or not b.games:
            continue
        hits = check_batch(b, contest)["check"]["hits"]
        typ, label = group_key(b)
        for key in ((typ, label), (typ, "Gerador (geral)" if typ == "gerador" else "Fechamento (geral)")):
            g = groups.setdefault(key, {"type": typ, "label": key[1], "overall": key[1].endswith("(geral)"), "batches": 0, "hits": [], "batch_avgs": []})
            g["batches"] += 1
            g["hits"] += hits
            g["batch_avgs"].append(statistics.mean(hits))
    out = []
    for g in groups.values():
        h = g.pop("hits")
        g["avg_batch"] = round(statistics.mean(g.pop("batch_avgs")), 2)
        g.update({"games": len(h), "avg": round(statistics.mean(h), 2), "best": max(h),
                  "pct_11": pct(sum(1 for x in h if x >= 11), len(h)),
                  "tiers": {str(k): h.count(k) for k in range(11, 16)}})
        out.append(g)
    out.sort(key=lambda g: (g["type"], not g["overall"], g["label"]))
    return out


@api_router.post("/closure")
async def closure(payload: ClosureIn):
    latest = await db.contests.find_one({}, sort=[("concurso", -1)])
    if not latest:
        raise HTTPException(400, "Nenhum concurso salvo. Faça upload de um arquivo primeiro.")
    last = Contest.from_mongo(latest)
    total = await db.contests.count_documents({})
    games = [game_info(g, set(last.numbers)) for g in closure_games(payload.numbers, payload.guarantee, payload.fixed)]
    options = {"closure": {"numbers": payload.numbers, "guarantee": payload.guarantee, "fixed": payload.fixed}}
    batch = GameBatch(window=0, based_on=total, last_concurso=last.concurso, games=games, options=options)
    r = await db.game_batches.insert_one(batch.to_mongo())
    batch.id = str(r.inserted_id)
    return check_batch(batch, None)


async def find_contest(concurso: int):
    doc = await db.contests.find_one({"concurso": concurso})
    return Contest.from_mongo(doc) if doc else None


@api_router.get("/batches")
async def list_batches():
    docs = await db.game_batches.find({}).sort("created_at", -1).to_list(200)
    out = []
    for d in docs:
        b = GameBatch.from_mongo(d)
        out.append(check_batch(b, await find_contest(b.last_concurso + 1)))
    return out


@api_router.get("/batches/{batch_id}")
async def get_batch(batch_id: str, concurso: Optional[int] = None):
    doc = await db.game_batches.find_one({"_id": ObjectId(batch_id)}) if ObjectId.is_valid(batch_id) else None
    if not doc:
        raise HTTPException(404, "Lote de jogos não encontrado.")
    b = GameBatch.from_mongo(doc)
    contest = await find_contest(concurso if concurso is not None else b.last_concurso + 1)
    if concurso is not None and not contest:
        raise HTTPException(404, f"Concurso {concurso} não está salvo.")
    return check_batch(b, contest)


@api_router.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str):
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(404, "Lote de jogos não encontrado.")
    r = await db.game_batches.delete_one({"_id": ObjectId(batch_id)})
    if not r.deleted_count:
        raise HTTPException(404, "Lote de jogos não encontrado.")
    return {"deleted": 1}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("startup")
async def startup():
    await db.contests.create_index("concurso", unique=True)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
