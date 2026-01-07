package com.neolia.app.linphone;

import android.Manifest;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.linphone.core.Account;
import org.linphone.core.Call;
import org.linphone.core.Core;
import org.linphone.core.RegistrationState;

/**
 * Plugin Capacitor pour intégrer Linphone SDK (SIP natif Android)
 *
 * Méthodes exposées au JavaScript :
 * - initialize() : Initialise le SDK Linphone
 * - register(server, user, password, domain) : S'enregistre sur un serveur SIP
 * - unregister() : Se désenregistre
 * - answer() : Répond à un appel entrant
 * - hangup() : Raccroche l'appel en cours
 * - reject() : Rejette un appel entrant
 * - getState() : Retourne l'état actuel (registered, ringing, incall, etc.)
 * - setMicrophoneEnabled(enabled) : Active/désactive le micro
 * - setSpeakerEnabled(enabled) : Active/désactive le haut-parleur
 *
 * Événements émis vers JavaScript :
 * - incomingCall : Appel entrant détecté
 * - callConnected : Appel connecté (audio établi)
 * - callEnded : Appel terminé
 * - registrationStateChanged : État d'enregistrement SIP changé
 * - error : Erreur
 */
@CapacitorPlugin(
    name = "LinphoneSip",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        ),
        @Permission(
            alias = "phone",
            strings = { Manifest.permission.READ_PHONE_STATE }
        )
    }
)
public class LinphoneSipPlugin extends Plugin {
    private static final String TAG = "LinphoneSipPlugin";

    private LinphoneSipManager sipManager;

    @Override
    public void load() {
        super.load();
        Log.i(TAG, "LinphoneSipPlugin loaded");
    }

    /**
     * Initialise le SDK Linphone
     */
    @PluginMethod
    public void initialize(PluginCall call) {
        try {
            if (sipManager == null) {
                sipManager = new LinphoneSipManager(getContext(), this);
            }
            sipManager.initialize();

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Linphone SDK initialized");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Linphone", e);
            call.reject("Failed to initialize Linphone: " + e.getMessage());
        }
    }

    /**
     * S'enregistre sur un serveur SIP Asterisk
     */
    @PluginMethod
    public void register(PluginCall call) {
        String server = call.getString("server");
        String user = call.getString("user");
        String password = call.getString("password");
        String domain = call.getString("domain", server);
        String displayName = call.getString("displayName", user);

        if (server == null || user == null || password == null) {
            call.reject("Missing required parameters: server, user, password");
            return;
        }

        if (sipManager == null) {
            call.reject("Linphone not initialized. Call initialize() first.");
            return;
        }

        // Vérifier les permissions micro
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "registerCallback");
            return;
        }

        try {
            sipManager.register(server, user, password, domain, displayName);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Registration initiated");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to register", e);
            call.reject("Failed to register: " + e.getMessage());
        }
    }

    @PermissionCallback
    private void registerCallback(PluginCall call) {
        if (hasRequiredPermissions()) {
            register(call);
        } else {
            call.reject("Microphone permission required for SIP calls");
        }
    }

    private boolean hasRequiredPermissions() {
        return getPermissionState("microphone") == PermissionState.GRANTED;
    }

    /**
     * Se désenregistre du serveur SIP
     */
    @PluginMethod
    public void unregister(PluginCall call) {
        if (sipManager == null) {
            call.reject("Linphone not initialized");
            return;
        }

        try {
            sipManager.unregister();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to unregister: " + e.getMessage());
        }
    }

    /**
     * Répond à un appel entrant
     */
    @PluginMethod
    public void answer(PluginCall call) {
        if (sipManager == null) {
            call.reject("Linphone not initialized");
            return;
        }

        try {
            boolean success = sipManager.answerCall();

            JSObject result = new JSObject();
            result.put("success", success);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to answer call: " + e.getMessage());
        }
    }

    /**
     * Raccroche l'appel en cours
     */
    @PluginMethod
    public void hangup(PluginCall call) {
        if (sipManager == null) {
            call.reject("Linphone not initialized");
            return;
        }

        try {
            sipManager.hangupCall();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to hangup: " + e.getMessage());
        }
    }

    /**
     * Rejette un appel entrant
     */
    @PluginMethod
    public void reject(PluginCall call) {
        if (sipManager == null) {
            call.reject("Linphone not initialized");
            return;
        }

        try {
            sipManager.rejectCall();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to reject call: " + e.getMessage());
        }
    }

    /**
     * Retourne l'état actuel
     */
    @PluginMethod
    public void getState(PluginCall call) {
        JSObject result = new JSObject();

        if (sipManager == null) {
            result.put("initialized", false);
            result.put("registered", false);
            result.put("callState", "none");
            call.resolve(result);
            return;
        }

        result.put("initialized", true);
        result.put("registered", sipManager.isRegistered());
        result.put("callState", sipManager.getCallState());
        result.put("incomingCallFrom", sipManager.getIncomingCallFrom());
        call.resolve(result);
    }

    /**
     * Active/désactive le microphone
     */
    @PluginMethod
    public void setMicrophoneEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", true);

        if (sipManager == null) {
            call.reject("Linphone not initialized");
            return;
        }

        sipManager.setMicrophoneEnabled(enabled);

        JSObject result = new JSObject();
        result.put("success", true);
        result.put("microphoneEnabled", enabled);
        call.resolve(result);
    }

    /**
     * Active/désactive le haut-parleur
     */
    @PluginMethod
    public void setSpeakerEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", true);

        if (sipManager == null) {
            call.reject("Linphone not initialized");
            return;
        }

        sipManager.setSpeakerEnabled(enabled);

        JSObject result = new JSObject();
        result.put("success", true);
        result.put("speakerEnabled", enabled);
        call.resolve(result);
    }

    /**
     * Envoie une requête DTMF (pour ouvrir une porte par exemple)
     */
    @PluginMethod
    public void sendDtmf(PluginCall call) {
        String dtmf = call.getString("dtmf");

        if (dtmf == null || dtmf.isEmpty()) {
            call.reject("Missing dtmf parameter");
            return;
        }

        if (sipManager == null) {
            call.reject("Linphone not initialized");
            return;
        }

        try {
            sipManager.sendDtmf(dtmf);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to send DTMF: " + e.getMessage());
        }
    }

    /**
     * Libère les ressources
     */
    @PluginMethod
    public void destroy(PluginCall call) {
        if (sipManager != null) {
            sipManager.destroy();
            sipManager = null;
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    // Méthodes appelées par LinphoneSipManager pour notifier le JavaScript

    public void notifyIncomingCall(String from, String displayName) {
        JSObject data = new JSObject();
        data.put("from", from);
        data.put("displayName", displayName);
        notifyListeners("incomingCall", data);
    }

    public void notifyCallConnected() {
        JSObject data = new JSObject();
        data.put("state", "connected");
        notifyListeners("callConnected", data);
    }

    public void notifyCallEnded(String reason) {
        JSObject data = new JSObject();
        data.put("reason", reason);
        notifyListeners("callEnded", data);
    }

    public void notifyRegistrationState(String state, String message) {
        JSObject data = new JSObject();
        data.put("state", state);
        data.put("message", message);
        notifyListeners("registrationStateChanged", data);
    }

    public void notifyError(String error) {
        JSObject data = new JSObject();
        data.put("error", error);
        notifyListeners("error", data);
    }
}
