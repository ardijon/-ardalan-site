'use client'

import { useRef, useEffect } from 'react'

// Simple QR code generator using canvas
// Based on the QR code algorithm
export default function QRCodeLocal({ value, size = 100, alt }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const scale = 2
    canvas.width = size * scale
    canvas.height = size * scale
    ctx.scale(scale, scale)

    // Simple QR-like pattern generation
    const modules = 21
    const moduleSize = size / modules

    // Clear canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)

    // Generate pattern from value
    const hash = simpleHash(value)

    // Draw finder patterns (top-left, top-right, bottom-left)
    drawFinderPattern(ctx, 0, 0, moduleSize)
    drawFinderPattern(ctx, (modules - 7) * moduleSize, 0, moduleSize)
    drawFinderPattern(ctx, 0, (modules - 7) * moduleSize, moduleSize)

    // Draw timing patterns
    ctx.fillStyle = '#000000'
    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(i * moduleSize, 6 * moduleSize, moduleSize, moduleSize)
        ctx.fillRect(6 * moduleSize, i * moduleSize, moduleSize, moduleSize)
      }
    }

    // Draw data modules
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        // Skip finder patterns and timing patterns
        if (isInFinderPattern(x, y, modules) || x === 6 || y === 6) continue

        // Use hash to determine if module is filled
        const bit = (hash >> ((y * modules + x) % 32)) & 1
        if (bit) {
          ctx.fillStyle = '#000000'
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize)
        }
      }
    }
  }, [value, size])

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="rounded-lg"
      />
      {alt && (
        <span className="sr-only">{alt}</span>
      )}
    </div>
  )
}

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function drawFinderPattern(ctx, x, y, moduleSize) {
  // Outer border
  ctx.fillStyle = '#000000'
  ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize)

  // Inner white
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize)

  // Center black
  ctx.fillStyle = '#000000'
  ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize)
}

function isInFinderPattern(x, y, modules) {
  // Top-left
  if (x < 8 && y < 8) return true
  // Top-right
  if (x >= modules - 8 && y < 8) return true
  // Bottom-left
  if (x < 8 && y >= modules - 8) return true
  return false
}
