package com.facilis.agent

import org.json.JSONArray
import org.json.JSONObject

/** A Kotlin function the model may call. Build one with the `tool(...) { }` DSL inside `Agent { }`. */
public class Tool internal constructor(
    public val name: String,
    public val description: String,
    internal val params: List<Param>,
    internal val handler: suspend (Args) -> Any?,
) {
    /** JSON Schema of the arguments, shared by every provider. */
    public val schema: JSONObject by lazy {
        val props = JSONObject()
        val required = JSONArray()
        params.forEach { p ->
            props.put(p.name, JSONObject().apply {
                put("type", p.type)
                put("description", p.description)
                p.enum?.let { put("enum", JSONArray(it)) }
                if (p.type == "array") put("items", JSONObject().put("type", "string"))
            })
            if (p.required) required.put(p.name)
        }
        JSONObject().put("type", "object").put("properties", props).put("required", required)
    }
}

internal class Param(
    val name: String,
    val type: String,
    val description: String,
    val required: Boolean,
    val enum: List<String>? = null,
)

@DslMarker
internal annotation class AgentDsl

@AgentDsl
public class ToolBuilder internal constructor(private val name: String, private val description: String) {
    private val params = mutableListOf<Param>()
    private var handler: (suspend (Args) -> Any?)? = null

    public fun string(name: String, description: String = "", required: Boolean = true, oneOf: List<String>? = null) {
        params += Param(name, "string", description, required, oneOf)
    }
    public fun int(name: String, description: String = "", required: Boolean = true) {
        params += Param(name, "integer", description, required)
    }
    public fun number(name: String, description: String = "", required: Boolean = true) {
        params += Param(name, "number", description, required)
    }
    public fun bool(name: String, description: String = "", required: Boolean = true) {
        params += Param(name, "boolean", description, required)
    }
    public fun strings(name: String, description: String = "", required: Boolean = true) {
        params += Param(name, "array", description, required)
    }

    /** What the tool does. Return anything: String, Number, Map, List, JSONObject, or Unit. */
    public fun run(block: suspend (Args) -> Any?) {
        handler = block
    }

    internal fun build(): Tool {
        require(NAME.matches(name)) { "Tool name '$name' must match ${NAME.pattern}" }
        return Tool(name, description, params.toList(), handler ?: error("tool '$name' has no run { }"))
    }

    private companion object {
        val NAME = Regex("^[a-zA-Z0-9_-]{1,64}$")
    }
}

/** Typed access to the arguments the model sent. */
public class Args internal constructor(public val json: JSONObject) {
    public fun string(key: String): String = json.getString(key)
    public fun int(key: String): Int = json.getInt(key)
    public fun long(key: String): Long = json.getLong(key)
    public fun double(key: String): Double = json.getDouble(key)
    public fun bool(key: String): Boolean = json.getBoolean(key)
    public fun strings(key: String): List<String> = json.getJSONArray(key).let { a -> List(a.length()) { a.getString(it) } }

    public fun stringOrNull(key: String): String? = if (json.isNull(key)) null else json.optString(key)
    public fun intOrNull(key: String): Int? = if (json.isNull(key)) null else json.optInt(key)
    public fun doubleOrNull(key: String): Double? = if (json.isNull(key)) null else json.optDouble(key)
    public fun boolOrNull(key: String): Boolean? = if (json.isNull(key)) null else json.optBoolean(key)

    override fun toString(): String = json.toString()
}

/** Turns whatever a tool returned into the text the model reads. */
internal fun encodeResult(value: Any?): String = when (value) {
    null, Unit -> "ok"
    is String -> value
    is JSONObject, is JSONArray -> value.toString()
    is Map<*, *> -> JSONObject(value).toString()
    is Collection<*> -> JSONArray(value).toString()
    else -> value.toString()
}
