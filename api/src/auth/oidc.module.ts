import { Global, Module } from '@nestjs/common';
import { OidcService } from './oidc.service.js';

@Global()
@Module({
    providers: [OidcService],
    exports: [OidcService]
})
export class OidcModule {}
