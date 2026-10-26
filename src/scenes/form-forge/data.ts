/**
 * Form Forge: the fixed world the scene lives in (the checkout form, the basket, sample entries and
 * hostile test input). Everything here is plain data. Nothing is decided here: every verdict shown
 * in the scene comes from a function the learner wrote.
 *
 * All sample values are obviously fake: card 4242 4242 4242 4242 is a published test number, phone
 * numbers use the 555-01xx fictional range, addresses and emails use reserved example domains.
 */

export type FieldType = "text" | "email" | "tel" | "password" | "textarea" | "select";
export type SectionId = "account" | "shipping" | "payment";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  section: SectionId;
  required: boolean;
  placeholder?: string;
  autoComplete?: string;
}

/** The blueprint handed to the learner's functions (requiredFields(fields), countByType(fields)...). */
export const FIELDS: FieldDef[] = [
  { name: "fullName", label: "Full name", type: "text", section: "account", required: true, placeholder: "Ada Lovelace" },
  { name: "email", label: "Email", type: "email", section: "account", required: true, placeholder: "ada@example.com" },
  { name: "username", label: "Username", type: "text", section: "account", required: true, placeholder: "ada_l" },
  { name: "password", label: "Password", type: "password", section: "account", required: true, placeholder: "10+ characters" },
  { name: "confirm", label: "Confirm password", type: "password", section: "account", required: true, placeholder: "Type it again" },
  { name: "phone", label: "Phone", type: "tel", section: "shipping", required: false, placeholder: "555 010 0199" },
  { name: "address", label: "Street address", type: "text", section: "shipping", required: true, placeholder: "12 High Street" },
  { name: "city", label: "City", type: "text", section: "shipping", required: true, placeholder: "London" },
  { name: "postcode", label: "Postcode", type: "text", section: "shipping", required: true, placeholder: "SW1A 1AA" },
  { name: "country", label: "Country", type: "select", section: "shipping", required: true },
  { name: "note", label: "Delivery note", type: "textarea", section: "shipping", required: false, placeholder: "Leave with the neighbour" },
  { name: "cardNumber", label: "Card number", type: "text", section: "payment", required: true, placeholder: "4242 4242 4242 4242" },
  { name: "expiry", label: "Expiry (MM/YY)", type: "text", section: "payment", required: true, placeholder: "12/30" },
  { name: "cvc", label: "CVC", type: "text", section: "payment", required: true, placeholder: "123" },
];

export const FIELD_BY_NAME: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.name, f]));

export const SECTIONS: { id: SectionId; title: string; blurb: string }[] = [
  { id: "account", title: "Account", blurb: "who you are" },
  { id: "shipping", title: "Shipping", blurb: "where it goes" },
  { id: "payment", title: "Payment", blurb: "test mode · fake card" },
];

export const COUNTRIES: { code: string; label: string }[] = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
];

export type Values = Record<string, string>;

export const EMPTY_VALUES: Values = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  confirm: "",
  phone: "",
  address: "",
  city: "",
  postcode: "",
  country: "US",
  note: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

export interface Sample {
  id: string;
  label: string;
  hint: string;
  values: Values;
}

