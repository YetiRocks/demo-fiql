<p align="center">
  <img src="https://cdn.prod.website-files.com/68e09cef90d613c94c3671c0/697e805a9246c7e090054706_logo_horizontal_grey.png" alt="Yeti" width="200" />
</p>

---

# demo-fiql

[![Yeti](https://img.shields.io/badge/Yeti-Application-blue)](https://yetirocks.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **[Yeti](https://yetirocks.com)** — The Performance Platform for Agent-Driven Development.
> Schema-driven APIs, real-time streaming, and vector search. From prompt to production.

50+ FIQL query examples covering the full query language. Select a query from the sidebar, see the URL, run it, and inspect the JSON response.

## Features

- Equality, comparison, and pattern matching
- Full-text search and range queries
- Relationship joins and field selection
- Sorting, pagination, and query introspection

## Installation

```bash
cd ~/yeti/applications
git clone https://github.com/yetirocks/demo-fiql.git
cd demo-fiql/source
npm install
npm run build
```

## Project Structure

```
demo-fiql/
├── config.yaml              # App configuration
├── schemas/
│   └── fiql.graphql         # Products + Brand with relationships
├── data/
│   ├── products.json        # Seed product catalog
│   └── brands.json          # Seed brand data
└── source/                  # React/Vite frontend
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
```

## Configuration

```yaml
name: "FIQL Query Demo"
app_id: "demo-fiql"
version: "1.0.0"
description: "50+ query examples covering equality, ranges, full-text search, joins, sorting, and pagination"
enabled: true
rest: true
graphql: true

schemas:
  - schemas/fiql.graphql

dataLoader: data/*.json

static_files:
  path: web
  route: /
  index: index.html
  notFound:
    file: index.html
    statusCode: 200
  build:
    sourceDir: source
    command: npm run build
```

## Schema

**fiql.graphql** -- Products and Brands with relationships:
```graphql
type Products @table(database: "demo-fiql") @export
    @compositeIndex(fields: "category,price") {
    id: ID! @primaryKey
    name: String! @indexed(type: "fulltext")
    price: Float! @indexed
    height: Float
    width: Float
    description: String @indexed(type: "fulltext")
    category: String! @indexed
    inStock: Boolean! @indexed
    manufacturer: String
    tags: String
    brandId: ID @indexed
    brand: Brand @relationship(from: "brandId")
}

type Brand @table(database: "demo-fiql") @export {
    id: ID! @primaryKey
    name: String! @indexed
    country: String!
    foundedYear: Int
    products: [Products] @relationship(to: "brandId")
}
```

## Development

```bash
cd source

# Install dependencies
npm install

# Start dev server with HMR
npm run dev

# Build for production
npm run build
```

---

Built with [Yeti](https://yetirocks.com) | The Performance Platform for Agent-Driven Development
