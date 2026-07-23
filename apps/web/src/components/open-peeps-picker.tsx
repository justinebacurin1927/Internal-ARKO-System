'use client'

import { useState, useEffect, useMemo } from 'react'
import { Effigy, EffigyBodies, Faces, Heads, Beards, Accessories } from '@opeepsfun/open-peeps'
import type { AvatarConfigJson } from '../lib/avatar'

// ── Parts catalogue (mirrors the component props) ───────────────

const SKIN_TONES = [
  { value: '#D08B5B', label: 'Warm sand' },
  { value: '#E0AC69', label: 'Golden' },
  { value: '#C27C4A', label: 'Tan' },
  { value: '#A45D2E', label: 'Caramel' },
  { value: '#8B4513', label: 'Brown' },
  { value: '#F1C27D', label: 'Peach' },
  { value: '#DEB887', label: 'Burlywood' },
  { value: '#CD853F', label: 'Peru' },
  { value: '#E8BEAC', label: 'Almond' },
  { value: '#F5DEB3', label: 'Wheat' },
] as const

const HAIR_COLORS = [
  { value: '#1C1C1C', label: 'Black' },
  { value: '#3A2E1E', label: 'Dark brown' },
  { value: '#5C3A1E', label: 'Chestnut' },
  { value: '#8B5E3C', label: 'Light brown' },
  { value: '#B8860B', label: 'Golden' },
  { value: '#DAA520', label: 'Blonde' },
  { value: '#D2691E', label: 'Auburn' },
  { value: '#A0522D', label: 'Copper' },
  { value: '#4A3728', label: 'Espresso' },
  { value: '#2F1B0E', label: 'Darkest' },
] as const

const CLOTHING_COLORS = [
  { value: '#8FA7DF', label: 'Periwinkle' },
  { value: '#E76F51', label: 'Coral' },
  { value: '#2A9D8F', label: 'Teal' },
  { value: '#E9C46A', label: 'Sand' },
  { value: '#F4A261', label: 'Orange' },
  { value: '#264653', label: 'Dark teal' },
  { value: '#6B9080', label: 'Sage' },
  { value: '#A8DADC', label: 'Ice' },
  { value: '#457B9D', label: 'Steel' },
  { value: '#1D3557', label: 'Navy' },
  { value: '#E63946', label: 'Red' },
  { value: '#F1FAEE', label: 'White' },
  { value: '#588157', label: 'Forest' },
  { value: '#A3B18A', label: 'Khaki' },
  { value: '#780000', label: 'Maroon' },
] as const

function partLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

// ── Color Swatch ───────────────────────────────────────

function ColorSwatch({
  color,
  label,
  selected,
  onClick,
}: {
  color: string
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`h-7 w-7 rounded-full shrink-0 ring-offset-2 transition-all cursor-pointer ${
        selected ? 'ring-2 ring-accent-500 scale-110' : 'ring-1 ring-black/[0.08] hover:scale-105'
      }`}
      style={{ backgroundColor: color }}
    />
  )
}

// ── Part Selector (dropdown) ───────────────────────────

