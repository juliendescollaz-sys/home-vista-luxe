package com.neolia.app.linphone;

import android.content.Context;
import android.media.AudioManager;
import android.util.Log;

import org.linphone.core.Account;
import org.linphone.core.AccountParams;
import org.linphone.core.Address;
import org.linphone.core.AudioDevice;
import org.linphone.core.AuthInfo;
import org.linphone.core.Call;
import org.linphone.core.CallParams;
import org.linphone.core.Core;
import org.linphone.core.CoreListenerStub;
import org.linphone.core.Factory;
import org.linphone.core.GlobalState;
import org.linphone.core.LogCollectionState;
import org.linphone.core.MediaEncryption;
import org.linphone.core.RegistrationState;
import org.linphone.core.TransportType;

/**
 * Manager pour le SDK Linphone
 * Gère la connexion SIP, les appels entrants/sortants et l'audio
 */
public class LinphoneSipManager {
    private static final String TAG = "LinphoneSipManager";

    private final Context context;
    private final LinphoneSipPlugin plugin;

    private Core core;
    private Account currentAccount;
    private Call currentCall;

    private boolean isInitialized = false;
    private boolean isRegistered = false;

    // Listener pour les événements Linphone
    private final CoreListenerStub coreListener = new CoreListenerStub() {
        @Override
        public void onGlobalStateChanged(Core core, GlobalState state, String message) {
            Log.i(TAG, "Global state changed: " + state + " - " + message);
        }

        @Override
        public void onAccountRegistrationStateChanged(Core core, Account account, RegistrationState state, String message) {
            Log.i(TAG, "Registration state changed: " + state + " - " + message);

            isRegistered = (state == RegistrationState.Ok);

            String stateStr;
            switch (state) {
                case Ok:
                    stateStr = "registered";
                    break;
                case Progress:
                    stateStr = "registering";
                    break;
                case Cleared:
                    stateStr = "unregistered";
                    break;
                case Failed:
                    stateStr = "failed";
                    break;
                default:
                    stateStr = "unknown";
            }

            plugin.notifyRegistrationState(stateStr, message);
        }

        @Override
        public void onCallStateChanged(Core core, Call call, Call.State state, String message) {
            Log.i(TAG, "Call state changed: " + state + " - " + message);

            currentCall = call;

            switch (state) {
                case IncomingReceived:
                    // Appel entrant
                    Address remoteAddress = call.getRemoteAddress();
                    String from = remoteAddress != null ? remoteAddress.asStringUriOnly() : "unknown";
                    String displayName = remoteAddress != null ? remoteAddress.getDisplayName() : "";
                    if (displayName == null || displayName.isEmpty()) {
                        displayName = remoteAddress != null ? remoteAddress.getUsername() : "Interphone";
                    }
                    Log.i(TAG, "Incoming call from: " + from + " (" + displayName + ")");
                    plugin.notifyIncomingCall(from, displayName);
                    break;

                case Connected:
                    // Appel connecté
                    Log.i(TAG, "Call connected");
                    plugin.notifyCallConnected();
                    break;

                case StreamsRunning:
                    // Audio établi
                    Log.i(TAG, "Audio streams running");
                    break;

                case End:
                case Released:
                    // Appel terminé
                    Log.i(TAG, "Call ended: " + message);
                    plugin.notifyCallEnded(message);
                    currentCall = null;
                    break;

                case Error:
                    Log.e(TAG, "Call error: " + message);
                    plugin.notifyError("Call error: " + message);
                    currentCall = null;
                    break;

                default:
                    break;
            }
        }
    };

    public LinphoneSipManager(Context context, LinphoneSipPlugin plugin) {
        this.context = context;
        this.plugin = plugin;
    }

