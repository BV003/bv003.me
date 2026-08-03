---
title: "Code Notes: mini-sglang"
slug: "minisglang-code"
pubDate: 2026-07-31
tags: ["Tech"]
---

mini-sglang can be understood as **three layers**: Frontend, Scheduler, and Engine. Layers communicate via ZMQ messages; GPUs communicate via NCCL.

### Three-Layer Architecture

#### Frontend Layer: user-facing

Runs in independent processes, handles all interaction with the outside world:

- **API Server** (`minisgl/server/api_server.py`): FastAPI process. Receives `/v1/chat/completions` requests, assigns a `uid`, streams results back as SSE. The `FrontendManager` class uses `asyncio` to manage concurrent user requests.
- **Tokenizer** (`minisgl/tokenizer/server.py`): separate process. Converts text → token IDs, produces `UserMsg` (containing `uid`, `input_ids`, `sampling_params`) and sends to the scheduler layer. Also handles abort requests.
- **Detokenizer** (`minisgl/tokenizer/server.py`): separate process. Converts token IDs → text, produces `UserReply` back to the API Server. Tokenizer and detokenizer are the same `tokenize_worker` function — the ZMQ address determines the role: `DetokenizeMsg` takes the detokenize path, `TokenizeMsg` takes the tokenize path.

Frontend ↔ Scheduler communication uses **ZMQ**. All message types are defined in `minisgl/message/` with automatic JSON serialization:
- `BaseFrontendMsg`: API Server ↔ tokenizer/detokenizer (e.g. `UserReply`)
- `BaseBackendMsg`: tokenizer/detokenizer ↔ scheduler (e.g. `UserMsg`, `DetokenizeMsg`)
- Batching supported: `BatchBackendMsg` carries multiple messages in one ZMQ round-trip.

#### Scheduler Layer: what to compute

The brain of the system. One scheduler process per GPU, code in `minisgl/scheduler/`:

| Module | File | Role |
|---|---|---|
| `Scheduler` | `scheduler.py` | Main loop + I/O. Inherits `SchedulerIOMixin` for ZMQ communication with the frontend layer. Loop: receive messages → schedule next batch → forward to engine → process results. Supports `normal_loop` and `overlap_loop` modes |
| `PrefillManager` | `prefill.py` | Manages the waiting queue (`pending_list`). Prefill phase: checks prefix cache, allocates `table_idx`, supports **chunked prefill** (splitting long prompts, marked with `ChunkedReq`) |
| `DecodeManager` | `decode.py` | Manages the set of decoding requests (`running_reqs`). Picks runnable requests to form a decode batch |
| `CacheManager` | `cache.py` | KV cache page allocator. Manages `free_slots` (free token positions), delegates to `BasePrefixCache` for prefix matching/insertion/eviction. Triggers eviction when free pages run out |
| `TableManager` | `table.py` | Manages rows of the `page_table` (one row per request's KV cache mapping). Allocates and reclaims `table_idx` |

Scheduler and Engine share one process but run on **different CUDA streams**. The scheduler stream handles metadata (copying tokens, updating page table); the engine stream runs model forward. The key trick in `overlap_loop`: while batch N executes on the engine stream, the scheduler stream simultaneously processes results from batch N-1. The two streams synchronize via `wait_stream`.

#### Engine Layer: how to compute

The part that actually runs on GPU. Code in `minisgl/engine/` and `minisgl/models/`:

| Module | File | Role |
|---|---|---|
| `Engine` | `engine/engine.py` | One per GPU. Initializes in order: model → KV cache → page table → attention backend → MoE backend → sampler → CUDA graphs. Exposes only `forward_batch(batch) → (next_tokens_gpu, next_tokens_cpu, event)` |
| `GraphRunner` | `engine/graph.py` | CUDA graph capture and replay. During decode the batch shape is fixed, so CUDA graphs eliminate kernel launch overhead. Captures multiple batch sizes (1,2,4,8...), at runtime picks the nearest graph ≥ actual `padded_size` |
| `Sampler` | `engine/sample.py` | Samples next token from logits. Greedy: direct `argmax`. Non-greedy: uses flashinfer's `top_k_top_p_sampling_from_probs` |
| `BaseLLMModel` | `models/base.py` | Model abstraction — just `forward() → logits`. Implementations: `LlamaForCausalLM`, `Qwen3ForCausalLM`, `Qwen3MoeForCausalLM`. All composed from `BaseOP` subclasses, no `nn.Module` dependency |
| `BaseAttnBackend` | `attention/base.py` | Attention backend abstraction. `HybridBackend` delegates prefill and decode to different implementations: prefill uses FlashAttention (`fa.py`) or FlashInfer (`fi.py`), decode optionally uses TRT-LLM (`trtllm.py`) |
| `BaseKVCachePool` | `kvcache/base.py` | GPU buffer for KV cache. `MHAKVCache` is a big tensor of shape `(2, num_layers, num_pages, page_size, heads, head_dim)`. `store_kv()` writes by `out_loc` indices |
| `BasePrefixCache` | `kvcache/base.py` | Prefix cache abstraction. `RadixPrefixCache` uses a radix tree to match common token prefixes and reuse KV cache |

### Communication: ZMQ + NCCL

| | Transport | What flows |
|---|---|---|
| ZMQ | PUSH/PULL + PUB/SUB | Control messages: token IDs, sampling params, generated results, abort signals. Small volume, latency-sensitive |
| NCCL | `torch.distributed` | GPU-to-GPU tensor communication: attention and MoE all-reduce. Large volume, bandwidth-sensitive |

**Only rank 0 talks to the frontend layer.** Rank 0 receives messages from the tokenizer and broadcasts them to ranks 1..N via ZMQ PUB/SUB; only rank 0 sends results to the detokenizer. Other ranks only participate in NCCL, transparent to the frontend.

### Request Lifecycle

```
1. API Server  receives HTTP POST
2. Tokenizer   text → token IDs → UserMsg
3. Scheduler   enqueues into PrefillManager.pending_list
4. CacheManager  checks prefix cache (radix tree matches common prefix)
5. PrefillManager  allocates table_idx + KV cache pages → forms prefill batch
6. Engine.forward_batch() → model forward → sample → next token
   (when tp > 1, NCCL all-reduce after each attention/mlp layer)
7. Scheduler   sends result to Detokenizer (rank 0 only)
8. Detokenizer  token ID → text → UserReply
9. API Server  streams as SSE back to user
10. DecodeManager  continues decoding: loop steps 5-9 until EOS or max_tokens
```

### Two Running Modes

- **Online** (`python -m minisgl`): full multi-process deployment, `SchedulerIOMixin` reads/writes via ZMQ.
- **Offline** (`LLM.generate()`): single process. `LLM` inherits `Scheduler` and replaces `offline_receive_msg` / `offline_send_result` with in-memory list/dict operations. Used for benchmarks.
