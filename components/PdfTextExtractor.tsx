import React, { useMemo } from 'react'
import { ActivityIndicator, Modal, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'

type PdfTextExtractorProps = {
  base64: string
  visible: boolean
  onDone: (result: { ok: boolean; text?: string; error?: string }) => void
}

// Runs pdf.js inside a WebView (browser env) to reliably extract text
export default function PdfTextExtractor({ base64, visible, onDone }: PdfTextExtractorProps) {
  const html = useMemo(() => {
    // Use UMD build of pdf.js (no ESM/import.meta issues in WebView)
    const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'
    const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'

    // Inline minimal HTML that loads pdf.js and extracts text
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PDF Extract</title>
</head>
<body>
  <script src="${PDFJS_URL}"></script>
  <script>
    (function() {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS_WORKER_URL}';
      } catch (e) {
        // ignore
      }

      function base64ToUint8Array(b64) {
        const raw = atob(b64);
        const len = raw.length;
        const u8 = new Uint8Array(len);
        for (let i = 0; i < len; i++) u8[i] = raw.charCodeAt(i);
        return u8;
      }

      async function run() {
        try {
          const b64 = '${base64.replace(/\\/g, '\\\\').replace(/\n/g, '')}';
          const uint8 = base64ToUint8Array(b64);
          const loadingTask = window.pdfjsLib.getDocument({ data: uint8 });
          const pdf = await loadingTask.promise;
          const MAX_PAGES = Math.min(pdf.numPages, 8);
          let text = '';
          for (let p = 1; p <= MAX_PAGES; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const pageText = content.items.map(it => it.str || '').join(' ');
            text += pageText + '\n';
          }
          const out = { ok: true, text };
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(out));
        } catch (err) {
          const out = { ok: false, error: String(err && err.message || err) };
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(out));
        }
      }

      run();
    })();
  </script>
</body>
</html>`
  }, [base64])

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: '80%', backgroundColor: 'white', padding: 16, borderRadius: 12 }}>
          <Text style={{ fontWeight: '600', marginBottom: 8 }}>Processing PDF…</Text>
          <ActivityIndicator size="small" color="#6366F1" />
          <View style={{ width: 1, height: 1, overflow: 'hidden' }}>
            <WebView
              originWhitelist={["*"]}
              onMessage={(e) => {
                try {
                  const payload = JSON.parse(e.nativeEvent.data || '{}')
                  onDone({ ok: !!payload.ok, text: payload.text, error: payload.error })
                } catch (err: any) {
                  onDone({ ok: false, error: String(err && err.message || err) })
                }
              }}
              source={{ html }}
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess
              allowUniversalAccessFromFileURLs
              mixedContentMode="always"
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}
