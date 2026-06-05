import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CreateHashRecordInput } from './hash-records.service';
import { HashRecordsService } from './hash-records.service';

@Controller('hash-records')
export class HashRecordsController {
  constructor(private readonly hashRecordsService: HashRecordsService) {}

  @Post()
  createHashRecord(@Body() body: CreateHashRecordInput) {
    return this.hashRecordsService.create(body);
  }

  @Get(':id')
  getHashRecord(@Param('id') id: string) {
    return this.hashRecordsService.getById(id);
  }

  @Get(':id/verify')
  verifyHashRecord(@Param('id') id: string) {
    return this.hashRecordsService.verify(id);
  }

  @Get(':id/fabric-verification')
  verifyFabricAnchor(@Param('id') id: string) {
    return this.hashRecordsService.fabricVerification(id);
  }
}
