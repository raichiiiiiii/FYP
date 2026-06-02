import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type {
  CreateDocumentInput,
  CreateDocumentVersionInput,
  UploadDocumentInput,
  UploadDocumentVersionInput,
} from './documents.service';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  listDocuments(@Query('organizationId') organizationId?: string) {
    return this.documentsService.list(organizationId);
  }

  @Post()
  createDocument(@Body() body: CreateDocumentInput) {
    return this.documentsService.create(body);
  }

  @Post('upload')
  uploadDocument(@Body() body: UploadDocumentInput) {
    return this.documentsService.upload(body);
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

  @Post(':id/versions/upload')
  uploadVersion(
    @Param('id') id: string,
    @Body() body: UploadDocumentVersionInput,
  ) {
    return this.documentsService.createUploadedVersion(id, body);
  }

  @Get(':id/versions/:versionId/preview')
  previewVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.documentsService.previewVersion(id, versionId);
  }

  @Get(':id/versions/:versionId/download')
  async downloadVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Res() response: Response,
  ) {
    const download = await this.documentsService.downloadVersion(id, versionId);

    response.setHeader('Content-Type', download.mimeType);
    response.setHeader('Content-Length', String(download.sizeBytes));
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${download.fileName.replace(/"/g, '')}"`,
    );
    response.send(download.content);
  }
}
