# 八王子商工会議所向けリーフレットのビルド

A4縦・1ページの配布用PDFは、`print/advisory-hachioji-leaflet.html` を正本として生成する。
QRコードはビルド時に `https://mued.jp/ja/advisory` から生成してHTMLへ埋め込む。外部通信は使わない。

```bash
npm install
npm run build:advisory-leaflet
```

出力先は `public/advisory/hachioji-leaflet-ja.pdf`。Chromiumが埋め込む生成日時を固定値へ正規化するため、同じ環境・同じソースからの再ビルドは同じSHA-256になる。

電話欄は印刷後に手書きするため、HTMLとPDFのどちらにも電話番号を入れない。
