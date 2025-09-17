
import React from 'react'

export function Button({ variant='default', size='md', className='', ...props }: any) {
  const map = {
    default: 'btn btn-default',
    outline: 'btn btn-outline',
    secondary: 'btn btn-secondary',
    destructive: 'btn btn-destructive',
    ghost: 'btn',
  } as any
  return <button className={`${map[variant] ?? map.default} ${className}`} {...props} />
}
