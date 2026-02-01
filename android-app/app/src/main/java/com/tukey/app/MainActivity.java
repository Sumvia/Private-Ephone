package com.tukey.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "EphoneApp";
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1;

    public class AndroidInterface {

        @JavascriptInterface
        public boolean saveFile(String content, String filename, String mimeType) {
            Log.d(TAG, "saveFile called: " + filename);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    return saveFileWithMediaStore(content, filename, mimeType);
                } else {
                    return saveFileToDownloads(content, filename);
                }
            } catch (Exception e) {
                Log.e(TAG, "saveFile error: " + e.getMessage(), e);
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "保存失败: " + e.getMessage(), Toast.LENGTH_LONG).show());
                return false;
            }
        }

        @JavascriptInterface
        public boolean saveBase64File(String base64Content, String filename, String mimeType) {
            Log.d(TAG, "saveBase64File called: " + filename);
            try {
                byte[] data = Base64.decode(base64Content, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    return saveByteArrayWithMediaStore(data, filename, mimeType);
                } else {
                    return saveByteArrayToDownloads(data, filename);
                }
            } catch (Exception e) {
                Log.e(TAG, "saveBase64File error: " + e.getMessage(), e);
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "保存失败: " + e.getMessage(), Toast.LENGTH_LONG).show());
                return false;
            }
        }

        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        private boolean saveFileWithMediaStore(String content, String filename, String mimeType) throws IOException {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType != null ? mimeType : "application/octet-stream");
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IOException("无法创建文件");

            try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                if (os == null) throw new IOException("无法打开输出流");
                os.write(content.getBytes("UTF-8"));
                os.flush();
            }

            runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "已保存到下载目录: " + filename, Toast.LENGTH_LONG).show());
            return true;
        }

        private boolean saveByteArrayWithMediaStore(byte[] data, String filename, String mimeType) throws IOException {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType != null ? mimeType : "application/octet-stream");
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IOException("无法创建文件");

            try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                if (os == null) throw new IOException("无法打开输出流");
                os.write(data);
                os.flush();
            }

            runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "已保存到下载目录: " + filename, Toast.LENGTH_LONG).show());
            return true;
        }

        private boolean saveFileToDownloads(String content, String filename) throws IOException {
            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) downloadsDir.mkdirs();
            File file = new File(downloadsDir, filename);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(content.getBytes("UTF-8"));
                fos.flush();
            }
            runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "已保存到: " + file.getAbsolutePath(), Toast.LENGTH_LONG).show());
            return true;
        }

        private boolean saveByteArrayToDownloads(byte[] data, String filename) throws IOException {
            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) downloadsDir.mkdirs();
            File file = new File(downloadsDir, filename);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(data);
                fos.flush();
            }
            runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "已保存到: " + file.getAbsolutePath(), Toast.LENGTH_LONG).show());
            return true;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);

        // 启用调试
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // WebView 设置
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setSupportZoom(false);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);

        // 允许跨域访问（关键设置）
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setAllowFileAccessFromFileURLs(true);

        // Cookie 设置
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // 注册 JavaScript Interface
        webView.addJavascriptInterface(new AndroidInterface(), "AndroidApp");

        // 下载监听器
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                       String mimeType, long contentLength) {
                Log.d(TAG, "Download requested: " + url);
                if (url.startsWith("blob:")) {
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  var xhr = new XMLHttpRequest();" +
                        "  xhr.open('GET', '" + url + "', true);" +
                        "  xhr.responseType = 'blob';" +
                        "  xhr.onload = function() {" +
                        "    var reader = new FileReader();" +
                        "    reader.onloadend = function() {" +
                        "      var base64 = reader.result.split(',')[1];" +
                        "      AndroidApp.saveBase64File(base64, 'EPhone-Backup-' + new Date().toISOString().split('T')[0] + '.json', 'application/json');" +
                        "    };" +
                        "    reader.readAsDataURL(xhr.response);" +
                        "  };" +
                        "  xhr.send();" +
                        "})();", null);
                } else {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "无法下载文件", Toast.LENGTH_SHORT).show();
                    }
                }
            }
        });

        // WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                Log.e(TAG, "WebView error: " + errorCode + " - " + description + " @ " + failingUrl);
            }
        });

        // WebChromeClient
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "[WebView][" + consoleMessage.messageLevel() + "] " +
                      consoleMessage.message() + " (" + consoleMessage.sourceId() + ":" +
                      consoleMessage.lineNumber() + ")");
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                            FileChooserParams fileChooserParams) {
                MainActivity.this.filePathCallback = filePathCallback;
                try {
                    startActivityForResult(fileChooserParams.createIntent(), FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    Toast.makeText(MainActivity.this, "无法打开文件选择器", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        // 使用 file:// 协议加载（与 DailyTracker 相同）
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST_CODE && filePathCallback != null) {
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null && data.getDataString() != null) {
                results = new Uri[]{Uri.parse(data.getDataString())};
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
