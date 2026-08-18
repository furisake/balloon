# balloon

balloon は、青空文庫形式の文章を「読む」「書く」「確認する」ための日本語 Web アプリケーションです。

## 主な機能

- 青空文庫公式作品一覧から作品名・著者名を検索する本棚と Reader
- CodeMirror 6 による Editor、リアルタイム校正、縦書き／横書き Preview
- UTF-8 / Shift_JIS Import、Shift_JIS Export
- 読書履歴、本文キャッシュ、原稿のブラウザ内保存
- Light / Dark / Sky テーマと MDX ガイド

## 開発

Node.js と npm を用意し、次のコマンドを実行します。

```bash
npm install
npm run dev
```

品質確認:

```bash
npm run lint
npm test
npm run build
```

作品一覧、本文、青空文庫記法は[青空文庫](https://www.aozora.gr.jp/)の公開データと公式資料を参照しています。校正規則は [Aozora Proofreader](https://eunheui.sakura.ne.jp/aozora/proofreader.html) 等を参考にしています。

balloon は [MIT License](./LICENSE) のオープンソースです。コントリビュートを歓迎します。参加方法は [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。
