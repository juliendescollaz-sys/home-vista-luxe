package com.neolia.panel.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Configuration persistante du Panel via DataStore
 */
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "panel_config")

class PanelConfig(private val context: Context) {

    companion object {
        // SIP
        private val SIP_SERVER = stringPreferencesKey("sip_server")
        private val SIP_USER = stringPreferencesKey("sip_user")
        private val SIP_PASSWORD = stringPreferencesKey("sip_password")
        private val SIP_DOMAIN = stringPreferencesKey("sip_domain")

        // Home Assistant
        private val HA_URL = stringPreferencesKey("ha_url")
        private val HA_TOKEN = stringPreferencesKey("ha_token")

        // Interphone
        private val AKUVOX_IP = stringPreferencesKey("akuvox_ip")
        private val DOOR_METHOD = stringPreferencesKey("door_method") // http, dtmf, none
        private val DOOR_HTTP_URL = stringPreferencesKey("door_http_url")
        private val DOOR_DTMF_CODE = stringPreferencesKey("door_dtmf_code")

        // Sonnerie
        private val RINGTONE_NAME = stringPreferencesKey("ringtone_name")
        private val RINGTONE_VOLUME = floatPreferencesKey("ringtone_volume")

        // Theme
        private val DARK_MODE = booleanPreferencesKey("dark_mode")

        // Onboarding
        private val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")
    }

    // SIP Config
    val sipServer: Flow<String> = context.dataStore.data.map { it[SIP_SERVER] ?: "" }
    val sipUser: Flow<String> = context.dataStore.data.map { it[SIP_USER] ?: "" }
    val sipPassword: Flow<String> = context.dataStore.data.map { it[SIP_PASSWORD] ?: "" }
    val sipDomain: Flow<String> = context.dataStore.data.map { it[SIP_DOMAIN] ?: "" }

    suspend fun saveSipConfig(server: String, user: String, password: String, domain: String = server) {
        context.dataStore.edit { prefs ->
            prefs[SIP_SERVER] = server
            prefs[SIP_USER] = user
            prefs[SIP_PASSWORD] = password
            prefs[SIP_DOMAIN] = domain
        }
    }

    // Home Assistant Config
    val haUrl: Flow<String> = context.dataStore.data.map { it[HA_URL] ?: "" }
    val haToken: Flow<String> = context.dataStore.data.map { it[HA_TOKEN] ?: "" }

    suspend fun saveHAConfig(url: String, token: String) {
        context.dataStore.edit { prefs ->
            prefs[HA_URL] = url
            prefs[HA_TOKEN] = token
        }
    }

    // Akuvox IP
    val akuvoxIp: Flow<String> = context.dataStore.data.map { it[AKUVOX_IP] ?: "" }

    suspend fun saveAkuvoxIp(ip: String) {
        context.dataStore.edit { prefs ->
            prefs[AKUVOX_IP] = ip
        }
    }

    // Door Config
    val doorMethod: Flow<String> = context.dataStore.data.map { it[DOOR_METHOD] ?: "dtmf" }
    val doorHttpUrl: Flow<String> = context.dataStore.data.map { it[DOOR_HTTP_URL] ?: "" }
    val doorDtmfCode: Flow<String> = context.dataStore.data.map { it[DOOR_DTMF_CODE] ?: "#" }

    suspend fun saveDoorConfig(method: String, httpUrl: String = "", dtmfCode: String = "#") {
        context.dataStore.edit { prefs ->
            prefs[DOOR_METHOD] = method
            prefs[DOOR_HTTP_URL] = httpUrl
            prefs[DOOR_DTMF_CODE] = dtmfCode
        }
    }

    // Ringtone Config
    val ringtoneName: Flow<String> = context.dataStore.data.map { it[RINGTONE_NAME] ?: "default" }
    val ringtoneVolume: Flow<Float> = context.dataStore.data.map { it[RINGTONE_VOLUME] ?: 0.8f }

    suspend fun saveRingtoneConfig(name: String, volume: Float) {
        context.dataStore.edit { prefs ->
            prefs[RINGTONE_NAME] = name
            prefs[RINGTONE_VOLUME] = volume
        }
    }

    // Theme
    val darkMode: Flow<Boolean> = context.dataStore.data.map { it[DARK_MODE] ?: true }

    suspend fun setDarkMode(enabled: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[DARK_MODE] = enabled
        }
    }

    // Onboarding
    val onboardingCompleted: Flow<Boolean> = context.dataStore.data.map { it[ONBOARDING_COMPLETED] ?: false }

    suspend fun setOnboardingCompleted(completed: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[ONBOARDING_COMPLETED] = completed
        }
    }

    // Reset all config
    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
    }
}
