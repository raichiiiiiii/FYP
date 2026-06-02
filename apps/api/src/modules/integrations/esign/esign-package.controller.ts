import { Body, Controller, Post } from '@nestjs/common';
import type { EsignPackageInput } from './esign-adapter.interface';
import { EsignPackageService } from './esign-package.service';

@Controller('integrations/esign/packages')
export class EsignPackageController {
  constructor(private readonly esignPackages: EsignPackageService) {}

  @Post()
  requestPackage(@Body() body: EsignPackageInput) {
    return this.esignPackages.requestPackage(body);
  }
}
