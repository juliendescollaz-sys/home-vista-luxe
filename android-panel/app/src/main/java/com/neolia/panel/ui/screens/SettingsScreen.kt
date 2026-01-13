package com.neolia.panel.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.neolia.panel.data.PanelConfig
import com.neolia.panel.sip.LinphoneManager
import kotlinx.coroutines.launch
import org.linphone.core.RegistrationState

/**
 * Ecran des parametres du Panel
 * Layout en 3 colonnes comme le PWA
 */
@Composable
fun SettingsScreen(
    panelConfig: PanelConfig,
    onThemeChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    // Observer les configs
    val sipServer by panelConfig.sipServer.collectAsState(initial = "")
    val sipUser by panelConfig.sipUser.collectAsState(initial = "")
    val sipPassword by panelConfig.sipPassword.collectAsState(initial = "")
    val haUrl by panelConfig.haUrl.collectAsState(initial = "")
    val haToken by panelConfig.haToken.collectAsState(initial = "")
    val darkMode by panelConfig.darkMode.collectAsState(initial = true)

    // Observer l'etat SIP
    val sipState by LinphoneManager.registrationState.collectAsState()

    // Dialog states
    var showSipDialog by remember { mutableStateOf(false) }
    var showHaDialog by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Colonne 1: Connexion HA
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            SettingsCard(
                title = "Home Assistant",
                icon = Icons.Default.Home
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "URL",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = haUrl.ifEmpty { "Non configuré" },
                        style = MaterialTheme.typography.bodyMedium
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = { showHaDialog = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Settings, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Configurer")
                    }
                }
            }

            // Bouton deconnexion
            OutlinedButton(
                onClick = {
                    scope.launch {
                        panelConfig.clearAll()
                        LinphoneManager.unregister()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Icon(Icons.Default.ExitToApp, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Se déconnecter")
            }
        }

        // Colonne 2: Apparence
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            SettingsCard(
                title = "Apparence",
                icon = Icons.Default.Face
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Thème",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        FilledTonalButton(
                            onClick = { onThemeChange(false) },
                            modifier = Modifier.weight(1f),
                            colors = if (!darkMode) {
                                ButtonDefaults.filledTonalButtonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                ButtonDefaults.filledTonalButtonColors()
                            }
                        ) {
                            Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Clair")
                        }

                        FilledTonalButton(
                            onClick = { onThemeChange(true) },
                            modifier = Modifier.weight(1f),
                            colors = if (darkMode) {
                                ButtonDefaults.filledTonalButtonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                ButtonDefaults.filledTonalButtonColors()
                            }
                        ) {
                            Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Sombre")
                        }
                    }
                }
            }

            SettingsCard(
                title = "À propos",
                icon = Icons.Default.Info
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "Neolia Panel v1.0.0",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "Android Natif",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "© 2025 Neolia",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Colonne 3: Interphone SIP
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            SettingsCard(
                title = "Interphone",
                icon = Icons.Default.Phone
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Statut SIP
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Statut SIP",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Surface(
                            color = when (sipState) {
                                RegistrationState.Ok -> MaterialTheme.colorScheme.primary
                                RegistrationState.Progress -> MaterialTheme.colorScheme.tertiary
                                RegistrationState.Failed -> MaterialTheme.colorScheme.error
                                else -> MaterialTheme.colorScheme.outline
                            },
                            shape = MaterialTheme.shapes.small
                        ) {
                            Text(
                                text = when (sipState) {
                                    RegistrationState.Ok -> "Connecté"
                                    RegistrationState.Progress -> "Connexion..."
                                    RegistrationState.Failed -> "Erreur"
                                    else -> "Déconnecté"
                                },
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        }
                    }

                    if (sipServer.isNotEmpty()) {
                        Text(
                            text = "Serveur: $sipServer",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = { showSipDialog = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Settings, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Configurer")
                    }

                    if (sipServer.isNotEmpty()) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    if (sipState == RegistrationState.Ok) {
                                        LinphoneManager.unregister()
                                    } else {
                                        LinphoneManager.register(
                                            sipServer,
                                            sipUser,
                                            sipPassword,
                                            sipServer
                                        )
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                if (sipState == RegistrationState.Ok) {
                                    "Déconnecter"
                                } else {
                                    "Tester connexion"
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    // Dialog SIP Config
    if (showSipDialog) {
        SipConfigDialog(
            currentServer = sipServer,
            currentUser = sipUser,
            currentPassword = sipPassword,
            onDismiss = { showSipDialog = false },
            onSave = { server, user, password ->
                scope.launch {
                    panelConfig.saveSipConfig(server, user, password)
                    LinphoneManager.register(server, user, password, server)
                }
                showSipDialog = false
            }
        )
    }

    // Dialog HA Config
    if (showHaDialog) {
        HaConfigDialog(
            currentUrl = haUrl,
            currentToken = haToken,
            onDismiss = { showHaDialog = false },
            onSave = { url, token ->
                scope.launch {
                    panelConfig.saveHAConfig(url, token)
                }
                showHaDialog = false
            }
        )
    }
}

@Composable
private fun SettingsCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(Modifier.width(12.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
            content()
        }
    }
}

@Composable
private fun SipConfigDialog(
    currentServer: String,
    currentUser: String,
    currentPassword: String,
    onDismiss: () -> Unit,
    onSave: (server: String, user: String, password: String) -> Unit
) {
    var server by remember { mutableStateOf(currentServer) }
    var user by remember { mutableStateOf(currentUser) }
    var password by remember { mutableStateOf(currentPassword) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Configuration SIP") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = server,
                    onValueChange = { server = it },
                    label = { Text("Serveur (R-Pi)") },
                    placeholder = { Text("192.168.1.115") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = user,
                    onValueChange = { user = it },
                    label = { Text("Identifiant") },
                    placeholder = { Text("panel-401") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Mot de passe") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(server, user, password) },
                enabled = server.isNotBlank() && user.isNotBlank() && password.isNotBlank()
            ) {
                Text("Sauvegarder")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler")
            }
        }
    )
}

@Composable
private fun HaConfigDialog(
    currentUrl: String,
    currentToken: String,
    onDismiss: () -> Unit,
    onSave: (url: String, token: String) -> Unit
) {
    var url by remember { mutableStateOf(currentUrl) }
    var token by remember { mutableStateOf(currentToken) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Configuration Home Assistant") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("URL Home Assistant") },
                    placeholder = { Text("http://192.168.1.x:8123") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = token,
                    onValueChange = { token = it },
                    label = { Text("Token d'accès") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(url, token) },
                enabled = url.isNotBlank() && token.isNotBlank()
            ) {
                Text("Sauvegarder")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler")
            }
        }
    )
}
