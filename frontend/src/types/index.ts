// Espelho manual dos contratos do backend; atualize quando os schemas Zod mudarem.
export type { LoginInput, LoginResponse, User, UserRole } from './auth'
export type { CollectionPoint, CollectionPointKind } from './collection-points'
export type {
  Collection,
  CollectionListQuery,
  CollectionListResponse,
  CollectionStatus,
  CreateCollectionInput,
  Material,
  MaterialType,
  MaterialUnit,
} from './collections'
export type {
  AssignmentResponse,
  Collector,
  CollectorStatus,
  CollectorResponse,
  UpdateAvailabilityInput,
} from './collectors'
export type {
  RewardBalance,
  RewardTransaction,
  RewardTransactionKind,
  RewardTransactionListResponse,
  RewardTransactionReason,
} from './rewards'
export type {
  DataResponse,
  ErrorCode,
  ErrorResponse,
  PaginatedResponse,
} from './common'

export type { ResidentDashboard, CollectorSummary, CollectorCollectionView, CollectorCollectionListResponse } from './dashboard'
