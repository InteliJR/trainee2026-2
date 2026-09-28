import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type {
  CreateCollectionInput,
  MaterialType,
  MaterialUnit,
} from '../../types'
import MaterialField, {
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

  function updateMaterial(index: number, value: MaterialDraft) {
    setMaterials((current) =>
      current.map((material, itemIndex) =>
        itemIndex === index ? value : material,
      ),
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: CreateCollectionInput = {
      collectionPointId: pontoId,
      materials: materials.map(({ type, quantity, unit, description }) => ({
        type: type as MaterialType,
        quantity,
        unit: unit as MaterialUnit,
        ...(description.trim() ? { description: description.trim() } : {}),
      })),
      scheduledAt: scheduledAt
        ? new Date(scheduledAt).toISOString()
        : undefined,
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
          <div className={styles.materials}>
            {materials.map((material, index) => (
              <MaterialField
                key={index}
                index={index}
                value={material}
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

        <Field id="scheduled-at" label="Data e horário da coleta">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
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