function PartSelect({
  label,
  parts,
  value,
  onChange,
  noneOption,
}: {
  label: string
  parts: readonly string[]
  value: string | undefined
  onChange: (v: string | undefined) => void
  noneOption?: string
}) {
  return (
    <div className="min-w-0">
      <label className="block text-[11px] font-medium text-text-tertiary mb-0.5">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full rounded-lg border border-border-subtle bg-card px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
      >
        {noneOption && <option value="">{noneOption}</option>}
        {parts.map((p) => (
          <option key={p} value={p}>
            {partLabel(p)}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────

interface OpenPeepsPickerProps {
  currentAvatar?: AvatarConfigJson
  onChange: (config: AvatarConfigJson) => void
}

// ── Color list ─────────────────────────────────────────

function ColorList({
  colors,
  value,
  onChange,
}: {
  colors: readonly { value: string; label: string }[]
  value: string | undefined
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <ColorSwatch
          key={c.value}
          color={c.value}
          label={c.label}
          selected={c.value === value}
          onClick={() => onChange(c.value)}
        />
      ))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────

export function OpenPeepsPicker({ currentAvatar, onChange }: OpenPeepsPickerProps) {
  // Initialise from currentAvatar or reasonable defaults
  const [body, setBody] = useState<string>(currentAvatar?.body ?? 'Tee')
  const [head, setHead] = useState<string>(currentAvatar?.head ?? 'ShortOne')
  const [face, setFace] = useState<string>(currentAvatar?.face ?? 'Smile')
  const [beard, setBeard] = useState<string | undefined>(currentAvatar?.beard)
  const [accessory, setAccessory] = useState<string | undefined>(currentAvatar?.accessory)
  const [skinColor, setSkinColor] = useState<string>(currentAvatar?.skinColor ?? '#D08B5B')
  const [hairColor, setHairColor] = useState<string>(currentAvatar?.hairColor ?? '#1C1C1C')
  const [clothingColor, setClothingColor] = useState<string>(currentAvatar?.clothingColor ?? '#8FA7DF')

  // Sync changes upward
  useEffect(() => {
    onChange({
      body,
      head,
      face,
      beard,
      accessory,
      skinColor,
      hairColor,
      clothingColor,
    })
  }, [body, head, face, beard, accessory, skinColor, hairColor, clothingColor, onChange])

  // Get valid body names from the EffigyBodies config export
  const bodyNames = useMemo(() => Object.keys(EffigyBodies), [])
  const headNames = useMemo(() => Object.keys(Heads), [])
  const faceNames = useMemo(() => Object.keys(Faces), [])
  const beardNames = useMemo(() => Object.keys(Beards), [])
  const accessoryNames = useMemo(() => Object.keys(Accessories), [])

  return (
    <div className="space-y-3">
      {/* Live preview */}
      <div className="flex justify-center">
        <div className="rounded-xl bg-card border border-border-subtle p-3">
          <Effigy
            body={{ type: body, options: { skinColor, topColor: clothingColor, blazerColor: clothingColor, outlineColor: '#000' } }}
            head={{ type: head, options: { outlineColor: hairColor, skinColor } }}
            face={{ type: face, options: { outlineColor: '#000' } }}
            beard={beard ? { type: beard, options: { outlineColor: hairColor } } : undefined}
            accessory={accessory ? { type: accessory, options: { outlineColor: clothingColor } } : undefined}
            style={{ width: 120, height: 144 }}
          />
        </div>
      </div>

      {/* Part selectors — 3 columns on wider screens */}
      <div className="grid grid-cols-3 gap-2">
        <PartSelect label="Body" parts={bodyNames} value={body} onChange={(v) => v && setBody(v)} />
        <PartSelect label="Head" parts={headNames} value={head} onChange={(v) => v && setHead(v)} />
        <PartSelect label="Face" parts={faceNames} value={face} onChange={(v) => v && setFace(v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PartSelect
          label="Beard"
          parts={beardNames}
          value={beard}
          onChange={setBeard}
          noneOption="None"
        />
        <PartSelect
          label="Accessory"
          parts={accessoryNames}
          value={accessory}
          onChange={setAccessory}
          noneOption="None"
        />
      </div>

      {/* Color pickers in a 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-medium text-text-tertiary mb-1.5">Skin colour</p>
          <ColorList colors={SKIN_TONES} value={skinColor} onChange={setSkinColor} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-text-tertiary mb-1.5">Hair colour</p>
          <ColorList colors={HAIR_COLORS} value={hairColor} onChange={setHairColor} />
        </div>
      </div>
      <div>
        <p className="text-[11px] font-medium text-text-tertiary mb-1.5">Clothing colour</p>
        <ColorList colors={CLOTHING_COLORS} value={clothingColor} onChange={setClothingColor} />
      </div>
    </div>
  )
}
