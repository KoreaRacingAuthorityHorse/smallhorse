"""마사회 OpenAPI 호출 클라이언트. 인증키는 .env에서 읽고 출력하지 않는다."""
import json, os, re, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

BASE = "https://apis.data.go.kr/B551015/"
ENV_PATH = Path(os.environ.get("KRA_ENV", Path(__file__).parent / ".env.kra"))


def load_key():
    """환경변수 KRA_SERVICE_KEY, 없으면 KRA_ENV 파일(기본 pipeline/.env.kra) 첫 줄.
    `NAME=키`, `키`만 있는 경우, `=` 빠진 `NAME키` 모두 처리한다."""
    raw = os.environ.get("KRA_SERVICE_KEY") or ENV_PATH.read_text().strip().splitlines()[0].strip()
    if "=" in raw and raw.split("=", 1)[0].isidentifier():
        raw = raw.split("=", 1)[1].strip().strip('"').strip("'")
    raw = urllib.parse.unquote(raw)  # 디코딩 키로 통일
    m = re.search(r"[0-9a-f]{64}$", raw)  # 현행 data.go.kr 키는 64자리 16진수
    return m.group(0) if m else raw


_KEY = load_key()


def call(path, params=None, retries=3, timeout=30):
    """(status, body_dict_or_text) 반환. 예외 메시지에 키가 섞이지 않게 URL을 노출하지 않는다."""
    q = {"serviceKey": _KEY, "_type": "json"}
    q.update(params or {})
    url = BASE + path + "?" + urllib.parse.urlencode(q)
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (kra-collector)", "Accept": "application/json, */*"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                text = r.read().decode("utf-8", "replace")
            try:
                return r.status, json.loads(text)
            except json.JSONDecodeError:
                return r.status, text
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:300]
            last = f"HTTPError {e.code}: {body}"
            if e.code in (401, 403):
                break
        except Exception as e:  # noqa: BLE001
            last = f"{type(e).__name__}: {getattr(e, 'reason', '')}"
            time.sleep(1.5 * (i + 1))
    return None, last


def items(body):
    """data.go.kr 표준 응답에서 item 리스트와 totalCount를 꺼낸다 (item 1건이면 dict로 오는 경우 처리)."""
    if not isinstance(body, dict):
        return None, None
    resp = body.get("response", body)
    b = resp.get("body") or {}
    its = b.get("items")
    if isinstance(its, dict):
        its = its.get("item")
    if its is None or its == "":
        its = []
    if isinstance(its, dict):
        its = [its]
    return its, b.get("totalCount")


def header(body):
    if not isinstance(body, dict):
        return None
    resp = body.get("response", body)
    h = resp.get("header") or {}
    return h.get("resultCode"), h.get("resultMsg")
