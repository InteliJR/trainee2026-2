import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

import type { ErrorCode, ErrorResponse } from '../contracts/common.js'
import { AppError } from './app-error.js'

type ValidationIssue = {
  instancePath?: string
  schemaPath?: string
  keyword?: string
  message?: string
}

function sendError(
  reply: FastifyReply,
  request: FastifyRequest,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
) {
  const body: ErrorResponse = {
    code,
    message,
    details,
    requestId: request.id,
  }

  return reply.status(statusCode).send(body)
}

function fastifyValidationDetails(error: FastifyError) {
  const issues = (error.validation ?? []) as ValidationIssue[]

  return {
    fields: issues.map((issue) => ({
      path: issue.instancePath || issue.schemaPath || '',
      code: issue.keyword || 'validation',
      message: issue.message || 'Invalid value',
    })),
  }
}

function isFastifyValidationError(error: unknown): error is FastifyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    Array.isArray(error.validation)
  )
}

function isFastifyContentTypeError(error: unknown): error is FastifyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.startsWith('FST_ERR_CTP_')
  )
}

function zodValidationDetails(error: ZodError) {
  return {
    fields: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
    })),
  }
}

export function registerErrorHandlers(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  app.setNotFoundHandler((request, reply) =>
    sendError(reply, request, 404, 'RESOURCE_NOT_FOUND', 'Route not found'),
  )

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return sendError(
        reply,
        request,
        error.statusCode,
        error.code,
        error.message,
        error.details,
      )
    }

    if (error instanceof ZodError) {
      return sendError(
        reply,
        request,
        400,
        'VALIDATION_ERROR',
        'Request validation failed',
        zodValidationDetails(error),
      )
    }

    if (isFastifyValidationError(error)) {
      return sendError(
        reply,
        request,
        400,
        'VALIDATION_ERROR',
        'Request validation failed',
        fastifyValidationDetails(error),
      )
    }

    if (isFastifyContentTypeError(error)) {
      return sendError(
        reply,
        request,
        error.statusCode ?? 400,
        'VALIDATION_ERROR',
        'Invalid request body',
        { fastifyCode: error.code },
      )
    }

    request.log.error({ err: error }, 'Unhandled request error')
    return sendError(
      reply,
      request,
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred',
    )
  })
}
