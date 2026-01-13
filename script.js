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
const a4Frame = document.getElementById('a4-frame');

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
    
    // PDF用の一時的なコンテナを作成
    const pdfContainer = document.createElement('div');
    pdfContainer.innerHTML = htmlContent;
    
    // スタイルを適用
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      ${cssContent}
    `;
    pdfContainer.insertBefore(styleElement, pdfContainer.firstChild);
    
    // 一時的にDOMに追加（html2pdfがレンダリングに必要）
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.top = '0';
    pdfContainer.style.width = '210mm';  // A4幅
    pdfContainer.style.minHeight = '297mm';  // A4高さ
    pdfContainer.style.background = '#fff';
    document.body.appendChild(pdfContainer);
    
    // html2pdf.jsのオプション（ユーザー指定の設定を使用）
    const pdfOptions = {
      margin: 10,
      filename: 'preview.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: 'avoid-all' }
    };
    
    // PDF生成とダウンロード
    await html2pdf().set(pdfOptions).from(pdfContainer).save();
    
    // 一時コンテナを削除
    document.body.removeChild(pdfContainer);
    
  } catch (error) {
    console.error('PDF生成エラー:', error);
    alert('PDFの生成中にエラーが発生しました。');
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
