# Cloud AI Virtual Try-On API Provider Specification

## Architecture Overview
The application uses external Cloud AI APIs for high-fidelity generative virtual try-on, with **Genlook** configured as the initial provider.

The provider architecture is decoupled from the UI via the `AITryOnProvider` interface, allowing multiple providers to be registered without modifying the client interface.

---

## Provider Interface
Located at: `src/features/ai-try-on/types/aiTryOn.ts`

```typescript
export interface AITryOnProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;

  submitJob(
    personImage: Blob | string,
    garmentImage: Blob | string,
    options?: TryOnGenerationOptions
  ): Promise<TryOnJob>;

  pollJobStatus(jobId: string): Promise<TryOnJob>;

  cancelJob?(jobId: string): Promise<boolean>;
}
```

---

## Security Model
- **No API Keys in Renderer**: API credentials must remain in environment variables or main process storage.
- **Asynchronous Execution**: Try-on requests submit background jobs to prevent blocking the UI or 60 FPS live webcam stream.
- **Job Status Tracking**:
  - `queued` -> `uploading` -> `processing` -> `completed` / `failed`
