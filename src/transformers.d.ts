declare module "@huggingface/transformers" {
  export interface TensorLike {
    data: Float32Array | Float64Array;
    tolist(): number[][];
  }
  export function pipeline(
    task: string,
    model?: string,
    options?: Record<string, unknown>,
  ): Promise<(texts: string | string[], options?: Record<string, unknown>) => Promise<TensorLike>>;
}
