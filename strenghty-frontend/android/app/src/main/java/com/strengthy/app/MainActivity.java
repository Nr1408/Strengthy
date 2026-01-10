package com.strengthy.app;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;
import android.view.Display;
import android.view.Window;
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
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
				Window w = getWindow();
				if (w != null) {
					Display display = getDisplay();
					if (display == null) {
						display = getWindowManager().getDefaultDisplay();
					}
					if (display != null) {
						Display.Mode[] modes = display.getSupportedModes();
						float highest = 60f;
						for (Display.Mode m : modes) {
							highest = Math.max(highest, m.getRefreshRate());
						}
						// Best-effort: attempt to prefer higher refresh but API to set
						// preferred refresh rate may not be available on the compile
						// target. Skip setting it here to avoid compile errors.
					}
				}
			}
		} catch (Exception e) {
			// no-op: best-effort only
		}
	}
}
