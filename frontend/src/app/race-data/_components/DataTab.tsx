import { FIELDS, SOURCES } from "../_lib/data";

const TAG_CLASS = { 사전: "pre", 결과: "res", 누적: "acc" } as const;

const SAMPLE_JSON = `{
  "meet": "서울",
  "rcDate": 20261011,
  "rcNo": 1,
  "chulNo": 1,
  "hrName": "한강캡틴",
  "sex": "수",
  "age": 4,
  "wgBudam": 55,
  "wgHr": 486,
  "df": 2,
  "jkName": "박태종",
  "trName": "서인석"
}`;

export default function DataTab() {
  return (
    <section className="rd-page" aria-labelledby="rdDataTitle">
      <header className="rd-ph">
        <h2 id="rdDataTitle">제공하는 데이터</h2>
        <p>한국마사회가 공개한 데이터를 매일 모아 정리해요.</p>
      </header>
      <div className="rd-srcs">
        {SOURCES.map(([n, d, s, t]) => (
          <div className="rd-sc" key={n}>
            <h3>{n}</h3>
            <p>{d}</p>
            <div className="tags"><span className={`tg ${TAG_CLASS[t]}`}>{t}</span><span className="tg">{s}</span></div>
          </div>
        ))}
      </div>

      <details className="rd-dev">
        <summary>개발자용 API 보기</summary>
        <div className="body">
          <pre>{`GET /api/races?meet=1&rcDate=20240106            # 경주 목록
GET /api/races/1/20240106/1/entries            # 출전표
GET /api/races/1/20240106/1/result             # 결과
GET /api/races/1/20240106/1/odds?pool=QNL      # 확정 배당
GET /api/jockeys?meet=1 · /api/trainers?meet=1`}</pre>
          <pre>{SAMPLE_JSON}</pre>
          <div className="rd-scroll">
            <table className="rd-ft">
              <thead><tr><th>필드</th><th>의미</th><th>공개 시점</th></tr></thead>
              <tbody>
                {FIELDS.map(([f, m, w]) => (
                  <tr key={f}><td><code>{f}</code></td><td>{m}</td><td>{w}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </section>
  );
}
