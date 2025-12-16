import { IsOptional, IsEmail, IsUUID } from 'class-validator';

export class GetProfileQuery {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
