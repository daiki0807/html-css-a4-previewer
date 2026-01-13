# HTML/CSS A4 プレビューアー

HTMLとCSSをリアルタイムでプレビューし、結果をA4サイズのPDFとして書き出すことができるWebアプリケーションです。

## 特徴
- **リアルタイムプレビュー**: 入力した内容が即座に反映されます。
- **A4 PDF出力**: `html2pdf.js` を使用し、正確なA4サイズでの出力を実現しています。
- **ピュアCSS**: 外部CSSフレームワーク（BootstrapやTailwind等）を使わず、軽量で高速に動作します。

## 使い方
1. 左側のエディタにHTMLとCSSを入力します。
2. 右側のプレビューエリアで結果を確認します。
3. 「PDFとしてダウンロード」ボタンを押すと、A4サイズのPDFが生成されます。

## 技術スタック
- HTML5
- CSS3 (Vanilla CSS)
- JavaScript (Vanilla JS)
- [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/)
