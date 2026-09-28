import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type {
  CreateCollectionInput,
  MaterialType,
  MaterialUnit,
} from '../../types'
import MaterialField, {
  type MaterialFieldErrors,
  type MaterialDraft,
} from '../../components/collections/MaterialField'
import { Button, Field, Loading } from '../../components/ui'
import { useCollectionPoints } from '../../hooks/useCollectionPoints'
import styles from './SolicitarColeta.module.css'

const createEmptyMaterial = (): MaterialDraft => ({
  type: 'paper',
  quantity: 0,
  unit: 'kg',
  description: '',
})

export default function SolicitarColeta() {
  const { pontoId = '' } = useParams()
  const { points, status } = useCollectionPoints()
  const point = points.find(({ id }) => id === pontoId)
  const [materials, setMaterials] = useState<MaterialDraft[]>([
    createEmptyMaterial(),
  ])
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [scheduledAtError, setScheduledAtError] = useState<string>()
  const [materialsError, setMaterialsError] = useState<string>()
  const [materialErrors, setMaterialErrors] = useState<MaterialFieldErrors[]>(
    [],
  )

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
      setScheduledAtError('Informe a data e o horário da coleta.')
      isValid = false
    } else if (scheduledDate.getTime() <= Date.now()) {
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
      scheduledAt: scheduledDate!.toISOString(),
      notes: notes.trim() || undefined,
    }
    void input
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
        Voltar aos pontos de coleta
      </Link>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Nova solicitação</p>
        <h1>Agendar coleta</h1>
        <p>Informe os materiais e escolha quando a coleta deve acontecer.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.point} aria-labelledby="point-label">
          <span className={styles.fieldLabel} id="point-label">
            Ponto de coleta
          </span>
          <strong>{point.name}</strong>
        </section>

        <section className={styles.materialSection}>
          <div className={styles.sectionHeading}>
            <h2>Materiais</h2>
            <Button
              variant="secondary"
              type="button"
              onClick={() =>
                setMaterials((current) => [...current, createEmptyMaterial()])
              }
            >
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

        <Field id="collection-notes" label="Observações (opcional)">
          <textarea
            rows={4}
            maxLength={500}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className={styles.actions}>
          <Button type="submit">Solicitar coleta</Button>
        </div>
      </form>
    </section>
  )
}
