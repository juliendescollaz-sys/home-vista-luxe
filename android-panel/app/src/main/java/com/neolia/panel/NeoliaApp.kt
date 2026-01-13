package com.neolia.panel

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.neolia.panel.service.SipService
import com.neolia.panel.sip.LinphoneManager

/**
 * Application principale Neolia Panel
 * Initialise Linphone SDK au demarrage
 */
class NeoliaApp : Application() {

    companion object {
        const val CHANNEL_CALL = "neolia_call_channel"
        lateinit var instance: NeoliaApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Creer les canaux de notification
        createNotificationChannels()

        // Initialiser Linphone
        LinphoneManager.initialize(this)
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)

            // Canal pour les appels entrants (haute priorite)
            val callChannel = NotificationChannel(
                CHANNEL_CALL,
                "Appels entrants",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications pour les appels interphone"
                setSound(null, null) // On gere le son nous-meme
                enableVibration(true)
                setShowBadge(true)
            }
            manager.createNotificationChannel(callChannel)

            // Canal pour le service SIP (basse priorite)
            val sipChannel = NotificationChannel(
                SipService.CHANNEL_ID,
                "Service Interphone",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintient la connexion SIP active"
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
            }
            manager.createNotificationChannel(sipChannel)
        }
    }
}
