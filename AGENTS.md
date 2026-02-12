# Agent Rules For This Repository

## Do
- Keep `party/index.ts` entrypoint-only (import/export worker, no domain logic).
- Keep `party/server/game-lifecycle.ts` orchestration/delegation-only.
- Put server logic into dedicated modules under `party/server/**` by use-case:
  - `party/server/connection-registry.ts`
  - `party/server/message-handlers/*.ts`
  - `party/server/persistence.ts`
- Split a server module when it grows beyond ~350 LoC or mixes responsibilities.
- Keep game domain types in `src/types/game/**`.
- Keep player/table types in `src/types/tables.ts`.
- Keep `party/types.ts` as re-export layer only.
- Keep runtime payload validation in `party/schemas.ts`.
- Keep compile-time contract alignment in `party/contracts.typecheck.ts`.

## Don't
- Do not add gameplay/business logic to `party/index.ts`.
- Do not add duplicated central domain types in `party/types.ts`.
- Do not define `GameState`, `GameEvent`, `GameMessage`, `Card`, `Trick`, `Player`, or `Table` in more than one type tree.
- Do not change payload shapes only in one place.
- Do not merge refactors that alter external behavior unless explicitly requested.

## Change Rules (Payloads)
- For changes to `GameEvent`, `GameMessage`, `TableEvent`, or `TableMessage` always update all of:
  - `src/types/**`
  - `party/schemas.ts`
  - `party/contracts.typecheck.ts`
- Ensure schema-to-type and type-to-schema checks stay valid.

## PR Checklist
- [ ] `party/index.ts` remains thin and behavior-free.
- [ ] New server logic is placed in `party/server/**` with clear ownership.
- [ ] No duplicate central game/table type definitions were introduced.
- [ ] `party/types.ts` is still only re-exports.
- [ ] Payload type changes are reflected in `src/types/**`.
- [ ] Payload schema changes are reflected in `party/schemas.ts`.
- [ ] `party/contracts.typecheck.ts` still compiles.
- [ ] `pnpm run test:contracts` passes.
- [ ] `pnpm run test:services` passes.
- [ ] `pnpm run typecheck` passes.
- [ ] `pnpm exec biome check party/**/*.ts src/types/**/*.ts` passes.
- [ ] External behavior remains unchanged (or change is explicitly approved).
