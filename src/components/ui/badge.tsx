
import React from 'react'
export function Badge({ variant='outline', className='', ...props }: any) {
  const map:any = { outline: 'badge badge-outline', secondary: 'badge badge-secondary' }
  return <span className={`${map[variant] ?? map.outline} ${className}`} {...props} />
}
