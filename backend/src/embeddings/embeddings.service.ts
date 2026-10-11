import { Injectable, InternalServerErrorException } from '@nestjs/common';
import ollama from 'ollama';

@Injectable()
export class EmbeddingsService {
  private readonly model = 'qwen3-embedding:0.6b';

  // Generates an embedding for the given text using the specified model
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text.trim()) {
      throw new Error('Cannot generate an embedding for empty text.');
    }

    try {
      const response = await ollama.embed({
        model: this.model,
        input: text,
      });

      const embedding = response.embeddings[0];

      if (!embedding || embedding.length === 0) {
        throw new Error('Ollama returned an empty embedding.');
      }

      return embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);

      throw new InternalServerErrorException(
        'Could not generate an embedding for the document text.',
      );
    }
  }
}
