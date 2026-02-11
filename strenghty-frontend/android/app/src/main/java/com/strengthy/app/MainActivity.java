package com.strengthy.app;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		// Standard startup; Google sign-in plugin removed.
		Log.i("Strengthy", "MainActivity onCreate");
	}

	@Override
	public void onResume() {
		super.onResume();
		try {
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
				Window w = getWindow();
				if (w == null) return;

				Display display = getDisplay();
				if (display == null) {
					display = getWindowManager().getDefaultDisplay();
				}
				if (display == null) return;

				Display.Mode[] modes = display.getSupportedModes();
				Display.Mode best = null;
				float capHz = 165f;
				for (Display.Mode m : modes) {
					float hz = m.getRefreshRate();
					if (hz <= capHz && (best == null || hz > best.getRefreshRate())) {
						best = m;
					}
				}

				if (best == null) {
					for (Display.Mode m : modes) {
						if (best == null || m.getRefreshRate() > best.getRefreshRate()) {
							best = m;
						}
					}
				}

				if (best != null) {
					WindowManager.LayoutParams params = w.getAttributes();
					if (params.preferredDisplayModeId != best.getModeId()) {
						params.preferredDisplayModeId = best.getModeId();
						w.setAttributes(params);
					}
				}
			}
		} catch (Exception e) {
			// no-op: best-effort only
		}
	}
}
