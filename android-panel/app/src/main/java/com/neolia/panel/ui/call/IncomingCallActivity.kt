package com.neolia.panel.ui.call

import android.app.KeyguardManager
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.DoorFront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.rtsp.RtspMediaSource
import androidx.media3.ui.PlayerView
import com.neolia.panel.sip.LinphoneManager
import com.neolia.panel.ui.theme.NeoliaTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.linphone.core.Call

/**
 * Activite plein ecran pour les appels entrants
 * Affiche la video RTSP de l'Akuvox via ExoPlayer
 * Gere l'audio SIP via Linphone
 */
class IncomingCallActivity : ComponentActivity() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var exoPlayer: ExoPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Permettre d'afficher sur l'ecran de verrouillage
        setupWindowFlags()

        // Demarrer la sonnerie et vibration
        startRinging()

        setContent {
            NeoliaTheme {
                IncomingCallScreen(
                    onAnswer = { answerCall() },
                    onDecline = { declineCall() },
                    onOpenDoor = { openDoor() },
                    onHangUp = { hangUp() }
                )
            }
        }

        // Observer l'etat de l'appel
        lifecycleScope.launch {
            LinphoneManager.callState.collect { state ->
                when (state) {
                    Call.State.End, Call.State.Released, Call.State.Error -> {
                        finish()
                    }
                    Call.State.StreamsRunning -> {
                        stopRinging()
                    }
                    else -> {}
                }
            }
        }
    }

    private fun setupWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun startRinging() {
        // Sonnerie
        try {
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.mode = AudioManager.MODE_RINGTONE

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                // TODO: Utiliser sonnerie personnalisee depuis les settings
                setDataSource(this@IncomingCallActivity, Uri.parse("content://settings/system/ringtone"))
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Vibration
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        val pattern = longArrayOf(0, 500, 200, 500)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }

    private fun stopRinging() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null

        vibrator?.cancel()
        vibrator = null
    }

    private fun answerCall() {
        stopRinging()
        LinphoneManager.answerCall()
    }

    private fun declineCall() {
        stopRinging()
        LinphoneManager.declineOrHangup()
        finish()
    }

    private fun hangUp() {
        LinphoneManager.declineOrHangup()
        finish()
    }

    private fun openDoor() {
        // Envoyer DTMF # pour ouvrir (configurable)
        LinphoneManager.sendDtmf("#")
        // Ou appel HTTP vers Akuvox
        // TODO: Lire la config depuis DataStore
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRinging()
        exoPlayer?.release()
    }
}

@Composable
fun IncomingCallScreen(
    onAnswer: () -> Unit,
    onDecline: () -> Unit,
    onOpenDoor: () -> Unit,
    onHangUp: () -> Unit
) {
    val callState by LinphoneManager.callState.collectAsState()
    val isConnected = callState == Call.State.StreamsRunning ||
                      callState == Call.State.Connected ||
                      callState == Call.State.Updating

    val context = LocalContext.current

    // ExoPlayer pour RTSP
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build()
    }

    // Demarrer le flux RTSP quand on repond
    LaunchedEffect(isConnected) {
        if (isConnected) {
            val rtspUri = LinphoneManager.getCallerRtspUri()
            if (rtspUri != null) {
                val mediaSource = RtspMediaSource.Factory()
                    .setForceUseRtpTcp(false) // UDP pour moins de latence
                    .createMediaSource(MediaItem.fromUri(rtspUri))
                exoPlayer.setMediaSource(mediaSource)
                exoPlayer.prepare()
                exoPlayer.play()
            }
        } else {
            exoPlayer.stop()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            exoPlayer.release()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF1A1A2E))
    ) {
        // Video RTSP en fond
        if (isConnected) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = exoPlayer
                        useController = false
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        // Overlay avec controles
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Spacer(modifier = Modifier.height(48.dp))

            Text(
                text = if (isConnected) "Appel en cours" else "Appel entrant",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )

            Text(
                text = "Interphone",
                fontSize = 20.sp,
                color = Color.White.copy(alpha = 0.7f),
                modifier = Modifier.padding(top = 8.dp)
            )

            Spacer(modifier = Modifier.weight(1f))

            // Boutons
            if (isConnected) {
                // Appel connecte: Ouvrir porte + Raccrocher
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 48.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    // Ouvrir la porte
                    CallActionButton(
                        icon = Icons.Default.DoorFront,
                        label = "Ouvrir",
                        backgroundColor = Color(0xFF4CAF50),
                        onClick = onOpenDoor
                    )

                    // Raccrocher
                    CallActionButton(
                        icon = Icons.Default.CallEnd,
                        label = "Raccrocher",
                        backgroundColor = Color(0xFFE53935),
                        onClick = onHangUp
                    )
                }
            } else {
                // Appel entrant: Refuser + Repondre
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 48.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    // Refuser
                    CallActionButton(
                        icon = Icons.Default.CallEnd,
                        label = "Refuser",
                        backgroundColor = Color(0xFFE53935),
                        onClick = onDecline
                    )

                    // Repondre
                    CallActionButton(
                        icon = Icons.Default.Call,
                        label = "Répondre",
                        backgroundColor = Color(0xFF4CAF50),
                        onClick = onAnswer
                    )
                }
            }
        }
    }
}

@Composable
fun CallActionButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    backgroundColor: Color,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        FilledIconButton(
            onClick = onClick,
            modifier = Modifier.size(72.dp),
            shape = CircleShape,
            colors = IconButtonDefaults.filledIconButtonColors(
                containerColor = backgroundColor
            )
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                modifier = Modifier.size(32.dp),
                tint = Color.White
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = label,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = Color.White
        )
    }
}
