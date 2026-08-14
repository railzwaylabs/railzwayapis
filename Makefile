.PHONY: all breaking format generate lint

all: lint generate

format:
	buf format -w

lint:
	buf lint

generate:
	buf generate

# Compare the working tree against the API contract on the main branch.
breaking:
	buf breaking --against '.git#branch=main'

