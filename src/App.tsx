
import React, { useEffect, useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

type Question = { id:string; prompt:string; options:string[]; correctIndex:number; explanation?:string; tags?:string[]; createdAt:number }
type QuizSet = { id:string; name:string; description?:string; createdAt:number; questions: Question[] }

const STORAGE_KEY = 'quiz_personale_giustizia_v1'

function load(): QuizSet[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw) : [] } catch { return [] }
}
function save(data: QuizSet[]){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
function titleCase(s:string){ return s.replace(/\s+/g,' ').trim().replace(/(^|\s)\S/g, t=>t.toUpperCase()) }
function shuffle<T>(a:T[]):T[]{ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]] } return b }

export default function App(){
  const [tab, setTab] = useState<'play'|'create'|'archive'|'settings'>('create')
  const [sets, setSets] = useState<QuizSet[]>([])

  useEffect(()=>{ setSets(load()) },[])
  useEffect(()=>{ save(sets) },[sets])

  return (
    <div className='min-h-screen p-6'>
      <div className='mx-auto max-w-6xl'>
        <header className='flex items-center justify-between mb-6'>
          <h1 className='text-3xl font-bold'>Quiz personale – Concorso Giustizia</h1>
          <div className='flex gap-2'>
            <Export data={sets}/>
            <Import onImport={(incoming)=>{
              if(Array.isArray(incoming)){ setSets(prev=>mergeSets(prev,incoming as any)) }
              else if(incoming && Array.isArray(incoming.questions)){ setSets(prev=>[...prev, incoming as any]) }
            }}/>
          </div>
        </header>

        <nav className='flex gap-2 mb-6'>
          <Button variant={tab==='play'?'primary':'outline'} onClick={()=>setTab('play')}>Esercitati</Button>
          <Button variant={tab==='create'?'primary':'outline'} onClick={()=>setTab('create')}>Crea</Button>
          <Button variant={tab==='archive'?'primary':'outline'} onClick={()=>setTab('archive')}>Archivio</Button>
          <Button variant={tab==='settings'?'primary':'outline'} onClick={()=>setTab('settings')}>Impostazioni</Button>
        </nav>

        {tab==='play' && <Practice sets={sets}/>}
        {tab==='create' && <Create sets={sets} setSets={setSets}/>}
        {tab==='archive' && <Archive sets={sets} setSets={setSets}/>}
        {tab==='settings' && <Settings reset={()=>setSets([])}/>}
      </div>
    </div>
  )
}

