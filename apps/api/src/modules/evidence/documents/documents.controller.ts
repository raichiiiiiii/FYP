import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type {
  CreateDocumentInput,
  CreateDocumentVersionInput,
} from './documents.service';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  createDocument(@Body() body: CreateDocumentInput) {
    return this.documentsService.create(body);
  }

  @Get(':id')
  getDocument(@Param('id') id: string) {
    return this.documentsService.getById(id);
  }

  @Post(':id/versions')
  createVersion(
    @Param('id') id: string,
    @Body() body: CreateDocumentVersionInput,
  ) {
    return this.documentsService.createVersion(id, body);
  }
}
