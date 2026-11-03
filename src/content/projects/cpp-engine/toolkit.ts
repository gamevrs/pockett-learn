import { cpp } from "./util.ts";

/**
 * The support code every lesson of "Lantern Bay" builds on: the project's hidden `prelude` (Project.prelude), compiled in
 * front of the learner's file and never shown in the editor. It is plain C++20 and standard library only:
 *
 *  - the standard headers the course uses (so a lesson never fails on a forgotten #include; lessons still teach and
 *    write their own #include lines, which are harmless repeats);
 *  - scene("key", value)   prints one `@scene {json}` line the board reads (numbers, bool, strings, vectors, maps with
 *                          string keys, std::optional, pairs; anything else prints as null);
 *  - typeName<T>()         the readable name of a type, e.g. typeName<int>() is "int", typeName<std::string>() is
 *                          "std::string". It is how the board can show which types a template was built for.
 */

export const ENGINE_PRELUDE = cpp`// ───── Provided by pockett: the harbour office's helpers (leave this block exactly as it is) ─────
// scene("name", value);   sends a value to the board (one line starting with @scene).
// typeName<T>();          the readable name of a type: typeName<int>() gives "int".
#include <algorithm>
#include <array>
#include <concepts>
#include <cstdio>
#include <cstring>
#include <deque>
#include <functional>
#include <iostream>
#include <list>
#include <map>
#include <memory>
#include <numeric>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <string_view>
#include <type_traits>
#include <unordered_map>
#include <utility>
#include <variant>
#include <vector>

namespace board_detail {
inline std::string quote(std::string_view text) {
    std::string out = "\"";
    for (unsigned char c : text) {
        if (c == '"') out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else if (c < 0x20) {
            char code[8];
            std::snprintf(code, sizeof code, "\\u%04x", c);
            out += code;
        } else out += static_cast<char>(c);
    }
    return out + "\"";
}

template <class T>
concept Keyed = requires { typename T::mapped_type; };

template <class T>
std::string json(const T& v) {
    if constexpr (std::is_same_v<T, bool>) {
        return v ? "true" : "false";
    } else if constexpr (std::is_same_v<T, char>) {
        return quote(std::string(1, v));
    } else if constexpr (std::is_integral_v<T>) {
        return std::to_string(v);
    } else if constexpr (std::is_floating_point_v<T>) {
        if (v - v != 0) return "null";
        char text[40];
        std::snprintf(text, sizeof text, "%.15g", static_cast<double>(v));
        return text;
    } else if constexpr (std::is_convertible_v<const T&, std::string_view>) {
        return quote(std::string_view(v));
    } else if constexpr (Keyed<T>) {
        std::string out = "{";
        for (const auto& [name, value] : v) {
            if (out.size() > 1) out += ", ";
            out += quote(name) + ": " + json(value);
        }
        return out + "}";
    } else if constexpr (requires { v.begin(); v.end(); }) {
        std::string out = "[";
        for (const auto& item : v) {
            if (out.size() > 1) out += ", ";
            out += json(item);
        }
        return out + "]";
    } else if constexpr (requires { v.has_value(); *v; }) {
        return v.has_value() ? json(*v) : std::string("null");
    } else if constexpr (requires { v.first; v.second; }) {
        return "[" + json(v.first) + ", " + json(v.second) + "]";
    } else {
        return "null";
    }
}
}  // namespace board_detail

template <class T>
void scene(std::string_view key, const T& value) {
    std::string line = "@scene {" + board_detail::quote(key) + ": " + board_detail::json(value) + "}\n";
    std::fputs(line.c_str(), stdout);
}

template <class T>
std::string typeName() {
    std::string s = __PRETTY_FUNCTION__;
    const auto at = s.find("T = ");
    if (at == std::string::npos) return "?";
    const auto end = s.find_first_of(";]", at);
    s = s.substr(at + 4, end == std::string::npos ? std::string::npos : end - at - 4);
    const std::pair<const char*, const char*> swaps[] = {
        {"std::__cxx11::basic_string<char>", "std::string"}, {"long long unsigned int", "unsigned long long"},
        {"long long int", "long long"}, {"long unsigned int", "unsigned long"}, {"long int", "long"}, {"short int", "short"}, {"unsigned int", "unsigned"}};
    for (const auto& [from, to] : swaps) {
        for (auto pos = s.find(from); pos != std::string::npos; pos = s.find(from, pos + std::strlen(to))) s.replace(pos, std::strlen(from), to);
    }
    return s;
}`;
