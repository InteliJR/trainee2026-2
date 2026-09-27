import type { HTMLAttributes } from 'react'
import styles from './Card.module.css'

export type CardProps = HTMLAttributes<HTMLElement>

export default function Card({ className, ...props }: CardProps) {
  const classes = [styles.card, className].filter(Boolean).join(' ')

  return <article className={classes} {...props} />
}