    /**
     * Initialise le SDK Linphone
     */
    public void initialize() {
        if (isInitialized) {
            Log.w(TAG, "Linphone already initialized");
            return;
        }

        Log.i(TAG, "Initializing Linphone SDK...");

        // Configuration des logs (désactiver en production)
        Factory.instance().setDebugMode(true, "Linphone");
        Factory.instance().enableLogCollection(LogCollectionState.Disabled);

        // Créer le Core
        core = Factory.instance().createCore(null, null, context);

        // Configuration du Core
        configureCore();

        // Ajouter le listener
        core.addListener(coreListener);

        // Démarrer le Core
        core.start();

        isInitialized = true;
        Log.i(TAG, "Linphone SDK initialized successfully");
    }

    /**
     * Configure le Core Linphone pour un usage SIP basique
     */
    private void configureCore() {
        // Désactiver la vidéo (on utilise WHEP séparément)
        core.setVideoCaptureEnabled(false);
        core.setVideoDisplayEnabled(false);

        // Configuration audio
        core.setUseInfoForDtmf(true);
        core.setUseRfc2833ForDtmf(true);

        // Codecs audio (G711, Opus)
        for (org.linphone.core.PayloadType pt : core.getAudioPayloadTypes()) {
            String mime = pt.getMimeType().toLowerCase();
            // Activer les codecs courants
            if (mime.equals("pcmu") || mime.equals("pcma") || mime.equals("opus")) {
                pt.enable(true);
            } else {
                pt.enable(false);
            }
        }

        // NAT traversal (STUN/ICE)
        // Pour le LAN local, on peut désactiver STUN
        core.setNatPolicy(null);

        // Mode audio (optimisé pour VoIP)
        core.setMediaEncryption(MediaEncryption.None); // Pas de SRTP pour Asterisk basique
        core.setEchoCancellationEnabled(true);
        core.setAdaptiveRateControlEnabled(true);

        // Ringback (sonnerie retour)
        // core.setRingback(null); // Utiliser la sonnerie par défaut ou personnalisée

        Log.i(TAG, "Core configured");
    }

    /**
     * S'enregistre sur un serveur SIP Asterisk
     */
    public void register(String server, String user, String password, String domain, String displayName) {
        if (!isInitialized) {
            throw new IllegalStateException("Linphone not initialized");
        }

        Log.i(TAG, "Registering to SIP server: " + server + " as " + user + "@" + domain);

        // Supprimer l'ancien compte si existant
        if (currentAccount != null) {
            core.removeAccount(currentAccount);
            currentAccount = null;
        }

        // Créer les infos d'authentification
        AuthInfo authInfo = Factory.instance().createAuthInfo(
            user,           // username
            null,           // userid (null = same as username)
            password,       // password
            null,           // ha1 (null = use password)
            domain,         // realm
            domain          // domain
        );
        core.addAuthInfo(authInfo);

        // Créer l'adresse SIP
        String sipAddress = "sip:" + user + "@" + domain;
        Address identity = Factory.instance().createAddress(sipAddress);
        if (identity == null) {
            throw new IllegalArgumentException("Invalid SIP address: " + sipAddress);
        }
        identity.setDisplayName(displayName);

        // Créer les paramètres du compte
        AccountParams accountParams = core.createAccountParams();
        accountParams.setIdentityAddress(identity);

        // Configurer le serveur proxy/registrar
        String serverUri = "sip:" + server;
        Address serverAddress = Factory.instance().createAddress(serverUri);
        if (serverAddress != null) {
            serverAddress.setTransport(TransportType.Udp); // UDP pour Asterisk local
            accountParams.setServerAddress(serverAddress);
        }

        // Activer l'enregistrement
        accountParams.setRegisterEnabled(true);
        accountParams.setExpires(600); // 10 minutes

        // Configurer les routes (optionnel pour LAN)
        // accountParams.setRoutesAddresses(null);

        // Créer et ajouter le compte
        currentAccount = core.createAccount(accountParams);
        core.addAccount(currentAccount);
        core.setDefaultAccount(currentAccount);

        Log.i(TAG, "Registration initiated for " + sipAddress);
    }

    /**
     * Se désenregistre
     */
    public void unregister() {
        if (currentAccount != null) {
            AccountParams params = currentAccount.getParams().clone();
            params.setRegisterEnabled(false);
            currentAccount.setParams(params);
        }
        isRegistered = false;
    }

