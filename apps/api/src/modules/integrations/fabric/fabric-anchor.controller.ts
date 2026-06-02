import { Body, Controller, Post } from '@nestjs/common';
import type { FabricAnchorInput } from './fabric-anchor.adapter';
import { FabricAnchorService } from './fabric-anchor.service';

@Controller('integrations/fabric/anchors')
export class FabricAnchorController {
  constructor(private readonly fabricAnchor: FabricAnchorService) {}

  @Post()
  requestAnchor(@Body() body: FabricAnchorInput) {
    return this.fabricAnchor.requestAnchor(body);
  }
}
