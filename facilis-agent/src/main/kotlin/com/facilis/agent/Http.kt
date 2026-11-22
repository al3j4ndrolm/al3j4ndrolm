package com.facilis.agent

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.runInterruptible
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Minimal JSON POST over the platform's HttpURLConnection (OkHttp-backed on Android),
 * so the library adds no networking dependency. Keep-alive pooling is on by default.
 * Retries 408/429/5xx and I/O errors with exponential backoff, honoring Retry-After.
 */
internal suspend fun postJson(
    url: String,
    headers: Map<String, String>,
    body: JSONObject,
    timeoutMs: Int,
    maxRetries: Int,
): JSONObject {
    val payload = body.toString().toByteArray()
    var attempt = 0
    while (true) {
        val (status, text, retryAfter) = try {
            runInterruptible(Dispatchers.IO) { send(url, headers, payload, timeoutMs) }
        } catch (e: IOException) {
            if (attempt++ >= maxRetries) throw e
            delay(backoff(attempt, null))
            continue
        }
        if (status in 200..299) return JSONObject(text)
        val retryable = status == 408 || status == 429 || status >= 500
        if (!retryable || attempt++ >= maxRetries) throw LlmException(status, "HTTP $status: ${text.take(500)}")
        delay(backoff(attempt, retryAfter))
    }
}

private fun send(url: String, headers: Map<String, String>, payload: ByteArray, timeoutMs: Int): Triple<Int, String, Long?> {
    val conn = URL(url).openConnection() as HttpURLConnection
    try {
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = timeoutMs
        conn.readTimeout = timeoutMs
        conn.setFixedLengthStreamingMode(payload.size)
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
        conn.outputStream.use { it.write(payload) }
        val status = conn.responseCode
        val stream = if (status >= 400) conn.errorStream else conn.inputStream
        val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        val retryAfter = conn.getHeaderField("Retry-After")?.toLongOrNull()?.times(1000)
        return Triple(status, text, retryAfter)
    } finally {
        // Don't disconnect(): that would kill the pooled keep-alive socket.
        conn.inputStream.runCatching { close() }
    }
}

private fun backoff(attempt: Int, retryAfterMs: Long?): Long =
    retryAfterMs?.coerceAtMost(30_000) ?: (250L shl (attempt - 1)).coerceAtMost(8_000)
