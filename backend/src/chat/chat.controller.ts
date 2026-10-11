import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from '@/chat/chat.service';
import { ChatRequestDto } from '@/chat/dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: ChatRequestDto) {
    const answer = await this.chatService.chat(body.message);

    return { answer };
  }

  @Post('stream')
  @HttpCode(HttpStatus.OK)
  async chatStream(
    @Body() body: ChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    const abortController = new AbortController();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');

    // The browser canceled the request or closed the connection.
    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    try {
      for await (const chunk of this.chatService.chatStream(
        body.message,
        abortController.signal,
      )) {
        if (abortController.signal.aborted || res.destroyed) {
          break;
        }

        res.write(chunk);
      }

      if (!res.destroyed && !res.writableEnded) {
        res.end();
      }
    } catch (error) {
      if (abortController.signal.aborted || res.destroyed) {
        // Expected cancellation: do not return 500.
        return;
      }

      console.error('Ollama streaming failed:', error);

      if (!res.headersSent) {
        res.status(500).json({
          message: 'Could not get a response from the local LLM.',
        });
      } else if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    }
  }
}
