import { cpp } from "./util.ts";

/**
 * The support code every lesson of "Provenance Lab" builds on: the includes the course uses, plus the
 * provided "bench camera" block. Both form the project's hidden `prelude` (Project.prelude, cpp-memory.ts): compiled
 * in front of the learner's file and never shown in the editor. Lesson 1's starter lists what it provides in a
 * comment and repeats the three plain includes, so the learner's own file starts at those includes.
 *
 * What the block does (all of it plain C++20, standard library only):
 *  - scene(key, value)   prints one `@scene {json}` line (same helper as Reactor Core).
 *  - Lab lab;            the first line of main. Opens the audit (global operator new / delete are
 *                        replaced while main runs, so every block the program takes from the heap is
 *                        counted) and closes it when main ends, reporting leaks as the `audit` key.
 *  - peek(name, value)   notes one variable for the next photo. Copies what it needs right away, so it
 *                        is always safe, and never dereferences the learner's pointers.
 *  - snap(caption)       takes the photo: prints a `shotN` key holding the peeked variables, the live
 *                        heap blocks, the logbook lines since the last photo and the running counters.
 *  - trace(kind, who)    one line in the lab's logbook (ctor, dtor, copy, move, assign-copy,
 *                        assign-move, or any note).
 *  - tally()             running totals, so a lesson can measure what a stretch of code did.
 *
 * Addresses are normalised so every run draws the same picture: stack addresses are shown relative to
 * the Lab object, heap addresses by order of allocation, so "who points where" is real but nothing
 * depends on ASLR.
 *
 * Scene keys (for the board and the checks):
 *   shot1, shot2, ...  { cap, seq, e:[entry], hp:[block], ev:[event], evx, c:{al,fr,lv,by,pk,bf}, lean }
 *     entry: { n, fr, ty, sz, a, rg(0 stack,1 heap,2 static), k(val|ptr|own|vec|arr|obj), v, to, tg(0..3), tb, tf,
 *              pc, cp, pt, r(owner|borrowed), len, cap, es, vs:[text] }
 *     block: { id, sz, a, st(1 live,0 freed), h:[ids this block points at] }
 *     event: [kind, who, seq, extra?]
 *   audit  { al, fr, lv, by, pk, bf, leaks:[{id,sz}], ct, dt, cp, mv, shots, tail:[event], full? }
 */

export const LAB_INCLUDES = cpp`#include <iostream>
#include <string>
#include <vector>`;

