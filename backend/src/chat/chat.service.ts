import { Injectable, InternalServerErrorException } from '@nestjs/common';
import ollama from 'ollama';

@Injectable()
export class ChatService {
  async chat(message: string): Promise<string> {
    try {
      const response = await ollama.chat({
        model: 'qwen3:4b',
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        stream: false,
      });

      return response.message.content;
    } catch (error) {
      console.error('Ollama request failed:', error);
      throw new InternalServerErrorException(
        'Could not get a response from the local LLM.',
      );
    }
  }

  async *chatStream(
    message: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    if (signal?.aborted) {
      return;
    }

    const stream = await ollama.chat({
      model: 'qwen3:4b',
      messages: [{ role: 'user', content: message }],
      stream: true,
    });

    const abortStream = () => stream.abort();

    signal?.addEventListener('abort', abortStream, { once: true });

    try {
      // Client might have disconnected while waiting for Ollama
      if (signal?.aborted) {
        stream.abort();
        return;
      }

      for await (const part of stream) {
        if (signal?.aborted) {
          stream.abort();
          return;
        }

        const content = part.message.content;

        if (content) {
          yield content;
        }
      }
    } catch (error) {
      // Cancellation is expected, not a server error
      if (signal?.aborted) {
        return;
      }

      throw error;
    } finally {
      signal?.removeEventListener('abort', abortStream);
    }
  }
}
