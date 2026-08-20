import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../gen/openapiv2", import.meta.url));
function errorResponse(description, code, message) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/railzway.api.ErrorResponse" },
        example: {
          error: {
            code,
            message,
            details: [],
          },
        },
      },
    },
  };
}

const standardResponses = {
  400: errorResponse(
    "The request is malformed or contains an invalid argument.",
    "INVALID_ARGUMENT",
    "The request contains an invalid argument",
  ),
  401: errorResponse(
    "Authentication is missing, expired, revoked, or otherwise invalid.",
    "UNAUTHENTICATED",
    "A valid API key is required",
  ),
  403: errorResponse(
    "The credential is valid but lacks permission for this operation or organization.",
    "PERMISSION_DENIED",
    "Permission denied",
  ),
  default: errorResponse(
    "An unexpected error response using Fare's stable HTTP error envelope.",
    "INTERNAL",
    "Internal server error",
  ),
};
const schemas = {
  "railzway.api.ErrorDetail": {
    type: "object",
    properties: {
      field: { type: "string", description: "Request field that failed validation." },
      rule: { type: "string", description: "Stable validation rule identifier." },
      message: { type: "string", description: "Developer-facing validation message." },
    },
    required: ["field", "rule", "message"],
  },
  "railzway.api.Error": {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "Stable application error code, for example INVALID_ARGUMENT.",
      },
      message: { type: "string", description: "Developer-facing error message." },
      details: {
        type: "array",
        items: { $ref: "#/components/schemas/railzway.api.ErrorDetail" },
      },
    },
    required: ["code", "message", "details"],
  },
  "railzway.api.ErrorResponse": {
    type: "object",
    properties: {
      error: { $ref: "#/components/schemas/railzway.api.Error" },
    },
    required: ["error"],
  },
};

async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? jsonFiles(path) : path.endsWith(".json") ? [path] : [];
  }));
  return nested.flat();
}

for (const file of await jsonFiles(root)) {
  const document = JSON.parse(await readFile(file, "utf8"));
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const operation of Object.values(pathItem ?? {})) {
      if (operation && typeof operation === "object" && operation.responses) {
        for (const [status, response] of Object.entries(standardResponses)) {
          operation.responses[status] ??= response;
        }
      }
    }
  }
  document.components ??= {};
  document.components.schemas ??= {};
  delete document.components.schemas["google.rpc.Status"];
  Object.assign(document.components.schemas, schemas);
  await writeFile(file, `${JSON.stringify(document, null, 2)}\n`);
}
