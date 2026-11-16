import UIKit
import WebKit
import Capacitor

/// Capacitor's web view controller with one guard added: only the top-level page may talk to native code.
///
/// WebKit offers the "bridge" message handler to every frame, including the learner-code frame (a cross-origin iframe
/// that runs code the learner typed). Capacitor injects its JavaScript into the main frame only, but a frame could still
/// post to the handler directly. Android's bridge already drops messages that aren't from the main frame; this does the
/// same on iOS, so code in a lesson can never reach notifications, sharing or the browser.
class PockettViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // The page draws its own band under the status bar and its own tab bar (globals.css, AppTabBar), so the
        // system's scroll-edge shading on top of them would only smudge the page's colours.
        if #available(iOS 26.0, *) {
            webView?.scrollView.topEdgeEffect.isHidden = true
            webView?.scrollView.bottomEdgeEffect.isHidden = true
        }
        guard let controller = webView?.configuration.userContentController,
              let handler = webView?.navigationDelegate as? WKScriptMessageHandler else { return }
        controller.removeScriptMessageHandler(forName: "bridge")
        controller.add(MainFrameOnly(handler), name: "bridge")
    }
}

private final class MainFrameOnly: NSObject, WKScriptMessageHandler {
    private let target: WKScriptMessageHandler

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame else { return }
        target.userContentController(userContentController, didReceive: message)
    }
}
