// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.cast;

import android.os.Bundle;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.appcompat.app.AppCompatActivity;
import androidx.mediarouter.app.MediaRouteButton;
import com.google.android.gms.cast.framework.CastButtonFactory;

/** A FragmentActivity host for the SDK chooser/controller, also from Expo's plain fullscreen Activity. */
public final class CastPickerActivity extends AppCompatActivity {
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        try {
            MediaRouteButton button = new MediaRouteButton(this);
            button.setAlwaysVisible(true);
            button.setContentDescription(getIntent().getStringExtra("label"));
            CastButtonFactory.setUpMediaRouteButton(this, button);
            FrameLayout root = new FrameLayout(this);
            root.addView(button, new FrameLayout.LayoutParams(1, 1));
            setContentView(root);
            getSupportFragmentManager().registerFragmentLifecycleCallbacks(new FragmentManager.FragmentLifecycleCallbacks() {
                @Override public void onFragmentDetached(FragmentManager manager, Fragment fragment) {
                    // A dismissed standard Cast dialog must not leave an invisible Activity over the player.
                    if (!isFinishing()) finish();
                }
            }, false);
            if (saved == null) button.post(() -> {
                try { if (!button.showDialog()) finish(); }
                catch (RuntimeException error) { fail(); }
            });
        } catch (RuntimeException error) { fail(); }
    }
    private void fail() {
        Toast.makeText(this, getIntent().getStringExtra("unavailable"), Toast.LENGTH_LONG).show();
        finish();
    }
}
