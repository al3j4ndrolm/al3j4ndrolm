package com.facilis.agent

/** Provider-neutral conversation model. Each [Llm] maps it to its own wire format. */
public sealed interface Message {
    public data class User(val text: String) : Message
    public data class Assistant(val text: String?, val toolCalls: List<ToolCall> = emptyList()) : Message
    public data class ToolResult(val callId: String, val name: String, val content: String, val isError: Boolean = false) : Message
}

/** A function call requested by the model. [arguments] is the raw JSON object string. */
public data class ToolCall(val id: String, val name: String, val arguments: String)

/** Anything that can answer a chat turn: a cloud API, your backend proxy, or an on-device model. */
public fun interface Llm {
    public suspend fun complete(system: String?, messages: List<Message>, tools: List<Tool>): Message.Assistant
}

/** Thrown when the provider returns a non-retryable error or retries are exhausted. */
public class LlmException(public val status: Int, message: String) : RuntimeException(message)
