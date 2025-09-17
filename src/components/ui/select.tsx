
import React from 'react'
export function Select({ value, onValueChange, children }: any){ return <div>{React.Children.map(children, c => React.cloneElement(c, {value, onValueChange}))}</div> }
export function SelectTrigger({ children }: any){ return <div>{children}</div> }
export function SelectValue({ placeholder }: any){ return <span>{placeholder}</span> }
export function SelectContent({ children }: any){ return <div className='mt-2 space-y-1'>{children}</div> }
export function SelectItem({ value:val, value, onValueChange, children }: any){ return <button className='btn btn-outline w-full text-left' onClick={()=>onValueChange?.(val)}>{children}</button> }
