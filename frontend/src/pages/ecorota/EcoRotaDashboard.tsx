import { useState } from 'react'
import Icon from '../../components/ui/Icon'
import styles from './EcoRotaDashboard.module.css'

type Period = 'day' | 'week' | 'month' | 'year' | 'total'

type SeriesPoint = { label: string; collections: number; kg: number }

const periodLabels: Record<Period, string> = {
  day: 'Hoje', week: 'Esta semana', month: 'Este mês', year: 'Este ano', total: 'Todo o período',
}

const series: Record<Period, SeriesPoint[]> = {
  day: [
    { label: '07h', collections: 8, kg: 64 }, { label: '09h', collections: 17, kg: 138 },
    { label: '11h', collections: 25, kg: 204 }, { label: '13h', collections: 19, kg: 152 },
    { label: '15h', collections: 32, kg: 261 }, { label: '17h', collections: 27, kg: 219 },
    { label: '19h', collections: 13, kg: 104 },
  ],
  week: [
    { label: 'Seg', collections: 54, kg: 432 }, { label: 'Ter', collections: 68, kg: 561 },
    { label: 'Qua', collections: 62, kg: 503 }, { label: 'Qui', collections: 81, kg: 684 },
    { label: 'Sex', collections: 74, kg: 608 }, { label: 'Sáb', collections: 46, kg: 369 },
    { label: 'Dom', collections: 28, kg: 227 },
  ],
  month: [
    { label: 'Sem 1', collections: 221, kg: 1781 }, { label: 'Sem 2', collections: 264, kg: 2138 },
    { label: 'Sem 3', collections: 239, kg: 1962 }, { label: 'Sem 4', collections: 307, kg: 2494 },
  ],
  year: [
    { label: 'Jan', collections: 712, kg: 5680 }, { label: 'Fev', collections: 684, kg: 5498 },
    { label: 'Mar', collections: 821, kg: 6610 }, { label: 'Abr', collections: 789, kg: 6358 },
    { label: 'Mai', collections: 902, kg: 7292 }, { label: 'Jun', collections: 874, kg: 7043 },
    { label: 'Jul', collections: 958, kg: 7780 }, { label: 'Ago', collections: 1012, kg: 8214 },
    { label: 'Set', collections: 934, kg: 7560 }, { label: 'Out', collections: 1081, kg: 8791 },
    { label: 'Nov', collections: 0, kg: 0 }, { label: 'Dez', collections: 0, kg: 0 },
  ],
  total: [
    { label: '2022', collections: 3810, kg: 29840 }, { label: '2023', collections: 6240, kg: 49610 },
    { label: '2024', collections: 7930, kg: 63880 }, { label: '2025', collections: 9560, kg: 77420 },
    { label: '2026', collections: 8057, kg: 65226 },
  ],
}

const materials = [
  { name: 'Papel e papelão', color: 'paper', quantities: [34, 31, 33, 32, 32], kg: 18420 },
  { name: 'Plástico', color: 'plastic', quantities: [28, 29, 27, 28, 29], kg: 16280 },
  { name: 'Vidro', color: 'glass', quantities: [18, 19, 20, 19, 18], kg: 10940 },
  { name: 'Metal', color: 'metal', quantities: [13, 13, 12, 13, 13], kg: 7210 },
  { name: 'Eletrônicos e outros', color: 'other', quantities: [7, 8, 8, 8, 8], kg: 4380 },
]

const frequentPoints = [
  { name: 'Ponto Central', district: 'Centro', count: 184 },
  { name: 'Parque do Ipê', district: 'Jardim das Flores', count: 156 },
  { name: 'Praça da Estação', district: 'Vila Nova', count: 129 },
  { name: 'Ecoponto Norte', district: 'Santa Clara', count: 98 },
]

