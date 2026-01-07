package com.neolia.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.neolia.app.linphone.LinphoneSipPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Enregistrer le plugin Linphone SIP
        registerPlugin(LinphoneSipPlugin.class);

        super.onCreate(savedInstanceState);
    }
}
