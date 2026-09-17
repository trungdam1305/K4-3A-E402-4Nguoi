"""BM25 cho tiếng Việt: âm tiết + cặp âm tiết liền nhau + dạng bỏ dấu (học viên hay gõ không dấu)."""
import math
import re
import unicodedata
from collections import Counter

STOPWORDS = set("""
là của và các có được cho trong này đó một những thì mà với để cũng như khi đã sẽ ra vào lại
nào gì sao thế bạn mình em anh chị tôi ạ nhé nhỉ ơi đi rồi hãy giúp về từ theo hay hoặc ở đây
cái việc phần kia ấy vậy nữa thôi đang tại
the a an of to is are was what how why in on for and or be it this that do does
""".split())


def strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn").replace("đ", "d")


# Câu gõ không dấu ("llm la gi") cũng phải bỏ được từ dừng.
STOPWORDS |= {strip_accents(w) for w in STOPWORDS}


def tokenize(text: str) -> list[str]:
    # Giữ các thuật ngữ kỹ thuật có gạch nối như top-p, top-k, rule-based, few-shot
    text = re.sub(r"(?<=[a-zA-Z0-9])-(?=[a-zA-Z0-9])", "_", text)
    words = re.findall(r"\w+", unicodedata.normalize("NFC", text.lower()))
    terms, prev = [], None
    for w in words:
        if w in STOPWORDS or (len(w) == 1 and not w.isdigit()) or w.startswith("_"):
            prev = None
            continue
        terms.append(w)
        plain = strip_accents(w)
        if plain != w:
            terms.append(plain)
        if prev:
            terms.append(f"{prev}_{w}")
        prev = w
    return terms


class BM25:
    def __init__(self, docs: list[list[str]], k1=1.4, b=0.75):
        self.k1, self.b = k1, b
        self.tfs = [Counter(d) for d in docs]
        self.lens = [len(d) for d in docs]
        self.avg = sum(self.lens) / max(len(docs), 1)
        df = Counter(t for tf in self.tfs for t in tf)
        n = len(docs)
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}

    def score(self, i: int, query: list[str]) -> float:
        tf, norm = self.tfs[i], self.k1 * (1 - self.b + self.b * self.lens[i] / self.avg)
        s = 0.0
        for t in query:
            f = tf.get(t)
            if f:
                s += self.idf[t] * f * (self.k1 + 1) / (f + norm)
        return s


class Index:
    def __init__(self, chunks):
        self.chunks = chunks
        self.by_id = {c.id: c for c in chunks}
        # Tiêu đề slide/heading lặp 2 lần để nặng hơn thân bài.
        self.bm25 = BM25([tokenize(f"{c.title}\n{c.title}\n{c.text}") for c in chunks])

    def search(self, query: str, allowed=None, k=6, exclude=()):
        terms = tokenize(query)
        if not terms:
            return []
        hits = []
        for i, c in enumerate(self.chunks):
            if c.id in exclude or (allowed is not None and not allowed(c)):
                continue
            s = self.bm25.score(i, terms)
            if s > 0:
                hits.append((s, c))
        hits.sort(key=lambda h: -h[0])
        return [(c, round(s, 2)) for s, c in hits[:k]]
