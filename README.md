# Railzway APIs

Canonical Protocol Buffer definitions for Railzway public APIs. This repository
contains API contracts only; service implementations live in their respective
Railzway repositories.

## Design

- Contract-first APIs defined with Protocol Buffers.
- Versioned packages such as `railzway.fare.catalog.v1`.
- Resource-oriented standard methods plus explicit custom methods.
- One contract exposed through gRPC and REST/JSON transcoding.
- Generated clients are disposable artifacts and are not edited by hand.
- Buf linting and breaking-change detection protect API consistency.

Source paths mirror package names:

```text
railzway/fare/<domain>/<version>/<service>.proto
```

Keep ecosystem boundaries explicit:

- `railzway.fare.<domain>.v1`: Fare monetization engine contracts.
- `railzway.cloud.v1`: control-plane and provisioning contracts.
- `railzway.auth.v1`: identity administration contracts, when not already
  represented by standard OAuth/OIDC endpoints.

Do not import implementation models, database schemas, or internal transport
types into these public contracts.

## Billing API surface

| Package | Responsibility |
| --- | --- |
| `railzway.common.v1` | Shared decimal, money, and validity semantics |
| `organization.v1` | Monetization account, currency, and time-zone boundary |
| `customer.v1` | Billable customers and external identity mapping |
| `meter.v1` | Event aggregation definitions |
| `ingest.v1` | Idempotent single and batch usage ingestion |
| `catalog.v1` | Products, rate cards, effective rates, and pricing models |
| `contract.v1` | Customer commercial terms and scheduled amendments |
| `subscription.v1` | Recurring product instances under a contract |
| `credit.v1` | Free credits, paid commitments, and balances |
| `rating.v1` | Aggregated usage queries and charge previews |
| `invoice.v1` | Draft preview, finalization, and void lifecycle |
| `railzway.payment.v1` | Organization-owned provider routing and explicit invoice collection |

The primary data flow is:

```text
usage event -> meter -> product -> effective rate -> contract
            -> rated charge -> credits/commitments -> invoice -> payment
```

## Financial and ingestion invariants

- Decimal quantities and monetary amounts are encoded as canonical decimal
  strings. Implementations must never parse them through binary floating point.
- All monetary fields use `railzway.common.v1.Money`; quantities and unit sizes
  use `railzway.common.v1.Decimal`.
- `organization + event_id` uniquely identifies a usage event. Replaying the
  same payload returns `DUPLICATE`; replaying the ID with a different payload
  must be rejected.
- Rate and contract changes are effective-dated. Historical versions remain
  available so a finalized invoice can be reproduced.
- Resource validity uses `EffectivePeriod` with the half-open interval
  `start_time <= timestamp < end_time`. All timestamps are UTC; an absent
  `end_time` means the resource has no scheduled end.
- Rate periods for the same rate card, product, and dimension values must not
  overlap. A rate transition may share a boundary: the old rate ends exactly
  when the new rate starts.
- `request_id` makes mutating operations idempotent within an organization.
- A finalized invoice is immutable. Corrections use voids, adjustments, or
  credit notes rather than editing historical lines. Every finalized line
  retains the exact `rate_id` used for its calculation.
- Invoice totals must satisfy `total = subtotal - credits + tax` using one
  explicit currency and rounding policy.
- Usage events are append-only. A correction creates a replacement event that
  references the original; it never edits the accepted raw event.
- Contract and subscription amendments are immutable resources with scheduled,
  applied, and canceled lifecycle states.
- Voiding a credit or commitment preserves the grant and records its financial
  effect as a balance transaction.
- Replay operations use an explicit event-time range and expose a processing
  watermark so late arrivals and backfills can be reconciled deterministically.

## Payment collection invariants

- Each organization is the merchant of record and connects its own payment
  provider accounts. Provider credentials are never part of a retrievable API
  resource.
- Finalizing an invoice never charges the customer. Collection starts through
  an explicit `CreatePayment` call against a finalized, non-void invoice.
- The payment amount and currency are copied from the invoice and are immutable.
  An invoice may have many attempts, but only one active or successful logical
  collection.
- Provider routing evaluates the customer's structured billing country, invoice
  currency, method type, recurring and off-session requirements, connection
  capabilities, health, and the organization's ordered routing policy.
- Payment methods are provider-bound. Cross-provider fallback is allowed only
  when the customer already has an eligible method at the alternative provider.
- Automatic fallback is limited to technical failures where the implementation
  can prove no charge was created. Ambiguous results enter reconciliation;
  declines, fraud rejection, authentication requirements, insufficient funds,
  and invalid methods never trigger provider fallback.
- Create, retry, provider requests, and webhook processing are idempotent.
  Terminal payment state cannot be regressed by duplicate or out-of-order
  provider events.

## Commands

Install the [Buf CLI](https://buf.build/docs/cli/installation/), then run:

```sh
buf dep update
buf format -w
buf lint
buf generate
buf breaking --against '.git#branch=main'
```

`buf dep update` resolves dependencies and writes `buf.lock`. `buf generate`
uses remote plugins configured in `buf.gen.yaml` and writes Go, gRPC, and
grpc-gateway code under `gen/go`.

Merges to `main` publish the public module to
`buf.build/railzwaylabs/railzwayapis`. Generated SDKs are consumed directly
from the BSR rather than committed to a generated-code repository. For Go:

```sh
go get buf.build/gen/go/railzwaylabs/railzwayapis/grpc/go
```

The gRPC SDK brings in the corresponding Protocol Buffers SDK dependency.
Pin an explicit BSR commit or label for reproducible consumer builds.

## API documentation

Each merge to `main` also updates the module documentation in the BSR at
`buf.build/railzwaylabs/railzwayapis`. Buf builds the documentation site from
the checked-in README and Protobuf source comments, so no generated HTML is
committed to this repository.

Public services, RPCs, messages, enums, and `oneof` declarations must have
meaningful comments. The `COMMENTS` lint category enforces that requirement in
local checks and CI. Field and enum-value comments remain optional so obvious
wire-level members do not require repetitive prose; add them whenever units,
boundaries, mutability, or financial semantics need clarification.

## Contributing

This repository uses trunk-based development with `main` as the single trunk.
Create a short-lived branch, open a pull request, and keep it up to date with
`main`. Pull requests should be squash-merged after the required CI check
`Buf CI / Validate schema` succeeds.

Before opening or updating a pull request, run:

```sh
buf format -d --exit-code
buf lint
buf build
buf dep update
git diff --exit-code -- buf.lock
buf breaking --against '.git#branch=main'
buf generate
git diff --check
```

Configure the `main` branch ruleset in GitHub to require pull requests, require
branches to be up to date, and require `Buf CI / Validate schema`. Disable force
pushes, branch deletion, and required-check bypasses. Breaking changes to a
published API belong in a new major package such as `v2`.

Use the structured issue forms for bugs, API proposals, and documentation
problems. Blank issues remain available for topics that do not fit those forms.

## Evolution rules

- Add fields with new field numbers; never reuse deleted field numbers.
- Reserve deleted field names and numbers.
- Add compatible methods and fields within `v1`.
- Introduce `v2` for deliberate breaking changes.
- Use `google.protobuf.FieldMask` for partial updates.
- Use page tokens rather than exposing database offsets.
- Use custom methods such as `:finalize` only for domain actions that are not
  standard CRUD operations.
