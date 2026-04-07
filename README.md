<p align="center">
  <img src="https://cdn.prod.website-files.com/68e09cef90d613c94c3671c0/697e805a9246c7e090054706_logo_horizontal_grey.png" alt="Yeti" width="200" />
</p>

---

# demo-fiql

[![Yeti](https://img.shields.io/badge/Yeti-Demo-blue)](https://yetirocks.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **[Yeti](https://yetirocks.com)** - The Performance Platform for Agent-Driven Development.
> Schema-driven APIs, real-time streaming, and vector search. From prompt to production.

**The interactive reference for FIQL query syntax.** 50+ live examples, instant execution, zero setup.

FIQL (Feed Item Query Language, RFC draft) is the query language built into every Yeti REST endpoint. This demo application ships a product catalog with 50 items across 6 categories and 22 brands, then provides a three-panel UI where you select a query, see the URL and parsed resource JSON, execute it against live data, and inspect the response. Every operator, every pattern, one application.

---

## Why demo-fiql

Yeti auto-generates REST endpoints from your schema, and every endpoint speaks FIQL out of the box. But FIQL has depth -- range operators, regex matching, full-text search, relationship joins, nested field access, query introspection -- and reading a spec is not the same as seeing it work.

demo-fiql makes the entire query language tangible:

- **50+ curated examples** -- organized from basics through advanced joins, each with a plain-English description and the raw FIQL URL side by side.
- **Live execution** -- click Execute and see the actual HTTP response from the server. No mocked data, no stubs.
- **Parsed resource JSON** -- every FIQL URL is decomposed into its structured representation so you can see what the server actually interprets.
- **Seeded product catalog** -- 50 products, 22 brands, 6 categories with prices, dimensions, nested manufacturer objects, array tags, and cross-table relationships. Rich enough to demonstrate every operator.
- **Public read access** -- both tables use `@export(public: [read])` so the demo works without authentication.
- **SPA with HMR** -- React + Vite frontend with syntax-highlighted FIQL and JSON panes. Modify examples and rebuild in seconds.

---

## Quick Start

### 1. Install

```bash
cd ~/yeti/applications
git clone https://github.com/yetirocks/demo-fiql.git
```

Restart yeti. The frontend builds automatically on first load (~30 seconds) and is cached for subsequent starts.

### 2. Open the UI

Navigate to `https://localhost/demo-fiql/` in your browser. Select any query from the sidebar and click Execute.

### 3. Query from the command line

Every example works directly with curl. The Products and Brand tables have public read access.

**List all products:**

```bash
curl -s "https://localhost/demo-fiql/Products/" | head -c 200
```

Response (truncated):
```json
[
  {
    "id": "prod-001",
    "name": "Ultra HD Monitor",
    "price": 499.99,
    "category": "electronics",
    "inStock": true,
    "brandId": "brand-viewtech"
  },
  ...
]
```

**Exact match -- electronics only:**

```bash
curl -s "https://localhost/demo-fiql/Products/?category==electronics"
```

Response (truncated):
```json
[
  { "id": "prod-001", "name": "Ultra HD Monitor", "price": 499.99, "category": "electronics" },
  { "id": "prod-002", "name": "Wireless Pro Mouse", "price": 79.99, "category": "electronics" },
  { "id": "prod-007", "name": "Mechanical Keyboard", "price": 149.99, "category": "electronics" },
  ...
]
```

**Range query -- products between $50 and $150:**

```bash
curl -s "https://localhost/demo-fiql/Products/?price=gele=50,150"
```

Response (truncated):
```json
[
  { "id": "prod-002", "name": "Wireless Pro Mouse", "price": 79.99 },
  { "id": "prod-005", "name": "Merino Wool Sweater", "price": 89.0 },
  { "id": "prod-007", "name": "Mechanical Keyboard", "price": 149.99 },
  { "id": "prod-010", "name": "Trail Running Shoes", "price": 139.0 },
  ...
]
```

**Full-text search:**

```bash
curl -s "https://localhost/demo-fiql/Products/?description=ft=programming"
```

Response:
```json
[
  { "id": "prod-004", "name": "Rust Programming Handbook", "description": "Comprehensive guide to systems programming with Rust" },
  { "id": "prod-044", "name": "Linux Kernel Development", "description": "In-depth guide to kernel internals and module programming" }
]
```

**Relationship join -- products from Japanese brands:**

```bash
curl -s "https://localhost/demo-fiql/Products/?brand.country==JP&select=name,price,brand{name,country}&stream=false"
```

Response:
```json
[
  { "name": "Ultra HD Monitor", "price": 499.99, "brand": { "name": "ViewTech", "country": "JP" } },
  { "name": "Webcam 4K Pro", "price": 129.99, "brand": { "name": "ViewTech", "country": "JP" } },
  { "name": "Curved Gaming Monitor", "price": 899.99, "brand": { "name": "ViewTech", "country": "JP" } },
  { "name": "Noise Cancelling Headphones", "price": 349.99, "brand": { "name": "SoundWave", "country": "JP" } },
  { "name": "Bluetooth Speaker Mini", "price": 39.99, "brand": { "name": "SoundWave", "country": "JP" } }
]
```

**Query introspection -- explain the query plan:**

```bash
curl -s "https://localhost/demo-fiql/Products/?category==electronics&price=gt=100&explain=true&stream=false"
```

Response:
```json
{
  "strategy": "composite_index",
  "index": "category+price",
  "conditions": [
    { "field": "category", "op": "==", "value": "electronics" },
    { "field": "price", "op": "gt", "value": 100 }
  ],
  "estimatedCost": "low"
}
```

---

## Architecture

```
Browser / curl / AI Agent
    |
    +-- GET /demo-fiql/ -----------> SPA (React + Vite)
    +-- GET /demo-fiql/Products/ --> Auto-generated REST + FIQL
    +-- GET /demo-fiql/Brand/ ----> Auto-generated REST + FIQL
          |
          v
    +----------------------------------------------+
    |               demo-fiql                       |
    |                                              |
    |  +----------+     +--------+                 |
    |  | Products |---->|  Brand |                 |
    |  | (50 rows)|     |(22 rows)|                |
    |  +----------+     +--------+                 |
    |       |                |                     |
    |   @indexed         @indexed                  |
    |   @fulltext        @relationship             |
    |   @compositeIndex                            |
    |   @relationship                              |
    |   @export(public: [read])                    |
    +----------------------------------------------+
          |
          v
    Yeti (embedded RocksDB, FIQL parser, query planner)
```

**Request path:** HTTP request -> Yeti router -> FIQL parser -> query planner (index selection) -> RocksDB scan -> filter/sort/project -> JSON response.

**No custom resources.** Every endpoint is auto-generated from the GraphQL schema. The FIQL query language is built into the platform -- any `@export` table supports every operator shown here.

---

## Features

### Equality and Comparison Operators

The foundation of FIQL filtering. All comparison operators work on strings, numbers, and booleans.

| Operator | Syntax | Description | Example |
|----------|--------|-------------|---------|
| Equals | `==` | Exact match | `category==electronics` |
| Strict equals | `===` | Exact match, no type coercion | `id===prod-001` |
| Not equal | `=ne=` | Excludes matching records | `category=ne=books` |
| Greater than | `=gt=` | Strictly greater | `price=gt=200` |
| Greater or equal | `=ge=` | Greater than or equal | `price=ge=100` |
| Less than | `=lt=` | Strictly less | `price=lt=50` |
| Less or equal | `=le=` | Less than or equal | `price=le=35` |

```bash
# Products over $200
curl -s "https://localhost/demo-fiql/Products/?price=gt=200"

# Everything except books
curl -s "https://localhost/demo-fiql/Products/?category=ne=books"
```

### Range Operators

Four range operators cover every combination of inclusive and exclusive bounds. Each takes two comma-separated values.

| Operator | Syntax | Interval | Meaning |
|----------|--------|----------|---------|
| `=gele=` | `price=gele=50,150` | [50, 150] | Closed: `50 <= x <= 150` |
| `=gelt=` | `price=gelt=50,150` | [50, 150) | Half-open: `50 <= x < 150` |
| `=gtle=` | `price=gtle=50,150` | (50, 150] | Half-open: `50 < x <= 150` |
| `=gtlt=` | `price=gtlt=50,150` | (50, 150) | Open: `50 < x < 150` |

```bash
# Closed interval: $50 to $150 inclusive
curl -s "https://localhost/demo-fiql/Products/?price=gele=50,150"

# Half-open: useful for pagination windows
curl -s "https://localhost/demo-fiql/Products/?price=gelt=50,150"

# Combine range with equality filter
curl -s "https://localhost/demo-fiql/Products/?category==electronics&price=gele=100,500"

# Range with sorting
curl -s "https://localhost/demo-fiql/Products/?price=gele=25,100&sort=price"
```

**Chained attribute syntax** is an alternative to range operators. When a condition omits the field name, it inherits the field from the previous condition:

```bash
# Equivalent to price=gtlt=50,200
curl -s "https://localhost/demo-fiql/Products/?price=gt=50&lt=200"
```

### String Matching

Pattern matching operators for text fields. All operate on the string representation of the value.

| Operator | Syntax | Description | Example |
|----------|--------|-------------|---------|
| Contains | `=ct=` | Substring match | `name=ct=Pro` |
| Starts with | `=sw=` | Prefix match | `name=sw=Ultra` |
| Ends with | `=ew=` | Suffix match | `description=ew=kit` |
| Wildcard | `==` with `*` | Glob-style wildcard | `name==Ultra*` or `name==*Pro*` |
| Regex | `=~=` | Regular expression | `name=~=^Ultra.*` |

```bash
# Products with "Pro" in the name
curl -s "https://localhost/demo-fiql/Products/?name=ct=Pro"

# Names starting with "Ultra"
curl -s "https://localhost/demo-fiql/Products/?name=sw=Ultra"

# Descriptions ending with "kit"
curl -s "https://localhost/demo-fiql/Products/?description=ew=kit"

# Wildcard: contains "Pro" anywhere
curl -s "https://localhost/demo-fiql/Products/?name==*Pro*"

# Regex: case-insensitive match
curl -s "https://localhost/demo-fiql/Products/?name=~=(?i)pro"
```

### Full-Text Search

Full-text search operates on fields with `@indexed(type: "fulltext")`. Uses the built-in full-text index, not substring matching.

```bash
# Single term
curl -s "https://localhost/demo-fiql/Products/?description=ft=programming"

# Multi-term (AND semantics -- all terms must match)
curl -s "https://localhost/demo-fiql/Products/?name=ft=ultra%20monitor"
```

In this schema, `name` and `description` on Products both have fulltext indexes.

### Set Membership

Test whether a field value is in (or not in) a set of values.

| Operator | Syntax | Description |
|----------|--------|-------------|
| In | `=in=` | Match any value in the set |
| Not in | `=out=` | Exclude all values in the set |

```bash
# Electronics or books
curl -s "https://localhost/demo-fiql/Products/?category=in=electronics,books"

# Everything except clothing and furniture
curl -s "https://localhost/demo-fiql/Products/?category=out=clothing,furniture"
```

### Logical Operators

Combine conditions with AND, OR, NOT, and grouping.

| Operator | Syntax | Description |
|----------|--------|-------------|
| AND | `&` | Both conditions must match |
| OR | `\|` | Either condition can match |
| NOT | `!(...)` | Negate a condition or group |
| Grouping | `(...)` | Control evaluation order |

```bash
# AND: electronics that are in stock
curl -s "https://localhost/demo-fiql/Products/?category==electronics&inStock==true"

# OR: electronics or cheap items
curl -s "https://localhost/demo-fiql/Products/?category==electronics|price=le=25"

# NOT: exclude items over $100
curl -s "https://localhost/demo-fiql/Products/?!(price=gt=100)"

# NOT group: exclude out-of-stock books
curl -s "https://localhost/demo-fiql/Products/?!(category==books&inStock==false)"

# Grouped OR + AND: expensive electronics OR out-of-stock
curl -s "https://localhost/demo-fiql/Products/?(category==electronics&price=gt=100)|inStock==false"
```

### Nested and Array Data

Access nested object fields with dot notation. Array fields match if any element satisfies the condition.

```bash
# Nested object: products from Japanese manufacturers
curl -s "https://localhost/demo-fiql/Products/?manufacturer.country==JP"

# Array element: products tagged "popular"
curl -s "https://localhost/demo-fiql/Products/?tags==popular"
```

### Type Coercion

Force specific type interpretation with type prefixes.

| Prefix | Syntax | Use case |
|--------|--------|----------|
| `number:` | `price==number:499.99` | Force numeric comparison |
| `string:` | `inStock==string:true` | Match literal string "true" |

```bash
# Numeric comparison
curl -s "https://localhost/demo-fiql/Products/?price==number:499.99"

# String literal match
curl -s "https://localhost/demo-fiql/Products/?inStock==string:true"
```

### Field Selection

Return only specific fields in the response. Supports nested field projection with brace syntax.

```bash
# Select two fields
curl -s "https://localhost/demo-fiql/Products/?select=name,price"

# Select with filter
curl -s "https://localhost/demo-fiql/Products/?category==sports&select=name,price"

# Select nested fields from manufacturer object
curl -s "https://localhost/demo-fiql/Products/?select=name,price,manufacturer{name,country}"

# Function-style syntax (equivalent)
curl -s "https://localhost/demo-fiql/Products/?select(name,price)"
```

### Sorting

Sort results by one or more fields. Prefix with `-` for descending order.

```bash
# Alphabetical by name
curl -s "https://localhost/demo-fiql/Products/?sort=name"

# Most expensive first
curl -s "https://localhost/demo-fiql/Products/?sort=-price"

# Multi-level: category ascending, then price descending
curl -s "https://localhost/demo-fiql/Products/?sort=category,-price"

# Sort with filter: books, most expensive first
curl -s "https://localhost/demo-fiql/Products/?category==books&sort=-price"

# Function-style syntax
curl -s "https://localhost/demo-fiql/Products/?sort(-price)"
```

### Pagination

Control result set size with limit and offset. Use `pagination=true` to include the total count.

```bash
# First 5 records
curl -s "https://localhost/demo-fiql/Products/?limit=5&offset=0"

# Next 5 records
curl -s "https://localhost/demo-fiql/Products/?limit=5&offset=5"

# Include total count in response
curl -s "https://localhost/demo-fiql/Products/?pagination=true&limit=5"

# Function-style: limit(offset, count)
curl -s "https://localhost/demo-fiql/Products/?limit(5,10)"
```

### Relationship Joins

Query across table relationships defined with `@relationship` in the schema. Products have a `brand` relationship to Brand via `brandId`.

```bash
# Semi-join: filter products by brand name
curl -s "https://localhost/demo-fiql/Products/?brand.name==ViewTech&stream=false"

# Include related fields in response
curl -s "https://localhost/demo-fiql/Products/?select=name,price,brand{name,country}&limit=5&stream=false"

# Filter + include: Japanese brands with projected fields
curl -s "https://localhost/demo-fiql/Products/?brand.country==JP&select=name,brand{name}&stream=false"

# Reverse join: brands that have products over $500
curl -s "https://localhost/demo-fiql/Brand/?products.price=gt=500&stream=false"
```

### Query Introspection

Add `explain=true` to see how the query planner resolves your query -- which indexes are used, estimated cost, and the parsed condition tree.

```bash
# Explain a simple filter
curl -s "https://localhost/demo-fiql/Products/?category==electronics&explain=true&stream=false"

# Explain a composite index query
curl -s "https://localhost/demo-fiql/Products/?category==electronics&price=gt=100&explain=true&stream=false"
```

The composite index on `(category, price)` is defined in the schema via `@compositeIndex(fields: "category,price")`. When both fields appear in a query, the planner uses the composite index for a single efficient scan instead of intersecting two separate index lookups.

---

## Data Model

### Products Table

50 records across 6 categories. Fulltext indexes on `name` and `description`. Composite index on `(category, price)`.

| Field | Type | Indexed | Description |
|-------|------|---------|-------------|
| `id` | ID! | Primary key | Product identifier (e.g. `prod-001`) |
| `name` | String! | Fulltext | Product name |
| `price` | Float! | Yes | Price in USD |
| `height` | Float | -- | Height in cm |
| `width` | Float | -- | Width in cm |
| `description` | String | Fulltext | Product description |
| `category` | String! | Yes | One of: electronics, furniture, books, clothing, sports |
| `inStock` | Boolean! | Yes | Availability flag |
| `manufacturer` | String | -- | Nested JSON object with name, country, year |
| `tags` | String | -- | JSON array of searchable tags |
| `brandId` | ID | Yes | Foreign key to Brand table |
| `brand` | Brand | Relationship | Joined Brand record (via `brandId`) |

### Brand Table

22 records representing product manufacturers across 13 countries.

| Field | Type | Indexed | Description |
|-------|------|---------|-------------|
| `id` | ID! | Primary key | Brand identifier (e.g. `brand-viewtech`) |
| `name` | String! | Yes | Brand name |
| `country` | String! | -- | Two-letter country code |
| `foundedYear` | Int | -- | Year the brand was established |
| `products` | [Products] | Relationship | Reverse join to Products (via `brandId`) |

### Categories

| Category | Count | Price Range | Example Products |
|----------|-------|-------------|-----------------|
| electronics | 13 | $19.99 -- $899.99 | Ultra HD Monitor, Mechanical Keyboard, Noise Cancelling Headphones |
| furniture | 10 | $34.99 -- $649.00 | Standing Desk Pro, Walnut Bookshelf, Velvet Accent Chair |
| sports | 10 | $18.99 -- $349.00 | Carbon Fiber Tennis Racket, Trail Running Shoes, Adjustable Dumbbell Set |
| clothing | 8 | $28.00 -- $199.00 | Merino Wool Sweater, Down Winter Jacket, Leather Messenger Bag |
| books | 7 | $39.99 -- $64.99 | Rust Programming Handbook, API Design Patterns, Database Internals |

### Brands by Country

| Country | Brands |
|---------|--------|
| US | ClickCo, CodePress, SwingMax, HydroKit |
| JP | ViewTech, SoundWave |
| IT | TrailBlazer, HideCraft |
| FR | FabricHouse, VerticalEdge |
| CN | GreenDesk, LumiTech |
| IN | FlexForm |
| DE | KeyForge |
| SE | ErgoWorks |
| NZ | WoolCraft |
| CA | TimberLine |
| KR | DataVault |
| TW | PortPlus |
| UK | ArchPress |
| CH | AlpineGear |
| DK | ModLiving |

---

## Configuration

### config.yaml

```yaml
name: "FIQL Query Demo"
app_id: "demo-fiql"
version: "1.0.0"
description: "50+ query examples covering equality, ranges, full-text search, joins, sorting, and pagination"
schemas:
  path: schemas/fiql.graphql

dataLoader: data/*.json

static:
  path: web
  route: /
  spa: true
  build:
    source: source
    command: npm run build
```

Key configuration details:

| Field | Value | Purpose |
|-------|-------|---------|
| `schemas` | `schemas/fiql.graphql` | Products and Brand table definitions |
| `dataLoader` | `data/*.json` | Seeds 50 products and 22 brands on first start |
| `static_files.spa` | `true` | SPA mode -- all routes fall back to index.html |
| `static_files.build` | Vite build | Compiles React frontend to `web/` on first load |

### Schema Directives

| Directive | Usage | Purpose |
|-----------|-------|---------|
| `@table(database: "demo-fiql")` | Both types | Stores data in the demo-fiql RocksDB database |
| `@export(public: [read])` | Both types | Generates REST endpoints with public read access |
| `@primaryKey` | `id` fields | Designates the primary key |
| `@indexed` | `price`, `category`, `inStock`, `brandId`, `name` (Brand) | Creates secondary indexes for fast lookups |
| `@indexed(type: "fulltext")` | `name`, `description` (Products) | Creates full-text search indexes |
| `@compositeIndex(fields: "category,price")` | Products | Optimizes queries filtering on both category and price |
| `@relationship(from: "brandId")` | Products.brand | Defines forward join from Products to Brand |
| `@relationship(to: "brandId")` | Brand.products | Defines reverse join from Brand to Products |

---

## Project Structure

```
demo-fiql/
├── config.yaml              # App configuration
├── schemas/
│   └── fiql.graphql         # Products + Brand table definitions
├── data/
│   ├── products.json        # 50 seed products
│   └── brands.json          # 22 seed brands
└── source/                  # React + Vite frontend
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx         # Entry point
        ├── App.tsx          # Layout shell
        ├── theme.ts         # Color tokens
        ├── utils.ts         # JSON syntax highlighting
        ├── pages/
        │   └── FiqlPage.tsx # Query list, FIQL parser, results pane
        └── components/
            └── Footer.tsx   # Footer bar
```

---

## FIQL Operator Reference

Complete operator summary for quick reference.

| Category | Operator | Syntax | Example |
|----------|----------|--------|---------|
| **Equality** | Equals | `==` | `category==electronics` |
| | Strict equals | `===` | `id===prod-001` |
| | Not equal | `=ne=` | `category=ne=books` |
| **Comparison** | Greater than | `=gt=` | `price=gt=200` |
| | Greater or equal | `=ge=` | `price=ge=100` |
| | Less than | `=lt=` | `price=lt=50` |
| | Less or equal | `=le=` | `price=le=35` |
| **Range** | Closed | `=gele=` | `price=gele=50,150` |
| | Half-open (ge/lt) | `=gelt=` | `price=gelt=50,150` |
| | Half-open (gt/le) | `=gtle=` | `price=gtle=50,150` |
| | Open | `=gtlt=` | `price=gtlt=50,150` |
| **String** | Contains | `=ct=` | `name=ct=Pro` |
| | Starts with | `=sw=` | `name=sw=Ultra` |
| | Ends with | `=ew=` | `description=ew=kit` |
| | Regex | `=~=` | `name=~=(?i)pro` |
| | Wildcard | `==` + `*` | `name==*Pro*` |
| **Text** | Full-text | `=ft=` | `description=ft=programming` |
| **Set** | In | `=in=` | `category=in=electronics,books` |
| | Not in | `=out=` | `category=out=clothing,furniture` |
| **Logic** | AND | `&` | `a==1&b==2` |
| | OR | `\|` | `a==1\|b==2` |
| | NOT | `!(...)` | `!(price=gt=100)` |
| | Group | `(...)` | `(a==1&b==2)\|c==3` |
| **Control** | Select | `select=` | `select=name,price` |
| | Sort | `sort=` | `sort=-price` |
| | Limit | `limit=` | `limit=10` |
| | Offset | `offset=` | `offset=5` |
| | Pagination | `pagination=` | `pagination=true` |
| | Explain | `explain=` | `explain=true` |
| **Type** | Number | `number:` | `price==number:499.99` |
| | String | `string:` | `inStock==string:true` |
| **Access** | Nested field | `.` | `manufacturer.country==JP` |
| | Relationship | `.` | `brand.name==ViewTech` |
| | Nested select | `{}` | `select=name,brand{name}` |
| **Function** | select() | `select(...)` | `select(name,price)` |
| | sort() | `sort(...)` | `sort(-price)` |
| | limit() | `limit(...)` | `limit(5,10)` |

---

## Comparison

| | demo-fiql | Typical API docs |
|---|---|---|
| **Format** | Live interactive queries | Static code samples |
| **Execution** | Click-to-run against real data | Copy-paste into terminal |
| **Feedback** | Instant JSON response in UI | Manual inspection |
| **Coverage** | 50+ examples, every operator | Cherry-picked examples |
| **Data** | 50 products, 22 brands, relationships | Placeholder data |
| **Introspection** | `explain=true` shows query plan | No equivalent |
| **Setup** | Clone + restart yeti | Read documentation |

---

## Development

```bash
cd ~/yeti/applications/demo-fiql/source

# Install dependencies
npm install

# Start dev server with HMR
npm run dev

# Build for production
npm run build
```

The built output goes to `web/` which yeti serves as static files. During development, the Vite dev server proxies API requests to yeti.

---

Built with [Yeti](https://yetirocks.com) | The Performance Platform for Agent-Driven Development
