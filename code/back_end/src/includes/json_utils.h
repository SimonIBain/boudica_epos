#ifndef JSON_UTILS_H
#define JSON_UTILS_H
#pragma once

#include <string>
#include <nlohmann/json.hpp>

/** Parses a pgresultToJson()-shaped response and returns "the row" as a single JSON
 * object, regardless of whether pgresultToJson emitted a bare object (1-row shape) or
 * an array (>1-row shape) — callers that only ever want the first/only row don't need
 * to care which. Returns an empty object on a parse failure or an empty array. */
inline nlohmann::json json_row(const std::string& s) {
    nlohmann::json j = nlohmann::json::parse(s, nullptr, false);
    if (j.is_discarded()) { return nlohmann::json::object(); }
    if (j.is_array()) { return j.empty() ? nlohmann::json::object() : j[0]; }
    if (j.is_object()) { return j; }
    return nlohmann::json::object();
}

/** Same normalization as json_row(std::string), but for a value that's already been
 * parsed (e.g. a nested field pulled out of a larger nlohmann::json tree) rather than raw
 * text. */
inline nlohmann::json json_row(const nlohmann::json& j) {
    if (j.is_array()) { return j.empty() ? nlohmann::json::object() : j[0]; }
    if (j.is_object()) { return j; }
    return nlohmann::json::object();
}

/** Same normalization as json_row(), but for callers that want to iterate every row —
 * always returns an array (a single-object result becomes a one-element array). */
inline nlohmann::json json_rows(const std::string& s) {
    nlohmann::json j = nlohmann::json::parse(s, nullptr, false);
    if (j.is_discarded()) { return nlohmann::json::array(); }
    if (j.is_array()) { return j; }
    if (j.is_object()) { return nlohmann::json::array({j}); }
    return nlohmann::json::array();
}

/** Parses `s` for embedding as a nested value in another nlohmann::json object/array. A
 * failed parse (nlohmann::json::parse's non-throwing form returns a "discarded" sentinel
 * value, which is not valid to serialize — dumping a JSON tree containing one throws) is
 * turned into a plain JSON string holding the raw text instead, so a malformed upstream
 * response (e.g. an HTML error page from a misbehaving proxy) degrades to a visible string
 * rather than breaking the whole response. */
inline nlohmann::json json_parse_or_raw(const std::string& s) {
    nlohmann::json j = nlohmann::json::parse(s, nullptr, false);
    if (j.is_discarded()) { return nlohmann::json(s); }
    return j;
}

/** Reads a string field out of a JSON object, defaulting to "" if the object doesn't
 * have that key, isn't an object, or the value is null — matching the old JSON<>
 * parser's operator[] default-empty-string behavior. Non-string, non-null values are
 * dumped as text (defensive fallback; every DB-derived value is a JSON string by
 * construction, so this shouldn't normally trigger). */
inline std::string json_str(const nlohmann::json& j, const std::string& key) {
    if (!j.is_object()) { return ""; }
    auto it = j.find(key);
    if (it == j.end() || it->is_null()) { return ""; }
    if (it->is_string()) { return it->get<std::string>(); }
    return it->dump();
}

#endif
