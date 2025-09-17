
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Shuffle, PlayCircle, Save, CheckCircle2, XCircle, Edit, Trash2, Plus, Download, Upload } from 'lucide-react'

type Question = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  tags?: string[];
  createdAt: number;
};

type QuizSet = {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  createdAt: number;
};

const STORAGE_KEY = 'quiz_personale_giustizia_v1'

function loadData(): QuizSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch { return [] }
}
function saveData(sets: QuizSet[]){ localStorage.setItem(STORAGE_KEY, JSON.stringify(sets)) }

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function titleCase(s: string){ return s.replace(/\s+/g, ' ').trim().replace(/(^|\s)\S/g, t => t.toUpperCase()) }
function formatDuration(ms: number){ const s = Math.floor(ms/1000); const m = Math.floor(s/60); const remS = s%60; return `${m}m ${remS}s` }

export default function App(){
  const [sets, setSets] = useState<QuizSet[]>([])
  const [activeTab, setActiveTab] = useState('esercitati')

  useEffect(()=>{ setSets(loadData()) },[])
  useEffect(()=>{ saveData(sets) },[sets])

  return (
    <div className='min-h-screen w-full bg-slate-50 p-6'>
      <div className='mx-auto max-w-6xl space-y-6'>
        <header className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Quiz personale – Concorso Giustizia</h1>
            <p className='text-slate-600'>Crea, archivia ed esercitati sui tuoi quiz. Tutto resta in locale (LocalStorage).</p>
          </div>
          <div className='flex gap-2'>
            <ExportButton data={sets} />
            <ImportButton onImport={(incoming)=>{ if(Array.isArray(incoming)) setSets(prev=>mergeSets(prev,incoming)) }} />
          </div>
        </header>

        <div>
          <Tabs className='w-full'>
            <TabsList>
              <TabsTrigger value='esercitati' activeValue={activeTab} onClick={setActiveTab}>Esercitati</TabsTrigger>
              <TabsTrigger value='crea' activeValue={activeTab} onClick={setActiveTab}>Crea</TabsTrigger>
              <TabsTrigger value='archivio' activeValue={activeTab} onClick={setActiveTab}>Archivio</TabsTrigger>
              <TabsTrigger value='impostazioni' activeValue={activeTab} onClick={setActiveTab}>Impostazioni</TabsTrigger>
            </TabsList>
            <TabsContent when='esercitati' activeValue={activeTab}><Practice sets={sets} /></TabsContent>
            <TabsContent when='crea' activeValue={activeTab}><Create sets={sets} setSets={setSets} /></TabsContent>
            <TabsContent when='archivio' activeValue={activeTab}><Archive sets={sets} setSets={setSets} /></TabsContent>
            <TabsContent when='impostazioni' activeValue={activeTab}><Settings resetAll={()=>setSets([])} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function ExportButton({ data }: { data: QuizSet[] }){
  const handleExport = ()=>{
    const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quiz_personali_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  return <button className='btn btn-secondary gap-2' onClick={handleExport}><Download size={18}/> Esporta</button>
}

function ImportButton({ onImport }: { onImport: (data:any)=>void }){
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader()
    reader.onload = ()=>{
      try { onImport(JSON.parse(String(reader.result))) } catch { alert('File non valido') }
    }
    reader.readAsText(file)
    e.currentTarget.value = ''
  }
  return (
    <label className='inline-flex'>
      <input type='file' accept='application/json' onChange={handleImport} className='hidden' />
      <button className='btn btn-outline gap-2'><Upload size={18}/> Importa</button>
    </label>
  )
}

function mergeSets(existing: QuizSet[], incoming: QuizSet[]): QuizSet[]{
  const byName = new Map(existing.map(s=>[s.name,s] as const))
  const result = [...existing.map(s=>({...s, questions: [...s.questions]}))]
  for(const inc of incoming){
    const found = byName.get(inc.name)
    if(!found){ result.push(inc); continue }
    const prompts = new Set(found.questions.map(q=>q.prompt.trim()))
    const merged = [...found.questions]
    for(const q of inc.questions){ if(!prompts.has(q.prompt.trim())) merged.push(q) }
    const idx = result.findIndex(r=>r.id===found.id)
    result[idx] = { ...found, questions: merged }
  }
  return result
}

function Create({ sets, setSets }: { sets: QuizSet[]; setSets: (u:(prev:QuizSet[])=>QuizSet[])=>void }){
  const [setName, setSetName] = useState('')
  const [setDesc, setSetDesc] = useState('')

  function addSet(){
    const name = titleCase(setName); if(!name) return;
    const newSet: QuizSet = { id: uuid(), name, description: setDesc.trim() || undefined, questions: [], createdAt: Date.now() }
    setSets(prev=>[...prev, newSet])
    setSetName(''); setSetDesc('')
  }

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
      <div className='card lg:col-span-1'>
        <div className='card-header'><div className='card-title'>Nuovo set</div></div>
        <div className='card-content space-y-3'>
          <Label>Nome del set</Label>
          <Input value={setName} onChange={e=>setSetName(e.target.value)} placeholder='Es. Diritto Amministrativo' />
          <Label>Descrizione (facoltativa)</Label>
          <Textarea value={setDesc} onChange={e=>setSetDesc(e.target.value)} placeholder='Breve descrizione' />
          <button className='btn btn-default gap-2' onClick={addSet}><Plus size={18}/> Crea set</button>
        </div>
      </div>

      <div className='card lg:col-span-2'>
        <div className='card-header'><div className='card-title'>Aggiungi domande</div></div>
        <div className='card-content space-y-4'><AddQuestionForm sets={sets} setSets={setSets} /></div>
      </div>
    </div>
  )
}

function AddQuestionForm({ sets, setSets }: { sets: QuizSet[]; setSets: (u:(prev:QuizSet[])=>QuizSet[])=>void }){
  const [selectedSetId, setSelectedSetId] = useState<string | null>(sets[0]?.id ?? null)
  const [prompt, setPrompt] = useState('')
  const [options, setOptions] = useState<string[]>(['','','',''])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [tagsInput, setTagsInput] = useState('')
  const [explanation, setExplanation] = useState('')

  useEffect(()=>{ if(!selectedSetId && sets[0]) setSelectedSetId(sets[0].id) },[sets, selectedSetId])

  function addQuestion(){
    if(!selectedSetId) return alert('Seleziona un set')
    const cleanOpts = options.map(o=>o.trim()).filter(Boolean)
    if(!prompt.trim() || cleanOpts.length < 2) return alert('Inserisci domanda e almeno 2 opzioni')
    if(correctIndex < 0 || correctIndex >= cleanOpts.length) return alert("Seleziona l'opzione corretta")
    const q: Question = { id: uuid(), prompt: prompt.trim(), options: cleanOpts, correctIndex, explanation: explanation.trim() || undefined, tags: tagsInput.split(',').map(t=>t.trim()).filter(Boolean), createdAt: Date.now() }
    setSets(prev=>prev.map(s=> s.id===selectedSetId ? { ...s, questions: [...s.questions, q]} : s))
    setPrompt(''); setOptions(['','','','']); setCorrectIndex(0); setTagsInput(''); setExplanation('')
  }

  return (
    <div className='space-y-3'>
      <Label>Set</Label>
      <Select value={selectedSetId ?? undefined} onValueChange={(v:any)=>setSelectedSetId(v)}>
        <SelectTrigger><SelectValue placeholder='Seleziona set' /></SelectTrigger>
        <SelectContent>
          {sets.map(s=> <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Label>Domanda</Label>
      <Textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder='Testo della domanda' />

      <div className='space-y-2'>
        <Label>Opzioni (min 2)</Label>
        {options.map((opt,i)=>(
          <div key={i} className='flex items-center gap-2'>
            <Input value={opt} onChange={e=>setOptions(prev=>prev.map((p,idx)=> idx===i? e.target.value : p))} placeholder={`Opzione ${i+1}`} />
            <div className='flex items-center gap-2'>
              <Checkbox checked={i===correctIndex} onCheckedChange={()=>setCorrectIndex(i)} id={`correct-${i}`} />
              <Label htmlFor={`correct-${i}`}>Corretta</Label>
            </div>
            {options.length>2 && <button className='btn' onClick={()=>setOptions(options.filter((_,idx)=>idx!==i))}><Trash2 size={18}/></button>}
          </div>
        ))}
        <button className='btn btn-outline gap-2' onClick={()=>setOptions([...options,''])}><Plus size={18}/> Aggiungi opzione</button>
      </div>

      <Label>Tags (separati da virgola)</Label>
      <Input value={tagsInput} onChange={e=>setTagsInput(e.target.value)} placeholder='Es. penale, prove, amministrativo' />

      <Label>Spiegazione (facoltativa)</Label>
      <Textarea value={explanation} onChange={e=>setExplanation(e.target.value)} placeholder='Spiega perché la risposta è corretta' />

      <div className='pt-2'>
        <button className='btn btn-default gap-2' onClick={addQuestion}><Save size={18}/> Salva domanda</button>
      </div>
    </div>
  )
}

function Practice({ sets }: { sets: QuizSet[] }){
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>(sets.map(s=>s.id))
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [numQuestions, setNumQuestions] = useState(10)
  const [session, setSession] = useState<null | { queue: Question[]; index: number; answers: {id:string; chosen:number; correct:number}[]; startedAt: number }>(null)

  useEffect(()=>{ if(selectedSetIds.length===0 && sets.length) setSelectedSetIds(sets.map(s=>s.id)) },[sets])

  const filteredQuestions = useMemo(()=>{
    const all = sets.filter(s=>selectedSetIds.includes(s.id)).flatMap(s=>s.questions)
    const byTags = selectedTags.length ? all.filter(q=> (q.tags ?? []).some(t=>selectedTags.includes(t))) : all
    return byTags
  },[sets, selectedSetIds, selectedTags])

  function start(){
    if(filteredQuestions.length===0) return alert('Nessuna domanda selezionata')
    const N = Math.min(numQuestions, filteredQuestions.length)
    const queue = shuffleArray(filteredQuestions).slice(0,N)
    setSession({ queue, index: 0, answers: [], startedAt: Date.now() })
  }

  if(!session){
    return (
      <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
        <div className='card md:col-span-2'>
          <div className='card-header'><div className='card-title'>Seleziona banca domande</div></div>
          <div className='card-content space-y-4'>
            <div>
              <Label className='mb-2 block'>Set inclusi</Label>
              <div className='scroll-area h-40 rounded border p-3 bg-white'>
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  {sets.map(s=>(
                    <label key={s.id} className='flex items-center gap-2'>
                      <input type='checkbox' checked={selectedSetIds.includes(s.id)} onChange={(e)=> setSelectedSetIds(prev=> e.target.checked ? [...prev, s.id] : prev.filter(id=>id!==s.id)) } />
                      <span>{s.name}</span>
                      <span className='badge badge-secondary ml-auto'>{s.questions.length}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className='separator'></div>

            <TagPicker sets={sets} selected={selectedTags} onChange={setSelectedTags} />

            <div className='flex items-center gap-3'>
              <Label>Numero di domande</Label>
              <Input type='number' min={1} max={max1(filteredQuestions.length)} value={numQuestions} onChange={e=>setNumQuestions(Number(e.target.value))} className='w-28' />
              <span className='badge badge-outline'>Disponibili: {filteredQuestions.length}</span>
            </div>

            <button className='btn btn-default gap-2' onClick={start}><PlayCircle size={18}/> Avvia sessione</button>
          </div>
        </div>

        <div className='card'>
          <div className='card-header'><div className='card-title'>Consigli rapidi</div></div>
          <div className='card-content space-y-2 text-sm text-slate-600'>
            <ul className='list-disc pl-5 space-y-1'>
              <li>Usa i <strong>tag</strong> per ripassare un tema specifico.</li>
              <li>Esporta periodicamente la banca domande per un <em>backup</em>.</li>
              <li>Aggiungi spiegazioni: fissano meglio i concetti.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  const current = session.queue[session.index]
  const isLast = session.index === session.queue.length - 1

  function answer(choice:number){
    setSession(prev=>{
      if(!prev) return prev
      const already = prev.answers.find(a=>a.id===current.id); if(already) return prev
      return { ...prev, answers: [...prev.answers, { id: current.id, chosen: choice, correct: current.correctIndex }] }
    })
  }
  function next(){ setSession(prev=> prev ? { ...prev, index: Math.min(prev.index+1, prev.queue.length-1) } : prev) }
  function restart(){ setSession(null) }

  const given = session.answers.find(a=>a.id===current.id)
  const correct = !!given && given.chosen === given.correct

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='text-sm text-slate-600'>Domanda {session.index+1} / {session.queue.length}</div>
        <div className='flex items-center gap-2 text-sm'>
          <span className='badge badge-secondary'>Corrette: {session.answers.filter(a=>a.chosen===a.correct).length}</span>
          <span className='badge badge-outline'>Tempo: {formatDuration(Date.now()-session.startedAt)}</span>
        </div>
      </div>

      <div className='card'>
        <div className='card-header'><div className='card-title'>{current.prompt}</div></div>
        <div className='card-content space-y-3'>
          <div className='grid gap-2'>
            {current.options.map((opt, i)=>{
              const selected = given?.chosen === i
              const isCorrect = i === current.correctIndex
              const showState = Boolean(given)
              const variant = showState ? (isCorrect ? 'btn-default' : selected ? 'btn-destructive' : 'btn-outline') : 'btn-outline'
              return (
                <button key={i} className={`btn ${variant} justify-start`} onClick={()=>answer(i)} disabled={Boolean(given)}>
                  <span className='mr-2'>{String.fromCharCode(65+i)}.</span> {opt}
                  {showState && isCorrect && <CheckCircle2 className='ml-auto' size={18} />}
                  {showState && selected && !isCorrect && <XCircle className='ml-auto' size={18} />}
                </button>
              )
            })}
          </div>

          {given && current.explanation && (
            <div className='rounded-lg bg-slate-50 p-3 text-sm text-slate-700 border'>
              <strong>Spiegazione: </strong>{current.explanation}
            </div>
          )}

          <div className='flex justify-between pt-1'>
            <button className='btn btn-outline gap-2' onClick={()=>{
              const mapping = shuffleArray(current.options.map((_,i)=>i))
              const newOptions = mapping.map(idx=>current.options[idx])
              const newCorrect = mapping.indexOf(current.correctIndex)
              const newQ: Question = { ...current, options: newOptions, correctIndex: newCorrect }
              // update session queue
              setSession(prev=> prev ? { ...prev, queue: prev.queue.map((q,idx)=> idx===prev.index ? newQ : q) } : prev)
            }}><Shuffle size={18}/> Mescola opzioni</button>

            <div className='flex gap-2'>
              {!isLast && <button className='btn btn-default' onClick={next}>Avanti</button>}
              {isLast && <button className='btn btn-secondary' onClick={restart}>Termina</button>}
            </div>
          </div>
        </div>
      </div>

      <Results session={session} onRestart={restart} />
    </div>
  )
}

function TagPicker({ sets, selected, onChange }: { sets: QuizSet[]; selected: string[]; onChange: (t:string[])=>void }){
  const tags = React.useMemo(()=>{
    const t = new Set<string>()
    sets.forEach(s=> s.questions.forEach(q=> q.tags?.forEach(x=> t.add(x))))
    return Array.from(t).sort((a,b)=> a.localeCompare(b))
  }, [sets])

  return (
    <div className='space-y-2'>
      <Label>Filtra per tag</Label>
      <div className='flex flex-wrap gap-2'>
        {tags.length===0 && <span className='text-sm text-slate-500'>Nessun tag disponibile</span>}
        {tags.map(t=>{
          const active = selected.includes(t)
          return (
            <button key={t} className={`btn ${active ? 'btn-default' : 'btn-outline'} btn-sm`} onClick={()=> onChange(active ? selected.filter(x=>x!==t) : [...selected, t])}>
              {t}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Results({ session, onRestart }: any){
  if(!session) return null
  const total = session.queue.length
  const correct = session.answers.filter((a:any)=>a.chosen===a.correct).length
  const score = Math.round((correct/total)*100)
  return (
    <div className='card'>
      <div className='card-header'><div className='card-title'>Risultati</div></div>
      <div className='card-content flex flex-wrap items-center gap-3 text-sm text-slate-700'>
        <span className='badge badge-outline'>Punteggio: {score}%</span>
        <span className='badge badge-secondary'>Corrette: {correct}/{total}</span>
        <span className='badge badge-outline'>Durata: {formatDuration(Date.now()-session.startedAt)}</span>
        <button className='btn btn-default ml-auto' onClick={onRestart}>Nuova sessione</button>
      </div>
    </div>
  )
}

function max1(n:number){ return Math.max(1, n) }
