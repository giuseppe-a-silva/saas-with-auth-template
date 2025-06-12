import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationChannel } from '../interfaces/notification-dispatcher.interface';

/**
 * DTO para filtros de busca de templates
 * Permite filtrar templates por diferentes critérios
 */
@InputType({ description: 'Filtros para busca de templates de notificação' })
export class TemplateFiltersDto {
  /**
   * Chave do evento para filtrar
   * Busca templates específicos de um evento
   */
  @Field(() => String, {
    nullable: true,
    description: 'Chave do evento para filtrar',
  })
  @IsOptional()
  @IsString({ message: 'A chave do evento deve ser uma string.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  eventKey?: string;

  /**
   * Canal de notificação para filtrar
   * Busca templates de um canal específico
   */
  @Field(() => NotificationChannel, {
    nullable: true,
    description: 'Canal de notificação para filtrar',
  })
  @IsOptional()
  @IsEnum(NotificationChannel, {
    message: 'Canal deve ser uma das opções válidas.',
  })
  channel?: NotificationChannel;

  /**
   * Status ativo para filtrar
   * Busca apenas templates ativos ou inativos
   */
  @Field(() => Boolean, {
    nullable: true,
    description: 'Status ativo para filtrar',
  })
  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser um valor booleano.' })
  isActive?: boolean;
}
