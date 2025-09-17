import React from 'react'
export function Checkbox({checked,onCheckedChange,id}:any){return <input id={id} type='checkbox' checked={!!checked} onChange={(e)=>onCheckedChange?.(e.target.checked)} />}