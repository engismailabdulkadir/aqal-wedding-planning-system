# Architecture

The frontend is organized by reusable UI, layout, pages, and future domain features. Shared HTTP behavior belongs in `services`, global state providers in `context`, and route definitions in `routes`.

The backend separates HTTP composition (`app.js`) from process startup (`server.js`). Routes delegate to controllers; future domain logic belongs in services, persistence definitions in models, and request validation in validators. Cross-cutting Express behavior belongs in middleware.

All API endpoints are versioned beneath `/api/v1`.

