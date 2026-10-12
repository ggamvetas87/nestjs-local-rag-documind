// src/vector-store/vector-store.module.ts

import { Module } from '@nestjs/common';
import { VectorStoreService } from '@/vector-store/vector-store.service';

@Module({
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