    /**
     * Répond à l'appel entrant
     */
    public boolean answerCall() {
        if (currentCall == null) {
            Log.w(TAG, "No incoming call to answer");
            return false;
        }

        Call.State state = currentCall.getState();
        if (state != Call.State.IncomingReceived && state != Call.State.IncomingEarlyMedia) {
            Log.w(TAG, "Call is not in incoming state: " + state);
            return false;
        }

        // Paramètres d'appel (audio uniquement)
        CallParams callParams = core.createCallParams(currentCall);
        callParams.setVideoEnabled(false);
        callParams.setAudioEnabled(true);

        // Répondre
        int result = currentCall.acceptWithParams(callParams);
        Log.i(TAG, "Answer call result: " + result);

        return result == 0;
    }

    /**
     * Raccroche l'appel en cours
     */
    public void hangupCall() {
        if (currentCall != null) {
            currentCall.terminate();
            currentCall = null;
        }
    }

    /**
     * Rejette l'appel entrant
     */
    public void rejectCall() {
        if (currentCall != null) {
            currentCall.decline(org.linphone.core.Reason.Declined);
            currentCall = null;
        }
    }

    /**
     * Retourne l'état d'enregistrement
     */
    public boolean isRegistered() {
        return isRegistered;
    }

    /**
     * Retourne l'état de l'appel
     */
    public String getCallState() {
        if (currentCall == null) {
            return "none";
        }

        Call.State state = currentCall.getState();
        switch (state) {
            case IncomingReceived:
            case IncomingEarlyMedia:
                return "ringing";
            case OutgoingInit:
            case OutgoingProgress:
            case OutgoingRinging:
            case OutgoingEarlyMedia:
                return "outgoing";
            case Connected:
            case StreamsRunning:
            case Updating:
            case UpdatedByRemote:
                return "incall";
            case Pausing:
            case Paused:
            case PausedByRemote:
                return "paused";
            case End:
            case Released:
                return "ended";
            case Error:
                return "error";
            default:
                return "unknown";
        }
    }

    /**
     * Retourne l'appelant de l'appel entrant
     */
    public String getIncomingCallFrom() {
        if (currentCall == null) {
            return null;
        }
        Address remoteAddress = currentCall.getRemoteAddress();
        return remoteAddress != null ? remoteAddress.asStringUriOnly() : null;
    }

    /**
     * Active/désactive le microphone
     */
    public void setMicrophoneEnabled(boolean enabled) {
        if (core != null) {
            core.setMicEnabled(enabled);
        }
    }

    /**
     * Active/désactive le haut-parleur
     */
    public void setSpeakerEnabled(boolean enabled) {
        if (core == null) return;

        AudioDevice[] devices = core.getAudioDevices();
        for (AudioDevice device : devices) {
            if (enabled && device.getType() == AudioDevice.Type.Speaker) {
                core.setOutputAudioDevice(device);
                return;
            } else if (!enabled && device.getType() == AudioDevice.Type.Earpiece) {
                core.setOutputAudioDevice(device);
                return;
            }
        }
    }

    /**
     * Envoie des DTMF (ex: pour ouvrir une porte)
     */
    public void sendDtmf(String dtmf) {
        if (currentCall == null) {
            Log.w(TAG, "No active call for DTMF");
            return;
        }

        for (char c : dtmf.toCharArray()) {
            currentCall.sendDtmf(c);
        }
        Log.i(TAG, "Sent DTMF: " + dtmf);
    }

    /**
     * Libère les ressources
     */
    public void destroy() {
        if (core != null) {
            core.removeListener(coreListener);

            // Terminer l'appel en cours
            if (currentCall != null) {
                currentCall.terminate();
                currentCall = null;
            }

            // Supprimer le compte
            if (currentAccount != null) {
                core.removeAccount(currentAccount);
                currentAccount = null;
            }

            // Arrêter et détruire le Core
            core.stop();
            core = null;
        }

        isInitialized = false;
        isRegistered = false;
        Log.i(TAG, "Linphone destroyed");
    }
}
