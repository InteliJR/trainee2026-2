import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type {
  CreateCollectionInput,
  MaterialType,
  MaterialUnit,
} from '../../types'
import MaterialField, {
  type MaterialFieldErrors,
  type MaterialDraft,
} from '../../components/collections/MaterialField'
import { Button, ErrorState, Field, Loading } from '../../components/ui'
import { useCollectionPoints } from '../../hooks/useCollectionPoints'
import { ApiError } from '../../services/api-error'
import { createCollection } from '../../services/coletasService'
import Icon from '../../components/ui/Icon'
import styles from './SolicitarColeta.module.css'

const createEmptyMaterial = (): MaterialDraft => ({
  type: 'paper',
  quantity: 0,
  unit: 'kg',
  description: '',
})

export default function SolicitarColeta() {
  const navigate = useNavigate()
  const { pontoId = '' } = useParams()
  const { points, status } = useCollectionPoints()
  const point = points.find(({ id }) => id === pontoId)
  const [materials, setMaterials] = useState<MaterialDraft[]>([
    createEmptyMaterial(),
  ])
  const [timing, setTiming] = useState<'now' | 'scheduled'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [scheduledAtError, setScheduledAtError] = useState<string>()
  const [materialsError, setMaterialsError] = useState<string>()
  const [materialErrors, setMaterialErrors] = useState<MaterialFieldErrors[]>(
    [],
  )
  const [submitError, setSubmitError] = useState<Error | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateMaterial(index: number, value: MaterialDraft) {
    setMaterials((current) =>
      current.map((material, itemIndex) =>
        itemIndex === index ? value : material,
      ),
    )
    setMaterialErrors((current) =>
      current.map((errors, itemIndex) => (itemIndex === index ? {} : errors)),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    let isValid = true
    const nextMaterialErrors = materials.map((material) => {
      const errors: MaterialFieldErrors = {}
      if (!Number.isFinite(material.quantity) || material.quantity <= 0) {
        errors.quantity = 'Informe uma quantidade maior que zero.'
      } else if (
        material.unit !== 'kg' &&
        !Number.isInteger(material.quantity)
      ) {
        errors.quantity = 'Use uma quantidade inteira para unidades ou sacos.'
      }
      if (material.type === 'other' && !material.description.trim()) {
        errors.description = 'Descreva o material.'
      }
      if (Object.keys(errors).length > 0) isValid = false
      return errors
    })

    if (materials.length === 0) {
      setMaterialsError('Adicione pelo menos um material.')
      isValid = false
    } else {
      setMaterialsError(undefined)
    }
    setMaterialErrors(nextMaterialErrors)

    const scheduledDate =
      timing === 'scheduled' && scheduledAt ? new Date(scheduledAt) : null
    if (
      timing === 'scheduled' &&
      (!scheduledDate || Number.isNaN(scheduledDate.getTime()))
    ) {
      setScheduledAtError('Informe a data e o horário da coleta.')
      isValid = false
    } else if (scheduledDate && scheduledDate.getTime() <= Date.now()) {
      setScheduledAtError('Escolha uma data e horário futuros.')
      isValid = false
    } else {
      setScheduledAtError(undefined)
    }

    if (!isValid) return

    const input: CreateCollectionInput = {
      collectionPointId: pontoId,
      materials: materials.map(({ type, quantity, unit, description }) => ({
        type: type as MaterialType,
        quantity,
        unit: unit as MaterialUnit,
        ...(description.trim() ? { description: description.trim() } : {}),
      })),
      ...(scheduledDate ? { scheduledAt: scheduledDate.toISOString() } : {}),
      notes: notes.trim() || undefined,
    }
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const response = await createCollection(input)
      navigate(`/morador/coletas/${response.data.id}`)
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause))
      let shownInField = false
      if (error instanceof ApiError) {
        if (error.code === 'INVALID_SCHEDULE') {
          setScheduledAtError(error.message)
          shownInField = true
        }
        if (error.code === 'VALIDATION_ERROR') {
          const fields = error.details.fields
          if (Array.isArray(fields)) {
            const nextMaterialErrors = [...materialErrors]
            for (const field of fields) {
              if (typeof field !== 'object' || field === null) continue
              const { path, message } = field as {
                path?: unknown
                message?: unknown
              }
              if (typeof path !== 'string' || typeof message !== 'string') {
                continue
              }
              if (path === 'scheduledAt') {
                setScheduledAtError(message)
                shownInField = true
              }
              const materialMatch = path.match(
                /^materials\.(\d+)\.(quantity|description|type|unit)$/,
              )
              if (materialMatch) {
                const index = Number(materialMatch[1])
                const fieldName = materialMatch[2] as keyof MaterialFieldErrors
                nextMaterialErrors[index] = {
                  ...nextMaterialErrors[index],
                  [fieldName]: message,
                }
                shownInField = true
              }
            }
            setMaterialErrors(nextMaterialErrors)
          }
        }
      }
      setSubmitError(shownInField ? null : error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || status === 'idle') {
    return <Loading label="Carregando ponto de coleta" />
  }

  if (!point) {
    return (
      <section className={styles.page}>
        <h1>Ponto de coleta não encontrado</h1>
        <Link to="/morador">Voltar aos pontos de coleta</Link>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to="/morador">
        <Icon name="back" size={16} />
        Voltar aos pontos de coleta
      </Link>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Nova solicitação</p>
        <h1>Solicitar coleta</h1>
        <p>
          Informe os materiais e escolha se a coleta será agora ou em uma data
          futura.
        </p>
      </header>

      <div className={styles.requestLayout}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError &&
            !(
              submitError instanceof ApiError &&
              submitError.code === 'VALIDATION_ERROR'
            ) && (
              <ErrorState
                code={
                  submitError instanceof ApiError ? submitError.code : undefined
                }
                message={submitError.message}
              />
            )}
          <section className={styles.point} aria-labelledby="point-label">
            <span className={styles.fieldLabel} id="point-label">
              Ponto de coleta
            </span>
            <strong>{point.name}</strong>
          </section>

          <section className={styles.materialSection}>
            <div className={styles.sectionHeading}>
              <h2 className="inline-icon">
                <Icon name="box" size={19} />
                Materiais
              </h2>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  setMaterials((current) => [...current, createEmptyMaterial()])
                }
              >
                <Icon name="plus" size={16} />
                Adicionar material
              </Button>
            </div>
            {materialsError && (
              <p className={styles.formError} role="alert">
                {materialsError}
              </p>
            )}
            <div className={styles.materials}>
              {materials.map((material, index) => (
                <MaterialField
                  key={index}
                  index={index}
                  value={material}
                  errors={materialErrors[index]}
                  canRemove={materials.length > 1}
                  onChange={(value) => updateMaterial(index, value)}
                  onRemove={() =>
                    setMaterials((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                />
              ))}
            </div>
          </section>

          <fieldset className={styles.timing}>
            <legend>Quando deseja a coleta?</legend>
            <label>
              <input
                type="radio"
                name="timing"
                checked={timing === 'now'}
                onChange={() => {
                  setTiming('now')
                  setScheduledAtError(undefined)
                }}
              />
              Agora
            </label>
            <label>
              <input
                type="radio"
                name="timing"
                checked={timing === 'scheduled'}
                onChange={() => setTiming('scheduled')}
              />
              Escolher data futura
            </label>
          </fieldset>

          {timing === 'scheduled' && (
            <Field
              id="scheduled-at"
              label="Data e horário da coleta"
              error={scheduledAtError}
            >
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => {
                  setScheduledAt(event.target.value)
                  setScheduledAtError(undefined)
                }}
              />
            </Field>
          )}

          <Field id="collection-notes" label="Observações (opcional)">
            <textarea
              rows={4}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          <div className={styles.actions}>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Solicitar coleta'}
              <Icon name="arrow" size={17} />
            </Button>
          </div>
        </form>
        <aside className={styles.guide}>
          <span className={styles.guideIcon}>
            <Icon name="route" size={24} />
          </span>
          <p className={styles.eyebrow}>UM NOVO CICLO EM 3 PASSOS</p>
          <h2>
            Da sua casa a<br />
            um novo destino.
          </h2>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Escolha o ponto</strong>
                <p>O destino dos seus recicláveis já está selecionado.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Conte o que vai entregar</strong>
                <p>Informe o tipo, a quantidade e o melhor momento.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Acompanhe a coleta</strong>
                <p>Veja cada etapa até a conclusão.</p>
              </div>
            </li>
          </ol>
          <div className={styles.guideNote}>
            <Icon name="leaf" size={18} />
            <p>Materiais limpos e separados facilitam o próximo ciclo.</p>
          </div>
        </aside>
      </div>
    </section>
  )
}
