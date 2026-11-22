package com.facilis.agent

import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import kotlin.coroutines.cancellation.CancellationException

/**
 * A tool-calling agent in one line:
 *
 * ```
 * val agent = Agent(Claude(apiKey)) {
 *     system = "You help users of a coffee app."
 *     tool("order", "Order a drink") {
 *         string("drink", oneOf = listOf("latte", "espresso"))
 *         run { cart.add(it.string("drink")) }
 *     }
 * }
 * val reply = agent("Get me a latte")
 * ```
 *
 * Thread-safe: concurrent calls run one after another on the same memory.
 */
public class Agent(private val llm: Llm, configure: AgentBuilder.() -> Unit = {}) {
    private val config = AgentBuilder().apply(configure)
    private val tools: Map<String, Tool> = config.tools.associateBy { it.name }
    private val toolList = config.tools.toList()
    private val history = ArrayList<Message>()
    private val lock = Mutex()

    /** Snapshot of the conversation so far. */
    public val messages: List<Message> get() = history.toList()

    /** Sends [prompt], runs every tool the model asks for, and returns the final answer. */
    public suspend operator fun invoke(prompt: String, onEvent: ((AgentEvent) -> Unit)? = null): String =
        lock.withLock { loop(prompt, onEvent) }

    /** Forgets the conversation. Tools and system prompt stay. */
    public suspend fun reset(): Unit = lock.withLock { history.clear() }

    private suspend fun loop(prompt: String, onEvent: ((AgentEvent) -> Unit)?): String {
        val start = history.size
        history += Message.User(prompt)
        try {
            repeat(config.maxSteps) {
                trim()
                val reply = llm.complete(config.system, history, toolList)
                history += reply
                if (reply.toolCalls.isEmpty()) return reply.text.orEmpty()

                reply.toolCalls.forEach { onEvent?.invoke(AgentEvent.ToolStarted(it)) }
                // Independent calls run in parallel: total latency = slowest tool, not the sum.
                val results = coroutineScope { reply.toolCalls.map { async { execute(it) } }.awaitAll() }
                results.forEach { onEvent?.invoke(AgentEvent.ToolFinished(it)) }
                history += results
            }
            throw IllegalStateException("Agent stopped after ${config.maxSteps} steps without a final answer")
        } catch (e: Throwable) {
            // Roll back the failed turn so memory never holds a dangling tool call.
            while (history.size > start) history.removeAt(history.lastIndex)
            throw e
        }
    }

    private suspend fun execute(call: ToolCall): Message.ToolResult {
        val tool = tools[call.name]
            ?: return Message.ToolResult(call.id, call.name, "Error: unknown tool '${call.name}'", isError = true)
        return try {
            val args = Args(if (call.arguments.isBlank()) JSONObject() else JSONObject(call.arguments))
            val value = withTimeout(config.toolTimeoutMs) { tool.handler(args) }
            Message.ToolResult(call.id, call.name, encodeResult(value))
        } catch (e: CancellationException) {
            if (e is kotlinx.coroutines.TimeoutCancellationException) {
                Message.ToolResult(call.id, call.name, "Error: timed out after ${config.toolTimeoutMs} ms", isError = true)
            } else throw e
        } catch (e: Exception) {
            // Let the model see the error and recover instead of crashing the app.
            Message.ToolResult(call.id, call.name, "Error: ${e.message ?: e::class.simpleName}", isError = true)
        }
    }

    /** Keeps the last [AgentBuilder.memory] user turns, cutting only at user-message boundaries. */
    private fun trim() {
        var seen = 0
        for (i in history.indices.reversed()) {
            if (history[i] is Message.User && ++seen > config.memory) {
                history.subList(0, i + 1).clear()
                return
            }
        }
    }
}

public sealed interface AgentEvent {
    public data class ToolStarted(val call: ToolCall) : AgentEvent
    public data class ToolFinished(val result: Message.ToolResult) : AgentEvent
}

@AgentDsl
public class AgentBuilder internal constructor() {
    /** Instructions sent with every request. */
    public var system: String? = null
    /** Max model round-trips per prompt. Guards against tool loops. */
    public var maxSteps: Int = 8
    /** How many past user turns to keep. Smaller = faster and cheaper requests. */
    public var memory: Int = 10
    /** Per-tool time limit. */
    public var toolTimeoutMs: Long = 15_000

    internal val tools = mutableListOf<Tool>()

    public fun tool(name: String, description: String, block: ToolBuilder.() -> Unit) {
        tools += ToolBuilder(name, description).apply(block).build()
    }
}
