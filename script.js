/**
 * HTML/CSS A4 プレビューアー
 * リアルタイムプレビューとPDF出力機能
 */

// =============================================
// DOM Elements
// =============================================
const htmlEditor = document.getElementById('html-editor');
const cssEditor = document.getElementById('css-editor');
const previewIframe = document.getElementById('preview-iframe');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const previewFrame = document.getElementById('preview-frame');

// =============================================
// Debounce Utility
// =============================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// =============================================
// Preview Update
// =============================================
function updatePreview() {
  const htmlContent = htmlEditor.value;
  const cssContent = cssEditor.value;

  // iframeのsrcdocに完全なHTMLドキュメントを設定
  const fullDocument = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset margin/padding for accurate preview */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    ${cssContent}
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
  `.trim();

  previewIframe.srcdoc = fullDocument;
}

// デバウンス付きのプレビュー更新（入力中の過度な更新を防止）
const debouncedUpdatePreview = debounce(updatePreview, 150);

// =============================================
// PDF Download
// =============================================
async function downloadPdf() {
  // ボタンを一時的に無効化
  downloadPdfBtn.disabled = true;
  downloadPdfBtn.textContent = '生成中...';

  try {
    // プレビュー内容を取得
    const htmlContent = htmlEditor.value;
    const cssContent = cssEditor.value;

    // PDF用のオーバーレイを作成（画面全体を覆う）
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 255, 255, 0.95);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    `;

    // ローディングメッセージ
    const loadingMsg = document.createElement('div');
    loadingMsg.textContent = 'PDF生成中...';
    loadingMsg.style.cssText = `
      font-size: 24px;
      color: #333;
      margin-bottom: 20px;
    `;
    overlay.appendChild(loadingMsg);

    // PDF用の一時的なコンテナを作成
    const pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdf-capture-container';
    pdfContainer.innerHTML = htmlContent;

    // スタイルを適用
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      ${cssContent}
    `;
    pdfContainer.insertBefore(styleElement, pdfContainer.firstChild);

    // コンテナのスタイル設定
    pdfContainer.style.cssText = `
      width: 420mm;
      min-height: 297mm;
      background: #fff;
      overflow: visible;
    `;

    overlay.appendChild(pdfContainer);
    document.body.appendChild(overlay);

    // DOMの描画を待機（html2canvasが正しくキャプチャできるように）
    await new Promise(resolve => setTimeout(resolve, 100));

    // html2pdf.jsのオプション（ユーザー指定の設定を使用）
    const pdfOptions = {
      margin: 10,
      filename: 'preview.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: true,  // デバッグ用にログを有効化
        allowTaint: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a3',
        orientation: 'landscape'
      },
      pagebreak: { mode: 'avoid-all' }
    };

    // PDF生成とダウンロード
    await html2pdf().set(pdfOptions).from(pdfContainer).save();

    // オーバーレイを削除
    document.body.removeChild(overlay);

  } catch (error) {
    console.error('PDF生成エラー:', error);
    alert('PDFの生成中にエラーが発生しました。');
    // エラー時もオーバーレイを削除
    const existingOverlay = document.querySelector('div[style*="z-index: 99999"]');
    if (existingOverlay) {
      document.body.removeChild(existingOverlay);
    }
  } finally {
    // ボタンを元に戻す
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.innerHTML = '<span class="btn-icon">📥</span> PDFとしてダウンロード';
  }
}

// =============================================
// Event Listeners
// =============================================
htmlEditor.addEventListener('input', debouncedUpdatePreview);
cssEditor.addEventListener('input', debouncedUpdatePreview);
downloadPdfBtn.addEventListener('click', downloadPdf);

// =============================================
// Tab Key Support in Editors
// =============================================
function handleTabKey(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // タブ文字の代わりにスペース2つを挿入
    textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 2;

    // プレビューを更新
    debouncedUpdatePreview();
  }
}

htmlEditor.addEventListener('keydown', handleTabKey);
cssEditor.addEventListener('keydown', handleTabKey);

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  // 初期プレビューを表示
  updatePreview();
});
