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
// PDF Download (using jsPDF + html2canvas directly)
// =============================================
async function downloadPdf() {
  // ボタンを一時的に無効化
  downloadPdfBtn.disabled = true;
  downloadPdfBtn.textContent = '生成中...';

  // オーバーレイを作成
  const overlay = document.createElement('div');
  overlay.id = 'pdf-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #fff;
    z-index: 99999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 20px;
    overflow: auto;
  `;

  try {
    const htmlContent = htmlEditor.value;
    const cssContent = cssEditor.value;

    // A4サイズ（mm）
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const MARGIN_MM = 10; // 余白10mm

    // 印刷用のコンテナを作成（A4幅 - 余白）
    const pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdf-capture-target';

    // A4幅をピクセルに変換（96dpi基準: 1mm = 3.7795px）
    const MM_TO_PX = 3.7795;
    const containerWidthPx = (A4_WIDTH_MM - MARGIN_MM * 2) * MM_TO_PX;

    pdfContainer.style.cssText = `
      width: ${containerWidthPx}px;
      background: #fff;
      padding: 0;
      margin: 0;
    `;

    // スタイルを適用
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      ${cssContent}
    `;
    pdfContainer.appendChild(styleElement);

    // HTMLコンテンツを追加
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = htmlContent;
    pdfContainer.appendChild(contentDiv);

    // オーバーレイに追加してDOMに挿入
    overlay.appendChild(pdfContainer);
    document.body.appendChild(overlay);

    // レンダリング完了を待つ
    await new Promise(resolve => setTimeout(resolve, 300));

    // html2canvasでキャプチャ
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // jsPDFを初期化（A4縦向き）
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // PDFの描画可能サイズを計算
    const pdfWidth = A4_WIDTH_MM - MARGIN_MM * 2;
    const pdfHeight = A4_HEIGHT_MM - MARGIN_MM * 2;

    // キャンバスのアスペクト比を維持してPDFに収める
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const canvasRatio = canvasHeight / canvasWidth;

    // コンテンツの高さをPDF単位で計算
    const contentHeightMm = pdfWidth * canvasRatio;

    // 複数ページに分割する必要があるかチェック
    if (contentHeightMm <= pdfHeight) {
      // 1ページに収まる場合
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.98),
        'JPEG',
        MARGIN_MM,
        MARGIN_MM,
        pdfWidth,
        contentHeightMm
      );
    } else {
      // 複数ページに分割
      const pageContentHeight = pdfHeight;
      const totalPages = Math.ceil(contentHeightMm / pageContentHeight);

      // 1ページあたりのキャンバス高さ（ピクセル）
      const pageCanvasHeight = (pageContentHeight / contentHeightMm) * canvasHeight;

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        // このページで表示する部分をクリップ
        const sourceY = page * pageCanvasHeight;
        const sourceHeight = Math.min(pageCanvasHeight, canvasHeight - sourceY);
        const destHeight = (sourceHeight / canvasHeight) * contentHeightMm;

        // 一時キャンバスを作成してページ部分を切り出し
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(
          canvas,
          0, sourceY, canvasWidth, sourceHeight,
          0, 0, canvasWidth, sourceHeight
        );

        pdf.addImage(
          pageCanvas.toDataURL('image/jpeg', 0.98),
          'JPEG',
          MARGIN_MM,
          MARGIN_MM,
          pdfWidth,
          destHeight
        );
      }
    }

    // PDFをダウンロード
    pdf.save('preview.pdf');

    // オーバーレイを削除
    document.body.removeChild(overlay);

  } catch (error) {
    console.error('PDF生成エラー:', error);
    alert('PDFの生成中にエラーが発生しました: ' + error.message);
    // エラー時もオーバーレイを削除
    const existingOverlay = document.getElementById('pdf-overlay');
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
