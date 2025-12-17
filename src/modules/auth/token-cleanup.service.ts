import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AuthService } from '@modules/auth/auth.service';

@Injectable()
export class TokenCleanupService {
  private readonly _logger = new Logger(TokenCleanupService.name);

  constructor(private readonly _authService: AuthService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanExpiredTokens() {
    this._logger.log('Starting expired tokens cleanup...');

    try {
      await this._authService.cleanExpiredTokens();
      this._logger.log('Expired tokens cleanup completed successfully');
    } catch (error) {
      this._logger.error('Error cleaning expired tokens:', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async cleanOldRevokedTokens() {
    this._logger.log('Starting old revoked tokens cleanup...');

    try {
      await this._authService.cleanOldRevokedTokens(30); // 30 días
      this._logger.log('Old revoked tokens cleanup completed successfully');
    } catch (error) {
      this._logger.error('Error cleaning old revoked tokens:', error);
    }
  }
}
