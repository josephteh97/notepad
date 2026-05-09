import { useRef } from 'react'
import { Plus, X } from 'lucide-react'
import type { ChecklistItem } from '../db/types'

interface ChecklistEditorProps {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
}

export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const nextId = useRef(Date.now())

  function addItem() {
    onChange([...items, { id: String(nextId.current++), text: '', checked: false }])
  }

  function toggle(id: string) {
    onChange(items.map((item) => item.id === id ? { ...item, checked: !item.checked } : item))
  }

  function updateText(id: string, text: string) {
    onChange(items.map((item) => item.id === id ? { ...item, text } : item))
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id))
  }

  const incomplete = items.filter((i) => !i.checked)
  const complete = items.filter((i) => i.checked)

  return (
    <div className="flex flex-col gap-1">
      {incomplete.map((item) => (
        <CheckRow
          key={item.id}
          item={item}
          onToggle={() => toggle(item.id)}
          onChangeText={(t) => updateText(item.id, t)}
          onRemove={() => removeItem(item.id)}
        />
      ))}
      {complete.length > 0 && (
        <>
          <div className="text-xs text-slate-400 mt-2 mb-1 px-2">{complete.length} 项已完成</div>
          {complete.map((item) => (
            <CheckRow
              key={item.id}
              item={item}
              onToggle={() => toggle(item.id)}
              onChangeText={(t) => updateText(item.id, t)}
              onRemove={() => removeItem(item.id)}
              dimmed
            />
          ))}
        </>
      )}
      <button
        onClick={addItem}
        className="flex items-center gap-2 px-2 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mt-1"
      >
        <Plus size={16} />
        添加项目
      </button>
    </div>
  )
}

function CheckRow({
  item,
  onToggle,
  onChangeText,
  onRemove,
  dimmed,
}: {
  item: ChecklistItem
  onToggle: () => void
  onChangeText: (t: string) => void
  onRemove: () => void
  dimmed?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 px-1 ${dimmed ? 'opacity-50' : ''}`}>
      <button
        onClick={onToggle}
        className={`
          flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
          ${item.checked
            ? 'bg-amber-400 border-amber-400'
            : 'border-slate-300 dark:border-slate-600'}
        `}
      >
        {item.checked && (
          <svg viewBox="0 0 12 10" width="10" height="10" fill="none" stroke="white" strokeWidth="2">
            <polyline points="1,5 4,8 11,1" />
          </svg>
        )}
      </button>
      <input
        type="text"
        value={item.text}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="新建待办事项"
        className={`
          flex-1 bg-transparent outline-none text-sm py-1
          text-slate-800 dark:text-slate-100 placeholder:text-slate-400
          ${item.checked ? 'line-through text-slate-400' : ''}
        `}
      />
      <button onClick={onRemove} className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 p-1">
        <X size={14} />
      </button>
    </div>
  )
}
