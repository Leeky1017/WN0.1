# Notes: issue-153-embedding-migration

## Decisions

### ONNX asset selection (non-AVX512)
- **Decision**: Default to `onnx/model.onnx` for non-AVX512 environments.
- **Why**: `onnx/model_O4.onnx` fails to load under `onnxruntime-node` in this environment with an `ai.onnx.ml` opset compatibility error, which triggers a WASM fallback that is incompatible with Node worker execution (blob worker url). Using `model.onnx` avoids the fallback and keeps inference in the Node backend.
- **Override**: `WN_TEXT2VEC_ONNX_VARIANT` supports forcing `avx512_vnni` / `o4` / `f32` for diagnostics.

### Embedding dimension for `shibing624/text2vec-base-chinese`
- **Observation**: The sentence embedding dimension is **768** (SentenceTransformers pooling config: `word_embedding_dimension: 768`).
- **Action**: Validation checks and smoke tests use 768.

### New IPC error code: `ENCODING_FAILED`
- **Decision**: Add `ENCODING_FAILED` to the IPC contract error codes.
- **Why**: Needed to distinguish "model not ready" vs "encoding failed" while still keeping stable, user-actionable semantics (`MODEL_NOT_READY` / `TIMEOUT` / `CANCELED` / `ENCODING_FAILED`).

## Later
- Consider caching model assets across `rpc:smoke` runs to reduce wall time (without violating the “real model + real persistence” E2E constraint).

