import type { ErrorCode } from '../types/common'
import { ApiError } from '../services/api-error'

export const errorMessages: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Confira os dados informados e tente novamente.',
  INVALID_SCHEDULE: 'A data escolhida não está disponível para agendamento.',
  UNAUTHORIZED: 'Sua sessão expirou. Entre novamente para continuar.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  RESOURCE_NOT_FOUND: 'Não encontramos o conteúdo solicitado.',
  COLLECTION_NOT_CANCELLABLE: 'Esta coleta não pode mais ser cancelada.',
  COLLECTION_NOT_COMPLETABLE: 'Esta coleta ainda não pode ser concluída.',
  NO_ACTIVE_ASSIGNMENT: 'Você não tem uma coleta atribuída no momento.',
  ECOROTA_UNAVAILABLE: 'O serviço de coleta está temporariamente indisponível.',
  INTERNAL_ERROR: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
}

export function getErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError) return errorMessages[cause.code]
  return fallback
}
