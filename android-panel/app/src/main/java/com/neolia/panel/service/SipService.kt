package com.neolia.panel.service

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.neolia.panel.MainActivity
import com.neolia.panel.R
import com.neolia.panel.sip.LinphoneManager
import com.neolia.panel.ui.call.IncomingCallActivity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest

/**
 * Service foreground pour maintenir la connexion SIP active
 * Permet de recevoir les appels meme quand l'app est en arriere-plan
 */
class SipService : Service() {
    companion object {
        private const val TAG = "SipService"
        private const val NOTIFICATION_ID = 1001
        const val CHANNEL_ID = "neolia_sip_channel"

        fun start(context: Context) {
            val intent = Intent(context, SipService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, SipService::class.java)
            context.stopService(intent)
        }
    }

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")

        // Observer les appels entrants
        scope.launch {
            LinphoneManager.callState.collectLatest { state ->
                when (state) {
                    LinphoneManager.CallState.INCOMING -> {
                        Log.d(TAG, "Incoming call detected, launching call screen")
                        launchIncomingCallScreen()
                    }
                    LinphoneManager.CallState.IDLE -> {
                        // Appel termine, on peut mettre a jour la notification
                        updateNotification("En attente d'appel")
                    }
                    LinphoneManager.CallState.IN_CALL -> {
                        updateNotification("Appel en cours")
                    }
                    else -> {}
                }
            }
        }

        // Observer l'etat d'enregistrement
        scope.launch {
            LinphoneManager.registrationState.collectLatest { state ->
                val statusText = when (state) {
                    LinphoneManager.RegistrationState.REGISTERED -> "Connecté"
                    LinphoneManager.RegistrationState.REGISTERING -> "Connexion..."
                    LinphoneManager.RegistrationState.FAILED -> "Erreur connexion"
                    LinphoneManager.RegistrationState.UNREGISTERED -> "Déconnecté"
                }
                updateNotification(statusText)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started")
        startForeground(NOTIFICATION_ID, createNotification("Initialisation..."))
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
        scope.cancel()
    }

    private fun createNotification(status: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Neolia Panel")
            .setContentText("Interphone: $status")
            .setSmallIcon(R.drawable.ic_intercom)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(status: String) {
        val notification = createNotification(status)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun launchIncomingCallScreen() {
        val intent = Intent(this, IncomingCallActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        }
        startActivity(intent)
    }
}
