from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import random
import logging
import statistics
from collections import Counter
from itertools import combinations
from pathlib import Path
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
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
    }


def top_values(items, key, cover=0.7):
    chosen, acc = set(), 0
    for it in sorted(items, key=lambda x: -x["count"]):
        chosen.add(it[key])
        acc += it["pct"]
        if acc >= cover * 100:
            break
    return chosen


def generate_games(stats, quantity):
    weights = {f["number"]: f["count"] + 1 for f in stats["number_freq"]}
    s = stats["sum"]
    lo, hi = s["mean"] - s["std"], s["mean"] + s["std"]
    ok_even = top_values(stats["parity"], "even")
    ok_first = top_values([f for f in stats["first_line_together"] if f["count"]], "qty")
    ok_rep = top_values(stats["repeats"], "repeated") if stats["repeats"] else None
    last = set(stats["last_numbers"])
    pool = list(range(1, 26))
    games, seen = [], set()
    limit = quantity * 3000
    for i in range(limit + quantity * 50):
        if len(games) >= quantity:
            break
        picked = set()
        while len(picked) < 15:
            cand = [n for n in pool if n not in picked]
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
    return [{"numbers": list(g), "sum": sum(g), "even": sum(1 for n in g if n % 2 == 0),
             "repeated": len(last & set(g))} for g in games]


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
    batch = GameBatch(window=payload.window, based_on=st["total"], last_concurso=st["last_concurso"],
                      games=generate_games(st, payload.quantity))
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
