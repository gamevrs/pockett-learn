package com.gameverse.pockett;

import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Paints the window behind the status and navigation bars in the site's current theme colour.
 *
 * On WebViews older than Chromium 140, Capacitor's SystemBars insets the web view instead of drawing it under the
 * system bars, so whatever is behind the web view shows there. The site calls setBackgroundColor whenever its theme
 * changes (src/components/native/NativeBridge.tsx), so the bars match the page instead of the app theme's default.
 */
@CapacitorPlugin(name = "AppChrome")
public class AppChromePlugin extends Plugin {

    @PluginMethod
    public void setBackgroundColor(PluginCall call) {
        String value = call.getString("color", "");
        final int color;
        try {
            color = Color.parseColor(value.trim());
        } catch (IllegalArgumentException e) {
            call.reject("Not a colour: " + value);
            return;
        }
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().getDecorView().setBackgroundColor(color);
            call.resolve();
        });
    }
}
