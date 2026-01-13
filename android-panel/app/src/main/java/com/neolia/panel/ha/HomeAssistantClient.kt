package com.neolia.panel.ha

import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import okhttp3.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/**
 * Client WebSocket pour Home Assistant
 * Gere la connexion, l'authentification et les commandes
 */
class HomeAssistantClient(
    private val url: String,
    private val token: String
) {
    companion object {
        private const val TAG = "HAClient"
    }

    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS) // Pas de timeout pour WebSocket
        .build()

    private val messageId = AtomicInteger(1)
    private val pendingRequests = mutableMapOf<Int, CompletableDeferred<JSONObject>>()

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState

    private val _entities = MutableStateFlow<Map<String, HAEntity>>(emptyMap())
    val entities: StateFlow<Map<String, HAEntity>> = _entities

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    enum class ConnectionState {
        DISCONNECTED, CONNECTING, AUTHENTICATING, CONNECTED
    }

    fun connect() {
        if (_connectionState.value != ConnectionState.DISCONNECTED) return

        _connectionState.value = ConnectionState.CONNECTING

        val wsUrl = url
            .replace("http://", "ws://")
            .replace("https://", "wss://")
            .let { if (it.endsWith("/")) "${it}api/websocket" else "$it/api/websocket" }

        Log.d(TAG, "Connecting to $wsUrl")

        val request = Request.Builder()
            .url(wsUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket opened")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket failure", t)
                _connectionState.value = ConnectionState.DISCONNECTED
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $reason")
                _connectionState.value = ConnectionState.DISCONNECTED
            }
        })
    }

    private fun handleMessage(text: String) {
        try {
            val json = JSONObject(text)
            val type = json.optString("type")

            when (type) {
                "auth_required" -> {
                    _connectionState.value = ConnectionState.AUTHENTICATING
                    authenticate()
                }
                "auth_ok" -> {
                    Log.d(TAG, "Authenticated successfully")
                    _connectionState.value = ConnectionState.CONNECTED
                    subscribeToStateChanges()
                    fetchStates()
                }
                "auth_invalid" -> {
                    Log.e(TAG, "Authentication failed")
                    _connectionState.value = ConnectionState.DISCONNECTED
                }
                "result" -> {
                    val id = json.optInt("id")
                    val deferred = pendingRequests.remove(id)
                    deferred?.complete(json)

                    // Si c'est le resultat de get_states
                    if (json.optBoolean("success") && json.has("result")) {
                        val result = json.optJSONArray("result")
                        if (result != null && result.length() > 0) {
                            parseStates(result)
                        }
                    }
                }
                "event" -> {
                    val event = json.optJSONObject("event")
                    if (event?.optString("event_type") == "state_changed") {
                        val data = event.optJSONObject("data")
                        val newState = data?.optJSONObject("new_state")
                        if (newState != null) {
                            updateEntity(newState)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing message", e)
        }
    }

    private fun authenticate() {
        val authMessage = JSONObject().apply {
            put("type", "auth")
            put("access_token", token)
        }
        webSocket?.send(authMessage.toString())
    }

    private fun subscribeToStateChanges() {
        val id = messageId.getAndIncrement()
        val message = JSONObject().apply {
            put("id", id)
            put("type", "subscribe_events")
            put("event_type", "state_changed")
        }
        webSocket?.send(message.toString())
    }

    private fun fetchStates() {
        val id = messageId.getAndIncrement()
        val message = JSONObject().apply {
            put("id", id)
            put("type", "get_states")
        }
        webSocket?.send(message.toString())
    }

    private fun parseStates(states: JSONArray) {
        val entityMap = mutableMapOf<String, HAEntity>()
        for (i in 0 until states.length()) {
            val state = states.getJSONObject(i)
            val entity = parseEntity(state)
            entityMap[entity.entityId] = entity
        }
        _entities.value = entityMap
        Log.d(TAG, "Loaded ${entityMap.size} entities")
    }

    private fun updateEntity(stateJson: JSONObject) {
        val entity = parseEntity(stateJson)
        _entities.value = _entities.value + (entity.entityId to entity)
    }

    private fun parseEntity(json: JSONObject): HAEntity {
        val entityId = json.getString("entity_id")
        val state = json.getString("state")
        val attributes = json.optJSONObject("attributes") ?: JSONObject()

        return HAEntity(
            entityId = entityId,
            state = state,
            friendlyName = attributes.optString("friendly_name", entityId),
            attributes = attributes
        )
    }

    /**
     * Appeler un service Home Assistant
     */
    suspend fun callService(
        domain: String,
        service: String,
        entityId: String? = null,
        data: Map<String, Any> = emptyMap()
    ): Boolean {
        val id = messageId.getAndIncrement()
        val deferred = CompletableDeferred<JSONObject>()
        pendingRequests[id] = deferred

        val serviceData = JSONObject(data).apply {
            entityId?.let { put("entity_id", it) }
        }

        val message = JSONObject().apply {
            put("id", id)
            put("type", "call_service")
            put("domain", domain)
            put("service", service)
            put("service_data", serviceData)
        }

        webSocket?.send(message.toString())

        return try {
            withTimeout(10000) {
                val result = deferred.await()
                result.optBoolean("success", false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Service call timeout", e)
            false
        }
    }

    /**
     * Toggle une entite (light, switch, etc.)
     */
    suspend fun toggleEntity(entityId: String): Boolean {
        val domain = entityId.substringBefore(".")
        return callService(domain, "toggle", entityId)
    }

    fun disconnect() {
        webSocket?.close(1000, "User disconnected")
        webSocket = null
        _connectionState.value = ConnectionState.DISCONNECTED
        scope.cancel()
    }
}

/**
 * Representation d'une entite Home Assistant
 */
data class HAEntity(
    val entityId: String,
    val state: String,
    val friendlyName: String,
    val attributes: JSONObject
) {
    val domain: String get() = entityId.substringBefore(".")
    val isOn: Boolean get() = state == "on"
    val isUnavailable: Boolean get() = state == "unavailable"
}