export const LAB_TOOLKIT = cpp`// ───── Provided by pockett: the lab's bench camera (leave this block exactly as it is) ─────
// Lab lab;                 the first line of main: opens the audit and closes it when main ends.
// scene("name", value);    sends a value to the board (one line starting with @scene).
// peek("name", variable);  puts a variable on the next photo. It never changes your variable.
// snap("caption");         takes the photo of everything you peeked since the last snap.
// trace("kind", "who");    adds one line to the lab's logbook.
// tally();                 running totals: constructions, destructions, copies, moves, allocations.
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <memory>
#include <new>
#include <streambuf>
#include <string_view>
#include <type_traits>
#include <utility>

namespace lab_detail {

// ── text for the board ──
inline std::string quote(const std::string& text) {
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
inline std::string json(bool v) { return v ? "true" : "false"; }
inline std::string json(char v) { return quote(std::string(1, v)); }
inline std::string json(const char* v) { return quote(v); }
inline std::string json(const std::string& v) { return quote(v); }
template <class T>
    requires(std::is_integral_v<T> && !std::is_same_v<T, bool> && !std::is_same_v<T, char>)
std::string json(T v) { return std::to_string(v); }
template <class T>
    requires std::is_floating_point_v<T>
std::string json(T v) {
    if (v - v != 0) return "null";
    char text[40];
    std::snprintf(text, sizeof text, "%.15g", static_cast<double>(v));
    return text;
}
template <class T>
std::string json(const std::vector<T>& list) {
    std::string out = "[";
    for (const auto& item : list) {
        if (out.size() > 1) out += ", ";
        out += json(item);
    }
    return out + "]";
}
template <class Map>
    requires requires { typename Map::mapped_type; }
std::string json(const Map& map) {
    std::string out = "{";
    for (const auto& [name, value] : map) {
        if (out.size() > 1) out += ", ";
        out += quote(name) + ": " + json(value);
    }
    return out + "}";
}

// ── the audit: every block taken with new while main runs ──
struct Block {
    std::uintptr_t base;
    std::size_t size;
    std::uintptr_t fake;
    unsigned id;
    bool live;
};
constexpr std::size_t kMaxBlocks = 3000;
constexpr std::size_t kBudget = 78000;
inline Block g_blocks[kMaxBlocks];
inline std::size_t g_nblocks = 0;
inline bool g_armed = false;
inline bool g_busy = false;
inline bool g_full = false;
inline unsigned g_next_id = 1;
inline unsigned g_seq = 0;
inline unsigned g_shots = 0;
inline std::uintptr_t g_fake_next = 0x00601000;
inline std::uintptr_t g_stack_anchor = 0;
inline char g_static_anchor = 0;
inline std::size_t g_allocs = 0, g_frees = 0, g_live_bytes = 0, g_peak_bytes = 0, g_bad_frees = 0;
inline int g_ctor = 0, g_dtor = 0, g_copy = 0, g_move = 0;
inline std::size_t g_out_bytes = 0, g_ev_dropped = 0;

// Sits between std::cout and the screen and remembers the last character, so a scene line never glues onto an unfinished text line.
class LineTracker : public std::streambuf {
public:
    void attach(std::streambuf* inner) { inner_ = inner; }
    bool mid_line() const { return last_ != 0 && last_ != 10; }

protected:
    int_type overflow(int_type c) override {
        if (traits_type::eq_int_type(c, traits_type::eof())) return traits_type::not_eof(c);
        last_ = traits_type::to_char_type(c);
        return inner_->sputc(last_);
    }
    std::streamsize xsputn(const char* s, std::streamsize n) override {
        if (n > 0) last_ = s[n - 1];
        return inner_->sputn(s, n);
    }
    int sync() override { return inner_->pubsync(); }

private:
    std::streambuf* inner_ = nullptr;
    char last_ = 0;
};
inline LineTracker g_tracker;
inline std::streambuf* g_cout_buf = nullptr;
inline void start_line() {
    if (g_tracker.mid_line()) std::fputc(10, stdout);
}

struct BusyGuard {
    bool prev;
    BusyGuard() : prev(g_busy) { g_busy = true; }
    ~BusyGuard() { g_busy = prev; }
};

inline std::vector<std::string>& entries() { static std::vector<std::string> v; return v; }
inline std::vector<std::string>& events() { static std::vector<std::string> v; return v; }

inline std::string join(const std::vector<std::string>& parts) {
    std::string out;
    for (const auto& p : parts) {
        if (!out.empty()) out += ",";
        out += p;
    }
    return out;
}

inline void emit(const std::string& key, const std::string& body) {
    std::string line = "@scene {" + quote(key) + ": " + body + "}\n";
    g_out_bytes += line.size();
    start_line();
    std::fputs(line.c_str(), stdout);
}

inline void add_event(const std::string& kind, const std::string& who, long extra = -1) {
    if (events().size() >= 60) {
        ++g_ev_dropped;
        return;
    }
    std::string e = "[" + quote(kind) + "," + quote(who) + "," + std::to_string(++g_seq);
    if (extra >= 0) e += "," + std::to_string(extra);
    events().push_back(e + "]");
}

inline void on_alloc(void* p, std::size_t n) {
    if (!g_armed || g_busy || p == nullptr) return;
    BusyGuard guard;
    if (g_nblocks >= kMaxBlocks) {
        g_full = true;
        return;
    }
    Block& b = g_blocks[g_nblocks++];
    b.base = reinterpret_cast<std::uintptr_t>(p);
    b.size = n;
    b.id = g_next_id++;
    b.live = true;
    b.fake = g_fake_next;
    g_fake_next += ((n + 15) & ~static_cast<std::size_t>(15)) + 16;
    ++g_allocs;
    g_live_bytes += n;
    if (g_live_bytes > g_peak_bytes) g_peak_bytes = g_live_bytes;
    add_event("alloc", "#" + std::to_string(b.id), static_cast<long>(n));
}

// false = this was a second delete of a block already given back: the audit stops it
inline bool on_free(void* p) {
    if (!g_armed || g_busy || p == nullptr) return true;
    BusyGuard guard;
    const auto a = reinterpret_cast<std::uintptr_t>(p);
    for (std::size_t i = g_nblocks; i-- > 0;) {
        Block& b = g_blocks[i];
        if (b.base != a) continue;
        if (b.live) {
            b.live = false;
            ++g_frees;
            g_live_bytes -= b.size;
            add_event("free", "#" + std::to_string(b.id), static_cast<long>(b.size));
            return true;
        }
        ++g_bad_frees;
        add_event("double-free", "#" + std::to_string(b.id), static_cast<long>(b.size));
        return false;
    }
    return true;  // taken before the lab opened
}

struct Where {
    int region;  // 0 stack, 1 heap, 2 static, 3 null
    unsigned block;
    bool freed;
    std::uint64_t fake;
};

inline const Block* block_containing(std::uintptr_t a, bool live) {
    for (std::size_t i = g_nblocks; i-- > 0;) {
        const Block& b = g_blocks[i];
        if (b.live != live) continue;
        if (a >= b.base && a < b.base + (b.size ? b.size : 1)) return &b;
    }
    return nullptr;
}

inline Where where(std::uintptr_t a) {
    if (a == 0) return {3, 0, false, 0};
    for (int pass = 0; pass < 2; ++pass) {
        if (const Block* b = block_containing(a, pass == 0)) return {1, b->id, pass == 1, b->fake + (a - b->base)};
    }
    const long long d = static_cast<long long>(a - g_stack_anchor);
    if (g_stack_anchor != 0 && d > -(1LL << 20) && d < (1LL << 20)) return {0, 0, false, static_cast<std::uint64_t>(0x7FFD8000LL + d)};
    const long long s = static_cast<long long>(a - reinterpret_cast<std::uintptr_t>(&g_static_anchor));
    return {2, 0, false, static_cast<std::uint64_t>(0x00404000LL + (s & 0xFFFFF))};
}

// ── describing a variable ──
template <class T> struct is_unique_ptr : std::false_type { using element = void; };
template <class U, class D> struct is_unique_ptr<std::unique_ptr<U, D>> : std::true_type { using element = U; };
template <class T> struct is_vector : std::false_type { using element = void; };
template <class U, class A> struct is_vector<std::vector<U, A>> : std::true_type { using element = U; };

template <class T>
std::string raw_name() {
    std::string s = __PRETTY_FUNCTION__;
    const auto at = s.find("T = ");
    if (at == std::string::npos) return "?";
    auto end = s.find_first_of(";]", at);
    s = s.substr(at + 4, end == std::string::npos ? std::string::npos : end - at - 4);
    const std::pair<const char*, const char*> swaps[] = {
        {"std::__cxx11::basic_string<char>", "std::string"}, {"long long unsigned int", "unsigned long long"},
        {"long long int", "long long"}, {"long unsigned int", "unsigned long"}, {"long int", "long"}, {"short int", "short"}, {"unsigned int", "unsigned"}};
    for (const auto& [from, to] : swaps) {
        for (auto pos = s.find(from); pos != std::string::npos; pos = s.find(from, pos + std::strlen(to))) s.replace(pos, std::strlen(from), to);
    }
    return s;
}

template <class T>
std::string name_of() {
    if constexpr (std::is_const_v<T> && std::is_pointer_v<T>) return name_of<std::remove_const_t<T>>() + " const";
    else if constexpr (std::is_const_v<T>) return "const " + name_of<std::remove_const_t<T>>();
    else if constexpr (std::is_pointer_v<T>) return name_of<std::remove_pointer_t<T>>() + "*";
    else if constexpr (std::is_array_v<T>) return name_of<std::remove_extent_t<T>>() + "[" + std::to_string(std::extent_v<T>) + "]";
    else if constexpr (std::is_same_v<T, std::string>) return "std::string";
    else if constexpr (is_unique_ptr<T>::value) return "std::unique_ptr<" + name_of<typename is_unique_ptr<T>::element>() + ">";
    else if constexpr (is_vector<T>::value) return "std::vector<" + name_of<typename is_vector<T>::element>() + ">";
    else return raw_name<T>();
}

inline std::string hex(std::uint64_t v) {
    char buf[24];
    std::snprintf(buf, sizeof buf, "0x%08llx", static_cast<unsigned long long>(v));
    return buf;
}

inline std::string ptr_text(const void* p) {
    if (p == nullptr) return "nullptr";
    const Where w = where(reinterpret_cast<std::uintptr_t>(p));
    if (w.block != 0) return "-> #" + std::to_string(w.block) + (w.freed ? " (freed)" : "");
    return hex(w.fake);
}

template <class T>
std::string val_text(const T& v) {
    using U = std::remove_cv_t<T>;
    if constexpr (std::is_same_v<U, bool>) return v ? "true" : "false";
    else if constexpr (std::is_same_v<U, char>) return std::string("'") + v + "'";
    else if constexpr (std::is_integral_v<U>) return std::to_string(v);
    else if constexpr (std::is_floating_point_v<U>) {
        char buf[40];
        std::snprintf(buf, sizeof buf, "%.6g", static_cast<double>(v));
        return buf;
    } else if constexpr (std::is_enum_v<U>) return std::to_string(static_cast<long long>(v));
    else if constexpr (std::is_same_v<U, std::string>) return "\"" + (v.size() > 18 ? v.substr(0, 18) + "..." : v) + "\"";
    else if constexpr (std::is_pointer_v<U> && !std::is_function_v<std::remove_pointer_t<U>>) return ptr_text((const void*)v);
    else if constexpr (is_unique_ptr<U>::value) return ptr_text((const void*)v.get());
    else if constexpr (std::is_null_pointer_v<U>) return "nullptr";
    else return "{...}";
}

class Obj {
public:
    Obj& str(const char* k, const std::string& v) { return raw(k, quote(v)); }
    Obj& num(const char* k, long long v) { return raw(k, std::to_string(v)); }
    Obj& raw(const char* k, const std::string& v) {
        if (s_.size() > 1) s_ += ",";
        s_ += "\"";
        s_ += k;
        s_ += "\":";
        s_ += v;
        return *this;
    }
    std::string done() const { return s_ + "}"; }
private:
    std::string s_ = "{";
};

inline std::vector<unsigned>& pending_targets() { static std::vector<unsigned> v; return v; }

inline void add_target(Obj& o, std::uintptr_t t) {
    const Where w = where(t);
    if (w.block != 0) pending_targets().push_back(w.block);
    o.num("to", static_cast<long long>(w.fake)).num("tg", w.region);
    if (w.block != 0) {
        o.num("tb", w.block);
        if (w.freed) o.num("tf", 1);
    }
}

enum class Role { plain, owner, borrowed };

template <class V>
void peek_impl(const char* name, V&& value, Role role, const char* fn) {
    using Ref = std::remove_reference_t<V>;
    using T = std::remove_cv_t<Ref>;
    constexpr bool temp = !std::is_lvalue_reference_v<V>;  // the result of a call: it has no home of its own
    BusyGuard guard;
    const auto addr = reinterpret_cast<std::uintptr_t>(std::addressof(value));
    const Where w = where(addr);
    Obj o;
    o.str("n", name).str("fr", fn).str("ty", name_of<Ref>()).num("sz", sizeof(T)).num("a", temp ? 0 : static_cast<long long>(w.fake)).num("rg", w.region);
    if (temp) o.num("tp", 1);
    if (role == Role::owner) o.str("r", "owner");
    else if (role == Role::borrowed) o.str("r", "borrowed");
    if constexpr (std::is_array_v<T> && std::is_same_v<std::remove_cv_t<std::remove_extent_t<T>>, char>) {
        std::size_t n = 0;
        while (n < sizeof(T) && value[n] != '\0') ++n;
        o.str("k", "val").str("v", "\"" + std::string(value, n) + "\"");
    } else if constexpr (std::is_array_v<T>) {
        using E = std::remove_extent_t<T>;
        std::string vs = "[";
        for (std::size_t i = 0; i < std::extent_v<T> && i < 12; ++i) vs += (i ? "," : "") + quote(val_text(value[i]));
        o.str("k", "arr").num("len", std::extent_v<T>).num("es", sizeof(E)).raw("vs", vs + "]");
    } else if constexpr (std::is_pointer_v<T> && !std::is_function_v<std::remove_pointer_t<T>>) {
        add_target(o, reinterpret_cast<std::uintptr_t>((const void*)value));
        o.str("k", "ptr").str("pt", name_of<std::remove_cv_t<std::remove_pointer_t<T>>>());
        o.num("pc", std::is_const_v<std::remove_pointer_t<T>> ? 1 : 0).num("cp", std::is_const_v<Ref> ? 1 : 0);
    } else if constexpr (is_unique_ptr<T>::value) {
        add_target(o, reinterpret_cast<std::uintptr_t>((const void*)value.get()));
        o.str("k", "own").str("pt", name_of<std::remove_cv_t<typename is_unique_ptr<T>::element>>());
    } else if constexpr (is_vector<T>::value && !std::is_same_v<typename is_vector<T>::element, bool>) {
        add_target(o, reinterpret_cast<std::uintptr_t>((const void*)value.data()));
        std::string vs = "[";
        for (std::size_t i = 0; i < value.size() && i < 12; ++i) vs += (i ? "," : "") + quote(val_text(value[i]));
        o.str("k", "vec").num("len", static_cast<long long>(value.size())).num("cap", static_cast<long long>(value.capacity())).raw("vs", vs + "]");
    } else if constexpr (std::is_arithmetic_v<T> || std::is_enum_v<T> || std::is_same_v<T, std::string>) {
        o.str("k", "val").str("v", val_text(value));
    } else {
        o.str("k", "obj").str("v", "{...}");
    }
    if constexpr (std::is_const_v<Ref>) o.num("cv", 1);
    entries().push_back(o.done());
}

inline void collect_holds(const Block& self, std::vector<unsigned>& out) {
    const std::size_t words = self.size / sizeof(std::uintptr_t) < 32 ? self.size / sizeof(std::uintptr_t) : 32;
    for (std::size_t i = 0; i < words; ++i) {
        std::uintptr_t w = 0;
        std::memcpy(&w, reinterpret_cast<const void*>(self.base + i * sizeof(w)), sizeof w);
        if (w == 0) continue;
        for (std::size_t j = 0; j < g_nblocks; ++j) {
            const Block& c = g_blocks[j];
            if (!c.live || c.base != w || c.id == self.id) continue;
            bool seen = false;
            for (unsigned x : out) seen = seen || x == c.id;
            if (!seen) out.push_back(c.id);
        }
    }
}

inline std::string block_json(const Block& b) {
    std::vector<unsigned> held;
    if (b.live) collect_holds(b, held);
    std::string h;
    for (unsigned x : held) h += (h.empty() ? "" : ",") + std::to_string(x);
    return "{\"id\":" + std::to_string(b.id) + ",\"sz\":" + std::to_string(b.size) + ",\"a\":" + std::to_string(b.fake) + ",\"st\":" + (b.live ? "1" : "0") + ",\"h\":[" + h + "]}";
}

// The photo lists the bays the peeked pointers lead to (and what those hold) first, then the newest others.
inline std::string heap_json() {
    std::vector<char> want(g_nblocks, 0);
    std::vector<unsigned> frontier;
    for (unsigned id : pending_targets()) {
        if (id >= 1 && id <= g_nblocks && g_blocks[id - 1].live && !want[id - 1]) {
            want[id - 1] = 1;
            frontier.push_back(id);
        }
    }
    for (std::size_t k = 0; k < frontier.size() && k < 60; ++k) {
        std::vector<unsigned> held;
        collect_holds(g_blocks[frontier[k] - 1], held);
        for (unsigned c : held) {
            if (!want[c - 1]) {
                want[c - 1] = 1;
                frontier.push_back(c);
            }
        }
    }
    std::size_t shown = frontier.size();
    for (std::size_t i = g_nblocks; i-- > 0 && shown < 30;) {
        if (g_blocks[i].live && !want[i]) {
            want[i] = 1;
            ++shown;
        }
    }
    std::vector<std::string> parts;
    for (std::size_t i = 0; i < g_nblocks; ++i) {
        if (want[i]) parts.push_back(block_json(g_blocks[i]));
    }
    std::vector<char> gone(g_nblocks, 0);
    int freed = 0;
    for (unsigned id : pending_targets()) {
        if (id >= 1 && id <= g_nblocks && !g_blocks[id - 1].live && !gone[id - 1] && freed < 8) {
            gone[id - 1] = 1;
            ++freed;
            parts.push_back(block_json(g_blocks[id - 1]));
        }
    }
    for (std::size_t i = g_nblocks; i-- > 0 && freed < 8;) {
        if (!g_blocks[i].live && !gone[i]) {
            gone[i] = 1;
            ++freed;
            parts.push_back(block_json(g_blocks[i]));
        }
    }
    return join(parts);
}

inline std::string counters() {
    std::size_t live = 0;
    for (std::size_t i = 0; i < g_nblocks; ++i) live += g_blocks[i].live ? 1 : 0;
    return "{\"al\":" + std::to_string(g_allocs) + ",\"fr\":" + std::to_string(g_frees) + ",\"lv\":" + std::to_string(live) + ",\"by\":" + std::to_string(g_live_bytes) +
           ",\"pk\":" + std::to_string(g_peak_bytes) + ",\"bf\":" + std::to_string(g_bad_frees) + "}";
}

inline void open(std::uintptr_t anchor) {
    g_stack_anchor = anchor;
    g_armed = true;
    g_cout_buf = std::cout.rdbuf();
    g_tracker.attach(g_cout_buf);
    std::cout.rdbuf(&g_tracker);
}

inline void close() {
    BusyGuard guard;
    g_armed = false;
    std::string leaks;
    std::size_t count = 0;
    for (std::size_t i = 0; i < g_nblocks; ++i) {
        const Block& b = g_blocks[i];
        if (!b.live) continue;
        ++count;
        if (count <= 20) leaks += (leaks.empty() ? "" : ",") + std::string("{\"id\":") + std::to_string(b.id) + ",\"sz\":" + std::to_string(b.size) + "}";
    }
    std::string out = "{\"al\":" + std::to_string(g_allocs) + ",\"fr\":" + std::to_string(g_frees) + ",\"lv\":" + std::to_string(count) + ",\"by\":" + std::to_string(g_live_bytes) +
                      ",\"pk\":" + std::to_string(g_peak_bytes) + ",\"bf\":" + std::to_string(g_bad_frees) + ",\"leaks\":[" + leaks + "],\"ct\":" + std::to_string(g_ctor) +
                      ",\"dt\":" + std::to_string(g_dtor) + ",\"cp\":" + std::to_string(g_copy) + ",\"mv\":" + std::to_string(g_move) + ",\"shots\":" + std::to_string(g_shots) +
                      ",\"tail\":[" + join(events()) + "]";
    if (g_full) out += ",\"full\":true";
    emit("audit", out + "}");
    std::cout.flush();
    std::cout.rdbuf(g_cout_buf);
}

}  // namespace lab_detail

template <class T>
void scene(std::string_view key, const T& value) {
    lab_detail::BusyGuard guard;
    std::string line = "@scene {" + lab_detail::quote(std::string(key)) + ": " + lab_detail::json(value) + "}\n";
    lab_detail::start_line();
    std::fputs(line.c_str(), stdout);
}

inline constexpr lab_detail::Role OWNER = lab_detail::Role::owner;
inline constexpr lab_detail::Role BORROWED = lab_detail::Role::borrowed;

template <class V>
void peek(const char* name, V&& value, lab_detail::Role role = lab_detail::Role::plain, const char* fn = __builtin_FUNCTION()) {
    lab_detail::peek_impl(name, std::forward<V>(value), role, fn);
}

inline void trace(const char* kind, std::string_view who_text) {
    lab_detail::BusyGuard guard;
    const std::string k = kind;
    const std::string who(who_text);
    if (k == "ctor") ++lab_detail::g_ctor;
    else if (k == "dtor") ++lab_detail::g_dtor;
    else if (k == "copy" || k == "assign-copy") ++lab_detail::g_copy;
    else if (k == "move" || k == "assign-move") ++lab_detail::g_move;
    lab_detail::add_event(k, who);
}

inline void snap(std::string_view caption_text) {
    using namespace lab_detail;
    BusyGuard guard;
    const std::string caption(caption_text);
    ++g_shots;
    const unsigned seq = ++g_seq;
    std::string out = "{\"cap\":" + quote(caption) + ",\"seq\":" + std::to_string(seq);
    if (g_out_bytes < kBudget) {
        out += ",\"e\":[" + join(entries()) + "],\"hp\":[" + heap_json() + "],\"ev\":[" + join(events()) + "]";
        if (g_ev_dropped != 0) out += ",\"evx\":" + std::to_string(g_ev_dropped);
    } else out += ",\"lean\":true";
    out += ",\"c\":" + counters() + "}";
    emit("shot" + std::to_string(g_shots), out);
    entries().clear();
    events().clear();
    pending_targets().clear();
    g_ev_dropped = 0;
}

struct Tally {
    int ctor = 0, dtor = 0, copy = 0, move = 0, alloc = 0, freed = 0;
};
inline Tally tally() {
    return {lab_detail::g_ctor, lab_detail::g_dtor, lab_detail::g_copy, lab_detail::g_move, static_cast<int>(lab_detail::g_allocs), static_cast<int>(lab_detail::g_frees)};
}

class Lab {
public:
    Lab() { lab_detail::open(reinterpret_cast<std::uintptr_t>(this) & ~static_cast<std::uintptr_t>(15)); }
    ~Lab() { lab_detail::close(); }
    Lab(const Lab&) = delete;
    Lab& operator=(const Lab&) = delete;
};

void* operator new(std::size_t size) {
    if (size == 0) size = 1;
    void* p = std::malloc(size);
    if (p == nullptr) throw std::bad_alloc();
    lab_detail::on_alloc(p, size);
    return p;
}
void operator delete(void* p) noexcept {
    if (lab_detail::on_free(p)) std::free(p);
}
void operator delete(void* p, std::size_t) noexcept { operator delete(p); }`;
