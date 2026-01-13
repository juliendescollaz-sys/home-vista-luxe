package com.neolia.panel.sip

import android.content.Context
import android.content.Intent
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.linphone.core.*

/**
 * Gestionnaire Linphone SDK pour SIP/RTP natif
 * Permet les appels audio bidirectionnels avec l'Akuvox
 */
object LinphoneManager {
    private const val TAG = "LinphoneManager"

    private var core: Core? = null
    private var coreListener: CoreListenerStub? = null

    private val _registrationState = MutableStateFlow(RegistrationState.None)
    val registrationState: StateFlow<RegistrationState> = _registrationState

    private val _currentCall = MutableStateFlow<Call?>(null)
    val currentCall: StateFlow<Call?> = _currentCall

    private val _callState = MutableStateFlow(Call.State.Idle)
    val callState: StateFlow<Call.State> = _callState

    private var appContext: Context? = null

    fun initialize(context: Context) {
        appContext = context.applicationContext

        // Creer le Core Linphone
        val factory = Factory.instance()
        factory.setDebugMode(true, "Linphone")

        core = factory.createCore(null, null, context).apply {
            // Configuration audio
            enableMic(true)
            enableSpeaker(true)

            // Desactiver la video cote Linphone (on utilise ExoPlayer pour RTSP)
            enableVideoCapture(false)
            enableVideoDisplay(false)

            // Configuration reseau
            setUserAgent("NeoliaPanel", "1.0.0")
        }

        // Listener pour les evenements
        coreListener = object : CoreListenerStub() {
            override fun onRegistrationStateChanged(
                core: Core,
                proxyConfig: ProxyConfig,
                state: RegistrationState,
                message: String
            ) {
                Log.d(TAG, "Registration state: $state - $message")
                _registrationState.value = state
            }

            override fun onCallStateChanged(
                core: Core,
                call: Call,
                state: Call.State,
                message: String
            ) {
                Log.d(TAG, "Call state: $state - $message")
                _callState.value = state
                _currentCall.value = if (state == Call.State.Released || state == Call.State.End) null else call

                when (state) {
                    Call.State.IncomingReceived -> {
                        // Lancer l'activite d'appel entrant
                        launchIncomingCallActivity()
                    }
                    Call.State.End, Call.State.Released, Call.State.Error -> {
                        // Appel termine
                    }
                    else -> {}
                }
            }
        }

        core?.addListener(coreListener!!)
        core?.start()

        Log.d(TAG, "Linphone Core initialized")
    }

    /**
     * S'enregistrer sur le serveur SIP (Asterisk sur R-Pi)
     */
    fun register(server: String, username: String, password: String, domain: String = server) {
        val core = core ?: return

        // Supprimer l'ancien compte si existe
        core.defaultAccount?.let { core.removeAccount(it) }

        val factory = Factory.instance()

        // Creer l'identite
        val identity = factory.createAddress("sip:$username@$domain")
        identity?.displayName = "Panel Neolia"

        // Creer les infos d'authentification
        val authInfo = factory.createAuthInfo(
            username,
            null,
            password,
            null,
            null,
            domain
        )
        core.addAuthInfo(authInfo)

        // Creer les parametres du compte
        val accountParams = core.createAccountParams().apply {
            identityAddress = identity
            serverAddress = factory.createAddress("sip:$server")
            isRegisterEnabled = true
            // Transport UDP pour compatibilite Asterisk
            transport = TransportType.Udp
        }

        // Creer et ajouter le compte
        val account = core.createAccount(accountParams)
        core.addAccount(account)
        core.defaultAccount = account

        Log.d(TAG, "Registering to $server as $username")
    }

    /**
     * Deconnecter du serveur SIP
     */
    fun unregister() {
        core?.defaultAccount?.let { account ->
            val params = account.params.clone()
            params.isRegisterEnabled = false
            account.params = params
        }
    }

    /**
     * Repondre a l'appel entrant
     */
    fun answerCall(): Boolean {
        val call = _currentCall.value ?: return false
        return try {
            val params = core?.createCallParams(call)?.apply {
                // Audio uniquement (video via ExoPlayer)
                isVideoEnabled = false
                isAudioEnabled = true
            }
            call.acceptWithParams(params)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error answering call", e)
            false
        }
    }

    /**
     * Refuser/Terminer l'appel
     */
    fun declineOrHangup() {
        _currentCall.value?.let { call ->
            when (call.state) {
                Call.State.IncomingReceived, Call.State.IncomingEarlyMedia -> {
                    call.decline(Reason.Declined)
                }
                else -> {
                    call.terminate()
                }
            }
        }
    }

    /**
     * Envoyer un code DTMF (pour ouvrir la porte)
     */
    fun sendDtmf(code: String) {
        _currentCall.value?.let { call ->
            code.forEach { digit ->
                call.sendDtmf(digit)
            }
        }
    }

    /**
     * Obtenir l'URI du flux RTSP de l'appelant (Akuvox)
     */
    fun getCallerRtspUri(): String? {
        val call = _currentCall.value ?: return null
        val remoteAddress = call.remoteAddress
        // L'Akuvox expose son RTSP sur le port 554
        // Format: rtsp://<ip>/live/ch00_0
        val host = remoteAddress.domain
        return "rtsp://$host/live/ch00_0"
    }

    private fun launchIncomingCallActivity() {
        appContext?.let { ctx ->
            val intent = Intent(ctx, Class.forName("com.neolia.panel.ui.call.IncomingCallActivity")).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            }
            ctx.startActivity(intent)
        }
    }

    fun destroy() {
        coreListener?.let { core?.removeListener(it) }
        core?.stop()
        core = null
    }
}
