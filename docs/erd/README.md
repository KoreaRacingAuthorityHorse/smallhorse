# ERD 이미지 원본

`erd.html`이 `docs/erd.png`의 원본이다. 테이블이나 컬럼을 바꾸면 `erd.html`의 `T` 객체를 고치고 다시 캡처한다.

```bash
cd docs
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1720,1350 \
  --screenshot="$PWD/erd.png" "file://$PWD/erd/erd.html"
```
