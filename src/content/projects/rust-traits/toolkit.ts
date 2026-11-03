import { rs } from "./util.ts";

/**
 * The hidden prelude of Drone Fleet (Project.prelude): compiled in front of the learner's file, never
 * shown in the editor, with compiler line numbers shifted back to the learner's own.
 *
 * It gives the learner `scene("key", value)` (one `@scene {json}` line for the fleet board) and a tiny
 * `Json` builder: `Json::new().with("key", value)`. Values may be integers, floats, bool, char, &str,
 * String, Option, Vec, arrays and slices of those (and of Json), and string-keyed maps.
 * Names it uses (ToJson, quote, Json, scene) are kept away from the names the course teaches.
 */
export const FLEET_TOOLKIT = rs`#![allow(dead_code)]
// Provided by pockett (not shown in your editor): scene(...) and Json, used to send values to the fleet board.
trait ToJson {
    fn to_json(&self) -> String;
}

fn quote(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

impl ToJson for i32 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for i64 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for u8 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for u32 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for u64 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for usize { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for bool { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for f64 {
    fn to_json(&self) -> String {
        if self.is_finite() { self.to_string() } else { "null".to_string() }
    }
}
impl ToJson for char { fn to_json(&self) -> String { quote(&self.to_string()) } }
impl ToJson for str { fn to_json(&self) -> String { quote(self) } }
impl ToJson for String { fn to_json(&self) -> String { quote(self) } }
impl<T: ToJson + ?Sized> ToJson for &T { fn to_json(&self) -> String { (**self).to_json() } }
impl<T: ToJson> ToJson for [T] {
    fn to_json(&self) -> String {
        let parts: Vec<String> = self.iter().map(|item| item.to_json()).collect();
        format!("[{}]", parts.join(", "))
    }
}
impl<T: ToJson> ToJson for Vec<T> { fn to_json(&self) -> String { self.as_slice().to_json() } }
impl<T: ToJson, const N: usize> ToJson for [T; N] { fn to_json(&self) -> String { self.as_slice().to_json() } }
impl<T: ToJson> ToJson for Option<T> {
    fn to_json(&self) -> String {
        match self {
            Some(value) => value.to_json(),
            None => "null".to_string(),
        }
    }
}
impl<K: AsRef<str>, V: ToJson> ToJson for std::collections::BTreeMap<K, V> {
    fn to_json(&self) -> String {
        let parts: Vec<String> = self.iter().map(|(key, value)| format!("{}: {}", quote(key.as_ref()), value.to_json())).collect();
        format!("{{{}}}", parts.join(", "))
    }
}
impl<K: AsRef<str>, V: ToJson> ToJson for std::collections::HashMap<K, V> {
    fn to_json(&self) -> String {
        let parts: Vec<String> = self.iter().map(|(key, value)| format!("{}: {}", quote(key.as_ref()), value.to_json())).collect();
        format!("{{{}}}", parts.join(", "))
    }
}

struct Json(Vec<String>);

impl Json {
    fn new() -> Json {
        Json(Vec::new())
    }
    fn with(mut self, key: &str, value: impl ToJson) -> Json {
        self.0.push(format!("{}: {}", quote(key), value.to_json()));
        self
    }
}

impl ToJson for Json {
    fn to_json(&self) -> String {
        format!("{{{}}}", self.0.join(", "))
    }
}

fn scene(key: &str, value: impl ToJson) {
    println!("@scene {{{}: {}}}", quote(key), value.to_json());
}
`;