export const SAMPLES: Sample[] = [
  {
    id: "tidy",
    label: "Tidy",
    hint: "A clean, valid order",
    values: {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      username: "ada_l",
      password: "Tr0ub4dor&3",
      confirm: "Tr0ub4dor&3",
      phone: "(555) 010-0199",
      address: "12 High Street",
      city: "London",
      postcode: "SW1A 1AA",
      country: "GB",
      note: "Leave with the neighbour",
      cardNumber: "4242 4242 4242 4242",
      expiry: "12/30",
      cvc: "123",
    },
  },
  {
    id: "messy",
    label: "Messy",
    hint: "Valid once cleaned up",
    values: {
      fullName: "  ada    LOVELACE ",
      email: " Ada@Example.COM ",
      username: "ada_l",
      password: "Correct horse battery 9!",
      confirm: "Correct horse battery 9!",
      phone: "+1 555.010.0199",
      address: "  12   High Street ",
      city: "lONDON",
      postcode: "sw1a1aa",
      country: "GB",
      note: "Pay with 4242 4242 4242 4242 please",
      cardNumber: "4242-4242-4242-4242",
      expiry: " 12 / 30 ",
      cvc: "123",
    },
  },
  {
    id: "broken",
    label: "Broken",
    hint: "Everything is wrong",
    values: {
      fullName: "",
      email: "ada@",
      username: "admin",
      password: "pass",
      confirm: "pasx",
      phone: "12",
      address: "",
      city: "",
      postcode: "123",
      country: "GB",
      note: "",
      cardNumber: "4242 4242 4242 4241",
      expiry: "01/20",
      cvc: "1",
    },
  },
];

export interface Item {
  sku: string;
  name: string;
  priceCents: number;
  qty: number;
  addOns: { sku: string; name: string; priceCents: number }[];
}

/** The basket (prices in cents). The server's catalogue in lesson 13 prices the same SKUs. */
export const BASE_ITEMS: Item[] = [
  { sku: "KB-01", name: "Mechanical keyboard", priceCents: 8900, qty: 1, addOns: [{ sku: "WR-02", name: "Wrist rest", priceCents: 1500 }] },
  { sku: "MS-07", name: "Wireless mouse", priceCents: 2950, qty: 2, addOns: [] },
  { sku: "CB-12", name: "USB-C cable", priceCents: 1200, qty: 3, addOns: [{ sku: "WR-02", name: "Wrist rest", priceCents: 1500 }] },
];

export const MAX_INPUT = 5000;

// ───────────────────────── fuzzing ─────────────────────────

export interface FuzzInput {
  id: string;
  label: string;
  text: string;
}

/** Hostile text. The "regex bomb" is short on purpose: just long enough to expose nested quantifiers. */
export const FUZZ_TEXT: FuzzInput[] = [
  { id: "emoji", label: "emoji", text: "👩\u200d👩\u200d👧\u200d👦 café 😀🏳️\u200d🌈 𝕏" },
  { id: "rtl", label: "right-to-left", text: "مرحبا بالعالم \u202e evil \u2066x\u2069 שלום" },
  { id: "script", label: "script tag", text: '<script>alert("xss")</script><img src=x onerror=alert(1)>' },
  { id: "huge", label: "20,000 letters", text: "A".repeat(20000) },
  { id: "digits", label: "5,000 digits", text: "9".repeat(5000) },
  { id: "bomb", label: "regex bomb", text: "a".repeat(24) + "!" },
  { id: "space", label: "only whitespace", text: " \t\n\r\u00a0\u2003 " },
  { id: "control", label: "control chars", text: "\u0000\u0001\u001f\u007f\ufeff\u200b" },
  { id: "proto", label: "__proto__", text: "__proto__" },
  { id: "ctor", label: "constructor", text: "constructor" },
  { id: "jsonProto", label: "hostile JSON", text: '{"__proto__":{"admin":true},"email":"a@b.co","constructor":{"x":1}}' },
  { id: "deep", label: "deep brackets", text: "[".repeat(5000) },
  { id: "sql", label: "SQL-ish", text: "Robert'); DROP TABLE Students;--" },
  { id: "digitsU", label: "other digits", text: "٣٤٥ ４５６ ①②③" },
];

/** Values of the wrong type entirely. */
export const FUZZ_TYPES: { id: string; label: string; make: () => unknown }[] = [
  { id: "null", label: "null", make: () => null },
  { id: "undefined", label: "undefined", make: () => undefined },
  { id: "number", label: "a number", make: () => 42 },
  { id: "nan", label: "NaN", make: () => NaN },
  { id: "bool", label: "a boolean", make: () => true },
  { id: "object", label: "an object", make: () => ({ a: 1 }) },
  { id: "array", label: "an array", make: () => ["x", 1, null] },
];
