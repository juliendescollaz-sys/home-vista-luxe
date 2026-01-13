package com.neolia.panel

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.neolia.panel.data.PanelConfig
import com.neolia.panel.ha.HomeAssistantClient
import com.neolia.panel.service.SipService
import com.neolia.panel.sip.LinphoneManager
import com.neolia.panel.ui.navigation.BottomNavBar
import com.neolia.panel.ui.navigation.NavRoute
import com.neolia.panel.ui.screens.*
import com.neolia.panel.ui.theme.NeoliaPanelTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    companion object {
        private const val TAG = "MainActivity"
    }

    private lateinit var panelConfig: PanelConfig
    private var haClient: HomeAssistantClient? = null

    private val requiredPermissions = arrayOf(
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.CAMERA,
        Manifest.permission.POST_NOTIFICATIONS
    )

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.values.all { it }
        if (allGranted) {
            Log.d(TAG, "All permissions granted")
            initializeServices()
        } else {
            Log.w(TAG, "Some permissions denied")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        panelConfig = PanelConfig(this)

        // Verifier les permissions
        if (hasAllPermissions()) {
            initializeServices()
        } else {
            permissionLauncher.launch(requiredPermissions)
        }

        setContent {
            var darkMode by remember { mutableStateOf(true) }
            val scope = rememberCoroutineScope()

            // Observer le theme
            LaunchedEffect(Unit) {
                panelConfig.darkMode.collect { darkMode = it }
            }

            NeoliaPanelTheme(darkTheme = darkMode) {
                MainScreen(
                    panelConfig = panelConfig,
                    haClient = haClient,
                    onThemeChange = { isDark ->
                        scope.launch {
                            panelConfig.setDarkMode(isDark)
                        }
                    }
                )
            }
        }
    }

    private fun hasAllPermissions(): Boolean {
        return requiredPermissions.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun initializeServices() {
        lifecycleScope.launch {
            // Demarrer le service SIP
            SipService.start(this@MainActivity)

            // Configurer SIP si les credentials sont sauvegardes
            val sipServer = panelConfig.sipServer.first()
            val sipUser = panelConfig.sipUser.first()
            val sipPassword = panelConfig.sipPassword.first()
            val sipDomain = panelConfig.sipDomain.first()

            if (sipServer.isNotEmpty() && sipUser.isNotEmpty() && sipPassword.isNotEmpty()) {
                LinphoneManager.register(sipServer, sipUser, sipPassword, sipDomain.ifEmpty { sipServer })
            }

            // Configurer Home Assistant si les credentials sont sauvegardes
            val haUrl = panelConfig.haUrl.first()
            val haToken = panelConfig.haToken.first()

            if (haUrl.isNotEmpty() && haToken.isNotEmpty()) {
                haClient = HomeAssistantClient(haUrl, haToken).also {
                    it.connect()
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        haClient?.disconnect()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    panelConfig: PanelConfig,
    haClient: HomeAssistantClient?,
    onThemeChange: (Boolean) -> Unit
) {
    val navController = rememberNavController()
    var currentRoute by remember { mutableStateOf(NavRoute.HOME) }

    // Observer la navigation
    LaunchedEffect(navController) {
        navController.currentBackStackEntryFlow.collect { entry ->
            currentRoute = NavRoute.fromRoute(entry.destination.route ?: NavRoute.HOME.route)
        }
    }

    Scaffold(
        bottomBar = {
            BottomNavBar(
                currentRoute = currentRoute,
                onNavigate = { route ->
                    navController.navigate(route.route) {
                        popUpTo(NavRoute.HOME.route) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            )
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = NavRoute.HOME.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(NavRoute.HOME.route) {
                HomeScreen(haClient = haClient)
            }
            composable(NavRoute.ROOMS.route) {
                RoomsScreen(haClient = haClient)
            }
            composable(NavRoute.FAVORITES.route) {
                FavoritesScreen(haClient = haClient)
            }
            composable(NavRoute.SETTINGS.route) {
                SettingsScreen(
                    panelConfig = panelConfig,
                    onThemeChange = onThemeChange
                )
            }
        }
    }
}
