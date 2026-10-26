import { cs } from "./util.ts";

/**
 * Lesson 1 carries these provided blocks. The usings and the nullable switch sit above the
 * learner's statements (a `using` must come before any statement); the data and the `Port` helper
 * sit below the types divider.
 */

/** The lines that open the file (above the learner's first statement). */
export const FILE_HEAD = cs`#nullable enable
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;`;

/** Standing data and the board helper. Types go under the divider in a C# file. */
export const PORT_PROVIDED = cs`// Provided by pockett: the port's standing data and the board helper. Leave these as they are.
// Shipment and Vessel are records (lesson 6 looks inside them); PortData hands out fresh lists.
record Shipment(string Id, string Cargo, string Category, string Origin, string VesselId, int MassKg, int Priority);

record Vessel(string Id, string Name, string Operator, int CapacityKg, string[] Crew);

static class PortData
{
    public static List<Shipment> Shipments() => new()
    {
        new("H-3001", "Seed vault trays", "Agri", "Ceres Yard", "V-11", 820, 2),
        new("H-3002", "Insulin cold packs", "Medical", "Luna Gate", "V-12", 140, 1),
        new("H-3003", "Reactor coolant", "Fuel", "Vesta Dock", "V-14", 4200, 2),
        new("H-3004", "Hull plating", "Machinery", "Ceres Yard", "V-14", 3100, 3),
        new("H-3005", "Letters and parcels", "Mail", "Luna Gate", "V-11", 260, 3),
        new("H-3006", "Water ice blocks", "Supply", "Vesta Dock", "V-11", 2500, 3),
        new("H-3007", "Surgical lamps", "Medical", "Luna Gate", "V-14", 380, 1),
        new("H-3008", "Hydroponic nutrients", "Agri", "Ceres Yard", "V-12", 910, 2),
        new("H-3009", "Rotor bearings", "Machinery", "Vesta Dock", "V-12", 640, 2),
        new("H-3010", "Fusion pellets", "Fuel", "Ceres Yard", "V-11", 1800, 1),
        new("H-3011", "Orchard saplings", "Agri", "Luna Gate", "V-14", 450, 3),
        new("H-3012", "Solar film rolls", "Machinery", "Luna Gate", "V-12", 1200, 2),
        new("H-3013", "Antibiotic crates", "Medical", "Vesta Dock", "V-11", 330, 1),
        new("H-3014", "Parcel sacks", "Mail", "Vesta Dock", "V-14", 190, 3),
    };

    public static List<Vessel> Vessels() => new()
    {
        new("V-11", "Pelican Run", "Tern Freight", 9000, new[] { "Ada Ruiz", "Joss Teller", "Mina Oyelaran" }),
        new("V-12", "Marrow Lantern", "Orrery Lines", 6000, new[] { "Kofi Bannerman", "Lio Chen" }),
        new("V-14", "Quiet Kestrel", "Tern Freight", 12000, new[] { "Priya Natarajan", "Sven Aldous", "Tamsin Hale", "Uzo Eze" }),
        new("V-15", "Saltmarsh", "Basalt Haulage", 4000, new[] { "Wren Castellano" }),
    };
}

// Port.Show("name", value) sends one value to the live port board beside your editor.
static class Port
{
    static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };

    public static void Show(string key, object? value)
    {
        var message = new Dictionary<string, object?> { [key] = value };
        Console.WriteLine("@scene " + JsonSerializer.Serialize(message, Options));
    }
}`;
