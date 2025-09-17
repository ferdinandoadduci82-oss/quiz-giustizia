
import React, { useState } from 'react'
export function Tabs({ value, onValueChange, children, className='' }: any) {
  return <div className={className}>{React.Children.map(children, c => c)}</div>
}
export function TabsList({ children }: any) { return <div className='tabs'>{children}</div> }
export function TabsTrigger({ value, children, activeValue, onClick }: any) {
  const active = value === activeValue
  return <button className='tabs-trigger' data-active={active} onClick={() => onClick?.(value)}>{children}</button>
}
export function TabsContent({ when, activeValue, children }: any) {
  if (when !== activeValue) return null
  return <div className='tabs-content'>{children}</div>
}