const peakHours = [
  { time: '08h–10h', count: 92 }, { time: '10h–12h', count: 148 },
  { time: '12h–14h', count: 104 }, { time: '14h–16h', count: 186 },
  { time: '16h–18h', count: 132 }, { time: '18h–20h', count: 64 },
]

const recurringResidents = [
  { initials: 'MC', name: 'Mariana Costa', neighborhood: 'Centro', collections: 24 },
  { initials: 'RA', name: 'Rafael Alves', neighborhood: 'Vila Nova', collections: 19 },
  { initials: 'JS', name: 'Joana Silva', neighborhood: 'Santa Clara', collections: 16 },
  { initials: 'PL', name: 'Pedro Lima', neighborhood: 'Jardim das Flores', collections: 13 },
]

const fmt = new Intl.NumberFormat('pt-BR')
const kgFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export default function EcoRotaDashboard() {
  const [period, setPeriod] = useState<Period>('month')
  const points = series[period]
  const maxCollections = Math.max(...points.map((point) => point.collections), 1)
  const maxKg = Math.max(...points.map((point) => point.kg), 1)
  const totalCollections = points.reduce((sum, point) => sum + point.collections, 0)
  const totalKg = points.reduce((sum, point) => sum + point.kg, 0)
  const periodIndex: Record<Period, number> = { day: 0, week: 1, month: 2, year: 3, total: 4 }
  const topMaterial = [...materials].sort((a, b) => b.quantities[periodIndex[period]] - a.quantities[periodIndex[period]])[0]
  const baseScheduledTotal = peakHours.reduce((sum, hour) => sum + hour.count, 0)
  const scheduledTotal = Math.round(totalCollections * .7)
  const currentPeakHours = peakHours.map((hour) => ({ ...hour, count: Math.round(scheduledTotal * hour.count / baseScheduledTotal) }))
  const maxPeakCount = Math.max(...currentPeakHours.map((hour) => hour.count), 1)
  const completionRate: Record<Period, number> = { day: 85, week: 86, month: 87, year: 89, total: 84 }

  return (
    <section className={styles.page}>
      <div className={styles.content}>
        <p className={styles.demoBadge}><span />Demonstração com dados simulados</p>
        <section className={styles.intro}>
          <div>
            <p className={styles.eyebrow}><Icon name="grid" size={14} /> VISÃO GERAL DA OPERAÇÃO</p>
            <h1>Dashboard EcoRota</h1>
            <p className={styles.subtitle}>Acompanhe o ritmo das coletas e o impacto da reciclagem.</p>
          </div>
          <div className={styles.updated}><span className={styles.liveDot} />Painel de demonstração <span>·</span> atualizado agora</div>
        </section>

        <nav className={styles.periods} aria-label="Período dos indicadores">
          {(['day', 'week', 'month', 'year', 'total'] as Period[]).map((value) => (
            <button key={value} type="button" className={period === value ? styles.selectedPeriod : ''} aria-pressed={period === value} onClick={() => setPeriod(value)}>{periodLabels[value]}</button>
          ))}
        </nav>

        <section className={styles.kpis} aria-label={`Indicadores de ${periodLabels[period].toLowerCase()}`}>
          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}><span>COLETAS NO PERÍODO</span><span className={`${styles.kpiIcon} ${styles.green}`}><Icon name="recycle" size={18} /></span></div>
            <strong>{fmt.format(totalCollections)}</strong>
            <p><span className={styles.positive}>+8,4%</span> em relação ao período anterior</p>
            <div className={styles.spark} aria-hidden="true">{points.map((point) => <i key={point.label} style={{ height: `${Math.max(14, point.collections / maxCollections * 100)}%` }} />)}</div>
          </article>
          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}><span>MATERIAL COLETADO</span><span className={`${styles.kpiIcon} ${styles.amber}`}><Icon name="box" size={18} /></span></div>
            <strong>{kgFmt.format(totalKg)} <small>kg</small></strong>
            <p>Materiais registrados no período</p>
            <div className={styles.kpiFoot}><span className={styles.kpiDot} />Papel lidera a coleta</div>
          </article>
          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}><span>TAXA DE CONCLUSÃO</span><span className={`${styles.kpiIcon} ${styles.blue}`}><Icon name="check" size={18} /></span></div>
            <strong>{completionRate[period]}<small>%</small></strong>
            <p><span className={styles.positive}>+2,1 p.p.</span> em relação ao período anterior</p>
            <div className={styles.progressTrack}><i style={{ width: `${completionRate[period]}%` }} /></div>
          </article>
          <article className={`${styles.kpiCard} ${styles.activeKpi}`}>
            <div className={styles.kpiTop}><span>EM ANDAMENTO AGORA</span><span className={`${styles.kpiIcon} ${styles.orange}`}><Icon name="truck" size={18} /></span></div>
            <strong>18</strong>
            <p><span className={styles.liveDot} /> atendimentos ativos neste momento</p>
            <div className={styles.kpiFoot}>12 em deslocamento <span>·</span> 6 em coleta</div>
          </article>
        </section>

        <section className={styles.mainGrid}>
          <article className={`${styles.panel} ${styles.trendPanel}`}>
            <div className={styles.panelHeading}>
              <div><p className={styles.eyebrow}>ATIVIDADE</p><h2>Evolução das coletas</h2><p>Solicitações registradas · {periodLabels[period].toLowerCase()}</p></div>
              <span className={styles.panelMetric}><strong>{fmt.format(totalCollections)}</strong><small>coletas</small></span>
            </div>
            <div className={styles.barChart} role="img" aria-label={`Coletas por intervalo: ${points.map((point) => `${point.label}, ${point.collections}`).join('; ')}`}>
              <div className={styles.chartYLabels}><span>{fmt.format(maxCollections)}</span><span>{fmt.format(Math.round(maxCollections * .66))}</span><span>{fmt.format(Math.round(maxCollections * .33))}</span><span>0</span></div>
              <div className={styles.bars}>
                {points.map((point) => <div className={styles.barColumn} key={point.label}><span className={styles.barValue}>{fmt.format(point.collections)}</span><div className={styles.barTrack}><i style={{ height: `${Math.max(point.collections ? 7 : 0, point.collections / maxCollections * 100)}%` }} /></div><span className={styles.barLabel}>{point.label}</span></div>)}
              </div>
            </div>
            <div className={styles.chartLegend}><span><i className={styles.legendCollections} />Coletas</span><span>Comparação agregada por {period === 'day' ? 'horário' : period === 'week' ? 'dia' : period === 'month' ? 'semana' : period === 'year' ? 'mês' : 'ano'}</span></div>
          </article>

          <article className={`${styles.panel} ${styles.materialPanel}`}>
            <div className={styles.panelHeading}>
              <div><p className={styles.eyebrow}>IMPACTO</p><h2>Volume de materiais</h2><p>Quantidade registrada ao longo do tempo</p></div>

            </div>
            <div className={styles.volumeSummary}><strong>{kgFmt.format(totalKg)} kg</strong><span>{periodLabels[period]}</span></div>
            <div className={styles.volumeBars} role="img" aria-label="Quantidade de material coletado em quilogramas por intervalo">
              {points.map((point) => <div className={styles.volumeColumn} key={point.label}><span>{fmt.format(point.kg)}</span><div><i style={{ height: `${Math.max(point.kg ? 7 : 0, point.kg / maxKg * 100)}%` }} /></div><small>{point.label}</small></div>)}
            </div>
            <div className={styles.volumeNote}><Icon name="info" size={15} /> Volume separado por unidade para evitar somar kg, unidades e sacos como se fossem equivalentes.</div>
          </article>
        </section>

        <section className={styles.lowerGrid}>
          <article className={`${styles.panel} ${styles.materialRank}`}>
            <div className={styles.panelHeading}><div><p className={styles.eyebrow}>COMPOSIÇÃO</p><h2>Materiais mais frequentes</h2><p>Participação nos registros do período</p></div><span className={styles.rankPeriod}>{periodLabels[period]}</span></div>
            <div className={styles.topMaterial}><span className={styles.trophy}><Icon name="award" size={20} /></span><div><small>MAIS FREQUENTE</small><strong>{topMaterial.name}</strong></div><b>{topMaterial.quantities[periodIndex[period]]}%</b></div>
            <div className={styles.rankList}>{materials.map((material) => <div className={styles.rankRow} key={material.name}><span>{material.name}</span><div className={styles.rankTrack}><i className={styles[material.color]} style={{ width: `${material.quantities[periodIndex[period]] * 2.7}%` }} /></div><strong>{material.quantities[periodIndex[period]]}%</strong></div>)}</div>
          </article>

          <article className={`${styles.panel} ${styles.pointsPanel}`}>
            <div className={styles.panelHeading}><div><p className={styles.eyebrow}>ONDE ACONTECE</p><h2>Pontos mais frequentes</h2><p>Locais com mais solicitações · {periodLabels[period].toLowerCase()}</p></div><span className={styles.pinIcon}><Icon name="pin" size={18} /></span></div>
            <ol className={styles.pointsList}>{frequentPoints.map((point, index) => <li key={point.name}><span className={styles.pointRank}>0{index + 1}</span><span className={styles.pointPin}><Icon name="pin" size={16} /></span><span className={styles.pointName}><strong>{point.name}</strong><small>{point.district}</small></span><span className={styles.pointCount}>{fmt.format(Math.round(point.count * (totalCollections / 1031)))}<small>coletas</small></span></li>)}</ol>
          </article>

          <article className={`${styles.panel} ${styles.peakPanel}`}>
            <div className={styles.panelHeading}><div><p className={styles.eyebrow}>AGENDA</p><h2>Horários programados</h2><p>Faixas de pico com base em scheduledAt</p></div><span className={styles.clockIcon}><Icon name="clock" size={18} /></span></div>
            <div className={styles.peakTotal}><strong>{fmt.format(scheduledTotal)}</strong><span>agendamentos considerados</span></div>
            <div className={styles.peakList}>{currentPeakHours.map((item) => <div className={styles.peakRow} key={item.time}><span>{item.time}</span><div><i style={{ width: `${item.count / maxPeakCount * 100}%` }} /></div><strong>{fmt.format(item.count)}</strong></div>)}</div>
            <p className={styles.dataNote}>A faixa indica o horário escolhido pelo morador, não o horário real de conclusão.</p>
          </article>

          <article className={`${styles.panel} ${styles.residentsPanel}`}>
            <div className={styles.panelHeading}><div><p className={styles.eyebrow}>COMUNIDADE</p><h2>Moradores recorrentes</h2><p>5 ou mais coletas concluídas</p></div><span className={styles.residentCount}>248<strong>pessoas</strong></span></div>
            <div className={styles.residentTable}>
              <div className={styles.tableHead}><span>MORADOR</span><span>BAIRRO</span><span>COLETAS</span></div>
              {recurringResidents.map((resident) => <div className={styles.residentRow} key={resident.name}><span className={styles.avatar}>{resident.initials}</span><strong>{resident.name}</strong><span className={styles.neighborhood}>{resident.neighborhood}</span><span className={styles.collectionPill}>{resident.collections}</span></div>)}
            </div>
            <p className={styles.dataNote}>Lista ilustrativa. A demonstração usa nomes e quantidades fictícios.</p>
          </article>
        </section>

        <footer className={styles.footer}><span><Icon name="leaf" size={15} /> Cada coleta faz parte de uma mudança maior.</span><span>EcoRota · Painel de demonstração</span></footer>
      </div>
    </section>
  )
}