function Export({ data }:{data:QuizSet[]}){
  const onClick = ()=>{
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`quiz_${new Date().toISOString().slice(0,10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }
  return <Button variant='outline' onClick={onClick}>Esporta</Button>
}

function Import({ onImport }:{ onImport:(d:any)=>void }){
  const handle = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files?.[0]; if(!f) return
    const reader = new FileReader()
    reader.onload = ()=>{ try{ onImport(JSON.parse(String(reader.result))) } catch { alert('File non valido') } }
    reader.readAsText(f); e.currentTarget.value = ''
  }
  return <label className='btn btn-outline px-3 py-2 border rounded-lg cursor-pointer'>
    <input type='file' accept='application/json' className='hidden' onChange={handle}/>
    Importa
  </label>
}

function mergeSets(existing:QuizSet[], incoming:QuizSet[]):QuizSet[]{
  const byName = new Map(existing.map(s=>[s.name,s] as const))
  const out = [...existing.map(s=>({...s, questions:[...s.questions]}))]
  for(const inc of incoming){
    const found = byName.get(inc.name)
    if(!found){ out.push(inc); continue }
    const prompts = new Set(found.questions.map(q=>q.prompt.trim()))
    const merged = [...found.questions]
    for(const q of inc.questions){ if(!prompts.has(q.prompt.trim())) merged.push(q) }
    const i = out.findIndex(x=>x.id===found.id)
    out[i] = { ...found, questions: merged }
  }
  return out
}

function Create({ sets, setSets }:{sets:QuizSet[]; setSets:React.Dispatch<React.SetStateAction<QuizSet[]>>}){
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  const add = ()=>{
    const n = titleCase(name); if(!n) return
    setSets(prev=>[...prev, { id: uuid(), name:n, description:desc||undefined, createdAt: Date.now(), questions: [] }])
    setName(''); setDesc('')
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
      <div className='card'>
        <div className='card-header'><div className='card-title'>Nuovo set</div></div>
        <div className='card-content space-y-2'>
          <label>Nome del set</label>
          <Input value={name} onChange={e=>setName(e.target.value)} placeholder='Es. L.241/1990'/>
          <label>Descrizione</label>
          <Textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder='Facoltativa'/>
          <Button onClick={add}>Crea set</Button>
        </div>
      </div>

      <div className='card md:col-span-2'>
        <div className='card-header'><div className='card-title'>Aggiungi domanda</div></div>
        <div className='card-content'><AddQuestion sets={sets} setSets={setSets}/></div>
      </div>
    </div>
  )
}

function AddQuestion({ sets, setSets }:{sets:QuizSet[]; setSets:React.Dispatch<React.SetStateAction<QuizSet[]>>}){
  const [setId, setSetId] = useState<string>(sets[0]?.id || '')
  const [prompt, setPrompt] = useState('')
  const [options, setOptions] = useState<string[]>(['','','',''])
  const [correct, setCorrect] = useState(0)
  const [tags, setTags] = useState('')
  const [explanation, setExplanation] = useState('')

  useEffect(()=>{ if(!setId && sets[0]) setSetId(sets[0].id) },[sets])

  const addQ = ()=>{
    if(!setId) return alert('Seleziona un set')
    const clean = options.map(o=>o.trim()).filter(Boolean)
    if(!prompt.trim() || clean.length<2) return alert('Almeno 2 opzioni')
    if(correct<0 || correct>=clean.length) return alert('Seleziona la corretta')
    const q:Question = { id: uuid(), prompt: prompt.trim(), options: clean, correctIndex: correct, explanation: explanation.trim()||undefined, tags: tags.split(',').map(t=>t.trim()).filter(Boolean), createdAt: Date.now() }
    setSets(prev=> prev.map(s=> s.id===setId ? { ...s, questions:[...s.questions, q] } : s))
    setPrompt(''); setOptions(['','','','']); setCorrect(0); setTags(''); setExplanation('')
  }

  return (
    <div className='space-y-3'>
      <label>Set</label>
      <select className='input' value={setId} onChange={e=>setSetId(e.target.value)}>
        {sets.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <label>Domanda</label>
      <Textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder='Testo della domanda'/>
      <label>Opzioni</label>
      <div className='space-y-2'>
        {options.map((o,i)=> (
          <div key={i} className='flex items-center gap-2'>
            <Input value={o} onChange={e=>setOptions(prev=> prev.map((p,idx)=> idx===i? e.target.value : p))} placeholder={`Opzione ${i+1}`}/>
            <label className='flex items-center gap-1 text-sm'>
              <input type='radio' name='correct' checked={i===correct} onChange={()=>setCorrect(i)}/> Corretta
            </label>
            {options.length>2 && <Button variant='outline' onClick={()=>setOptions(options.filter((_,idx)=>idx!==i))}>−</Button>}
          </div>
        ))}
        <Button variant='outline' onClick={()=>setOptions([...options,''])}>+ Aggiungi opzione</Button>
      </div>

      <label>Tag (separati da virgola)</label>
      <Input value={tags} onChange={e=>setTags(e.target.value)} placeholder='es. amministrativo, scia'/>
      <label>Spiegazione (facoltativa)</label>
      <Textarea value={explanation} onChange={e=>setExplanation(e.target.value)} placeholder='Perché è corretta...'/>
      <Button onClick={addQ}>Salva domanda</Button>
    </div>
  )
}

function Archive({ sets, setSets }:{sets:QuizSet[]; setSets:React.Dispatch<React.SetStateAction<QuizSet[]>>}){
  const removeSet = (id:string)=> setSets(prev=> prev.filter(s=>s.id!==id))
  return (
    <div className='space-y-3'>
      {sets.length===0 && <p className='text-slate-600'>Nessun set ancora.</p>}
      {sets.map(s=> (
        <div key={s.id} className='card'>
          <div className='card-header'><div className='card-title'>{s.name}</div></div>
          <div className='card-content space-y-2'>
            <p className='text-slate-700'>{s.description}</p>
            <div className='flex gap-2 flex-wrap'>
              <Badge variant='muted'>Domande: {s.questions.length}</Badge>
            </div>
            <Button variant='danger' onClick={()=>removeSet(s.id)}>Elimina set</Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Practice({ sets }:{sets:QuizSet[]}){
  const [selectedSets, setSelectedSets] = useState<string[]>(sets.map(s=>s.id))
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [num, setNum] = useState(10)
  const [session, setSession] = useState<null | { queue:Question[]; index:number; answers:{id:string;chosen:number;correct:number}[]; start:number }>(null)

  useEffect(()=>{ if(selectedSets.length===0 && sets.length) setSelectedSets(sets.map(s=>s.id)) },[sets])

  const all = useMemo(()=> sets.filter(s=>selectedSets.includes(s.id)).flatMap(s=>s.questions), [sets, selectedSets])
  const tags = useMemo(()=> { const t = new Set<string>(); sets.forEach(s=> s.questions.forEach(q=> q.tags?.forEach(x=>t.add(x)))); return Array.from(t).sort() }, [sets])
  const filtered = selectedTags.length? all.filter(q=> (q.tags||[]).some(t=>selectedTags.includes(t))) : all

  const start = ()=>{
    if(filtered.length===0) return alert('Nessuna domanda selezionata')
    const N = Math.min(num, filtered.length)
    setSession({ queue: shuffle(filtered).slice(0,N), index:0, answers:[], start: Date.now() })
  }

  if(!session){
    return (
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='card md:col-span-2'>
          <div className='card-header'><div className='card-title'>Configura sessione</div></div>
          <div className='card-content space-y-3'>
            <div>
              <label className='block mb-1'>Set inclusi</label>
              <div className='grid sm:grid-cols-2 gap-2'>
                {sets.map(s=> (
                  <label key={s.id} className='flex items-center gap-2'>
                    <input type='checkbox' checked={selectedSets.includes(s.id)} onChange={e=> setSelectedSets(prev=> e.target.checked? [...prev, s.id] : prev.filter(x=>x!==s.id)) }/>
                    {s.name} <span className='badge badge-muted ml-auto'>({s.questions.length})</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className='block mb-1'>Filtra per tag</label>
              <div className='flex flex-wrap gap-2'>
                {tags.map(t=> <button key={t} className={'btn '+(selectedTags.includes(t)?'btn-primary':'btn-outline')} onClick={()=> setSelectedTags(prev=> prev.includes(t)? prev.filter(x=>x!==t) : [...prev, t])}>{t}</button>)}
                {tags.length===0 && <span className='text-slate-500 text-sm'>Nessun tag ancora</span>}
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <label>Numero domande</label>
              <Input type='number' min={1} max={Math.max(1, filtered.length)} value={num} onChange={e=>setNum(Number(e.target.value))} className='w-28'/>
              <span className='badge badge-outline'>Disponibili: {filtered.length}</span>
            </div>
            <Button onClick={start}>Avvia sessione</Button>
          </div>
        </div>
        <div className='card'><div className='card-header'><div className='card-title'>Suggerimenti</div></div><div className='card-content text-sm text-slate-600'>Usa i tag per ripassare temi specifici. Esporta per fare un backup.</div></div>
      </div>
    )
  }

  const cur = session.queue[session.index]
  const answered = session.answers.find(a=>a.id===cur.id)
  const isLast = session.index === session.queue.length - 1

  const answer = (i:number)=>{ if(answered) return; setSession(prev=> prev? { ...prev, answers:[...prev.answers, { id: cur.id, chosen: i, correct: cur.correctIndex }] } : prev) }
  const next = ()=> setSession(prev=> prev? { ...prev, index: Math.min(prev.index+1, prev.queue.length-1)} : prev)
  const restart = ()=> setSession(null)

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between text-sm text-slate-600'>
        <div>Domanda {session.index+1}/{session.queue.length}</div>
        <div className='flex gap-2'>
          <span className='badge badge-muted'>Corrette {session.answers.filter(a=>a.chosen===a.correct).length}</span>
        </div>
      </div>
      <div className='card'>
        <div className='card-header'><div className='card-title'>{cur.prompt}</div></div>
        <div className='card-content space-y-3'>
          {cur.options.map((opt,i)=>{
            const selected = answered?.chosen===i
            const correct = i===cur.correctIndex
            return (
              <button key={i} className={'btn w-full justify-start '+ (answered? (correct? 'btn-primary' : selected? 'btn-danger' : 'btn-outline') : 'btn-outline')} onClick={()=>answer(i)} disabled={!!answered}>
                <span className='mr-2'>{String.fromCharCode(65+i)}.</span>{opt}
              </button>
            )
          })}
          {answered && cur.explanation && <div className='text-sm text-slate-700 p-3 border rounded-lg bg-slate-50'><strong>Spiegazione:</strong> {cur.explanation}</div>}
          <div className='flex justify-end gap-2'>{!isLast && <Button onClick={next}>Avanti</Button>}{isLast && <Button variant='outline' onClick={restart}>Termina</Button>}</div>
        </div>
      </div>
    </div>
  )
}

function Settings({ reset }:{reset:()=>void}){
  return (
    <div className='card max-w-xl'>
      <div className='card-header'><div className='card-title'>Impostazioni</div></div>
      <div className='card-content space-y-2'>
        <Button variant='danger' onClick={reset}>Resetta tutti i dati</Button>
        <p className='text-sm text-slate-600'>I dati sono salvati solo in questo dispositivo (LocalStorage).</p>
      </div>
    </div>
  )
}
