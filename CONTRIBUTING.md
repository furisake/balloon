# Contributing to balloon

不具合報告、記法 fixture、ドキュメント、実装改善を歓迎します。

## セットアップ

リポジトリを取得後、`npm install` と `npm run dev` を実行します。

## コーディング方針

- TypeScript strict を維持し、`any` を避けます。
- UI に解析、取得、永続化の複雑なロジックを置きません。
- Server Component を基本にし、ブラウザ API が必要な箇所だけ Client Component にします。
- 依存や機能を必要以上に増やしません。Toast は使用しません。

## Pull Request

変更目的を小さく明確にし、挙動とテスト内容を説明してください。Parser / Tokenizer / Linter の変更では、対応記法または校正规則ごとに短い自作 fixture を追加してください。差分解析、文字コード、CSV、本文処理の変更も純粋ロジックのテストを追加します。実際の作品本文を大量に fixture へ含めないでください。

提出前に次をすべて成功させます。

```bash
npm run lint
npm test
npm run build
```
