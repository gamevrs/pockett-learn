package com.gameverse.pockett;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppChromePlugin.class);
        super.onCreate(savedInstanceState);
        // The hardware/gesture back button walks the web view's history (the site's own pages, including client-side
        // navigations), and leaves the app once there is nowhere left to go back to. @capacitor/app's own handler is
        // switched off in capacitor.config.ts (App.disableBackButtonHandler), because it does nothing at the first page.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });
    }
}
