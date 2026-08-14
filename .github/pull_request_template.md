## Summary

<!-- Explain what changes and why. -->

## Related issue

<!-- Use "Closes #123" when this PR should close an issue. -->

## Change type

- [ ] Additive API change
- [ ] Compatible API fix
- [ ] Documentation only
- [ ] Internal tooling or CI
- [ ] New major API version

## Public API impact

<!-- Describe affected packages, services, RPCs, messages, fields, and HTTP mappings. -->

## Migration notes

<!-- State "None" when existing callers and implementations require no changes. -->

## Verification

- [ ] `buf format -d --exit-code`
- [ ] `buf lint`
- [ ] `buf build`
- [ ] `buf breaking --against '.git#branch=main'`
- [ ] `buf generate`
- [ ] Relevant behavior and boundary scenarios were tested or documented

## API compatibility checklist

- [ ] Existing field numbers were not reused
- [ ] Removed field names and numbers are reserved
- [ ] Existing REST paths and HTTP mappings remain compatible
- [ ] Breaking changes use a new major API package such as `v2`
- [ ] Generated files under `gen/` are not committed

## Testing evidence

<!-- Include commands, output summaries, or links to relevant test runs. -->

## Reviewer notes

<!-- Highlight design decisions, tradeoffs, and areas that need focused review. -->

