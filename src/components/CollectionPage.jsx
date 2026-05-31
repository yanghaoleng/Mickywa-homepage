import React, { useEffect, useMemo, useRef, useState } from 'react'
import Matter from 'matter-js'

const circularSourceUrl = 'https://framer.com/m/CircularSpinText-YcSP8m.js@zvujDX1uMUME9lh0LUI0'
const colorSweepSourceUrl = 'https://framer.com/m/ColorSweepWord-DX4iht.js@1aUFiP6LoDEpaX9GVzNP'
const pixelGridSourceUrl = 'https://framer.com/m/PixelGrid-3-cL2xLw.js@n60o80UdtRO6CAHC6Gbw'
const liquidLogoSourceUrl = 'https://framer.com/m/LiquidLogo-O01Xgm.js@TPQx5tLxOgvNPdvn3kgk'
const swissMenuSourceUrl = 'https://framer.com/m/Swiss-Menu-n2DhRS.js@KLuGVY12xpg7WrYlyWOc'
const bubblepitSourceUrl = 'https://framer.com/m/Bubblepit-i92EHG.js@oiIbqiK2wn6jfDV40JFS'
const shinyTextSourceUrl = 'https://framer.com/m/Shiny-Text-SbH0qb.js@9mhi6Dt0fEQsSyIX5zXO'
const circleText = 'JOJO READING ACDEMY • JOJO READING ACDEMY •'
const readingText = '读书好，爱读书，读好书'
const shinyText = 'Deep Thingking'

const calendarStickerImages = [
  '/assets/道具/Rectangle-1.webp',
  '/assets/道具/Rectangle.webp',
  '/assets/道具/五彩窗花.webp',
  '/assets/道具/健身.webp',
  '/assets/道具/大红花.webp',
  '/assets/道具/教堂.webp',
  '/assets/道具/番茄炒蛋.webp',
  '/assets/道具/白色芍药.webp',
  '/assets/道具/马鞭.webp',
  '/assets/道具/黄色法拉利.webp',
  '/assets/道具/宝矿力.webp',
  '/assets/道具/电瓶车.webp',
  '/assets/道具/鹦鹉01.webp',
  '/assets/道具/鹦鹉02.webp',
  '/assets/道具/鹦鹉03.webp',
  '/assets/道具/鹦鹉04.webp',
]

const swissMenuItems = [
  { number: '1', title: '标题一', tagline: '标语一' },
  { number: '2', title: '标题二', tagline: '标语二' },
  { number: '3', title: '标题三', tagline: '标语三' },
  { number: '4', title: '标题四', tagline: '标语四' },
]

const bubbleTextureCache = new Map()

function loadBubbleImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function createBubbleTexture(src, size) {
  const textureKey = `${src}-${size}`
  if (bubbleTextureCache.has(textureKey)) return bubbleTextureCache.get(textureKey)

  const texturePromise = loadBubbleImage(src)
    .then((image) => {
      const canvas = document.createElement('canvas')
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = size * dpr
      canvas.height = size * dpr
      const context = canvas.getContext('2d')
      if (!context) return src

      context.scale(dpr, dpr)
      const center = size / 2
      const radius = center - 1

      context.save()
      context.beginPath()
      context.arc(center, center, radius, 0, Math.PI * 2)
      context.clip()
      const base = context.createRadialGradient(center * 0.42, center * 0.28, 0, center, center, radius)
      base.addColorStop(0, 'rgba(255,255,255,0.72)')
      base.addColorStop(0.36, 'rgba(255,255,255,0.2)')
      base.addColorStop(0.72, 'rgba(30,40,55,0.34)')
      base.addColorStop(1, 'rgba(3,7,13,0.72)')
      context.fillStyle = base
      context.fillRect(0, 0, size, size)

      const imageMax = size * 0.74
      const scale = Math.min(imageMax / image.naturalWidth, imageMax / image.naturalHeight)
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      context.drawImage(image, center - width / 2, center - height / 2, width, height)

      const rim = context.createRadialGradient(center, center, radius * 0.58, center, center, radius)
      rim.addColorStop(0, 'rgba(255,255,255,0)')
      rim.addColorStop(0.52, 'rgba(255,255,255,0.08)')
      rim.addColorStop(0.78, 'rgba(0,0,0,0.34)')
      rim.addColorStop(1, 'rgba(0,0,0,0.68)')
      context.fillStyle = rim
      context.fillRect(0, 0, size, size)
      context.restore()

      context.save()
      context.beginPath()
      context.arc(center, center, radius - 1.5, 0, Math.PI * 2)
      const ring = context.createLinearGradient(0, 0, size, size)
      ring.addColorStop(0, 'rgba(255,255,255,0.9)')
      ring.addColorStop(0.24, 'rgba(210,240,255,0.36)')
      ring.addColorStop(0.62, 'rgba(95,160,230,0.06)')
      ring.addColorStop(1, 'rgba(255,255,255,0.28)')
      context.strokeStyle = ring
      context.lineWidth = Math.max(1.5, size * 0.024)
      context.stroke()
      context.restore()

      context.save()
      context.rotate(-0.18)
      const highlight = context.createRadialGradient(center * 0.66, center * 0.26, 0, center * 0.66, center * 0.26, radius * 0.48)
      highlight.addColorStop(0, 'rgba(255,255,255,0.78)')
      highlight.addColorStop(0.35, 'rgba(255,255,255,0.24)')
      highlight.addColorStop(1, 'rgba(255,255,255,0)')
      context.beginPath()
      context.ellipse(center * 0.66, center * 0.26, radius * 0.42, radius * 0.18, 0, 0, Math.PI * 2)
      context.fillStyle = highlight
      context.fill()
      context.restore()

      return canvas.toDataURL('image/png')
    })
    .catch(() => src)

  bubbleTextureCache.set(textureKey, texturePromise)
  return texturePromise
}

const pixelAnimations = {
  'wave-lr': { delays: [0, 120, 240, 0, 120, 240, 0, 120, 240], duration: 200 },
  'spiral-cw': { delays: [0, 80, 160, 560, 640, 240, 480, 400, 320], duration: 180 },
  'center-out': { delays: [240, 120, 240, 120, 0, 120, 240, 120, 240], duration: 200 },
  prism: {
    delays: [0, 80, 160, 240, 320, 400, 480, 560, 640],
    duration: 160,
    colors: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'magenta', 'pink'],
  },
  aurora: {
    delays: [0, 100, 200, 100, 200, 300, 200, 300, 400],
    duration: 220,
    colors: ['cyan', 'cyan', 'teal', 'teal', 'blue', 'blue', 'purple', 'purple', 'magenta'],
  },
  ember: {
    delays: [0, 80, 160, 560, 640, 240, 480, 400, 320],
    duration: 180,
    colors: ['yellow', 'orange', 'orange', 'orange', 'red', 'red', 'red', 'magenta', 'magenta'],
  },
  frost: {
    delays: [240, 120, 240, 120, 0, 120, 240, 120, 240],
    duration: 200,
    colors: ['blue', 'cyan', 'blue', 'cyan', 'white', 'cyan', 'blue', 'cyan', 'blue'],
  },
}

const pixelColors = {
  cyan: { off: 'oklch(40% 0.08 195 / 0.4)', on: 'oklch(90% 0.2 195)', glow: 'oklch(80% 0.25 195 / 0.9)' },
  magenta: { off: 'oklch(40% 0.08 330 / 0.4)', on: 'oklch(85% 0.25 330)', glow: 'oklch(75% 0.3 330 / 0.9)' },
  yellow: { off: 'oklch(50% 0.08 90 / 0.4)', on: 'oklch(95% 0.2 90)', glow: 'oklch(90% 0.25 90 / 0.9)' },
  green: { off: 'oklch(40% 0.08 145 / 0.4)', on: 'oklch(90% 0.25 145)', glow: 'oklch(80% 0.3 145 / 0.9)' },
  orange: { off: 'oklch(45% 0.08 50 / 0.4)', on: 'oklch(85% 0.22 50)', glow: 'oklch(75% 0.28 50 / 0.9)' },
  blue: { off: 'oklch(40% 0.08 260 / 0.4)', on: 'oklch(80% 0.22 260)', glow: 'oklch(70% 0.28 260 / 0.9)' },
  red: { off: 'oklch(40% 0.08 25 / 0.4)', on: 'oklch(70% 0.25 25)', glow: 'oklch(60% 0.3 25 / 0.9)' },
  purple: { off: 'oklch(40% 0.08 300 / 0.4)', on: 'oklch(75% 0.22 300)', glow: 'oklch(65% 0.28 300 / 0.9)' },
  white: { off: 'oklch(50% 0 0 / 0.3)', on: 'oklch(98% 0 0)', glow: 'oklch(95% 0 0 / 0.8)' },
  teal: { off: 'oklch(40% 0.08 175 / 0.4)', on: 'oklch(82% 0.18 175)', glow: 'oklch(72% 0.24 175 / 0.9)' },
  pink: { off: 'oklch(45% 0.08 350 / 0.4)', on: 'oklch(80% 0.2 350)', glow: 'oklch(70% 0.26 350 / 0.9)' },
}

function CircularTextDemo() {
  const letters = Array.from(circleText)

  return (
    <div className="circular-demo" aria-label="JOJO READING ACDEMY circular spinning text demo">
      <div className="circular-spin-text" style={{ '--letter-count': letters.length }} aria-hidden="true">
        {letters.map((letter, index) => (
          <span
            className="circular-spin-letter"
            style={{ '--letter-angle': `${(360 / letters.length) * index}deg` }}
            key={`${letter}-${index}`}
          >
            {letter}
          </span>
        ))}
      </div>
      <div className="circular-demo-core" aria-hidden="true">
        <span>JOJO</span>
        <strong>READING</strong>
        <span>ACDEMY</span>
      </div>
    </div>
  )
}

function ColorSweepDemo() {
  return (
    <div className="color-sweep-demo" aria-label={`${readingText} color sweep keyword highlight demo`}>
      <div className="color-sweep-line" aria-hidden="true">
        <span className="color-sweep-phrase" style={{ '--token-delay': '0s' }}>
          <span className="color-sweep-word" data-word="读书" style={{ '--sweep-delay': '0s' }}>
            读书
          </span>
          好
        </span>
        <span className="color-sweep-punctuation" style={{ '--token-delay': '0.12s' }}>，</span>
        <span className="color-sweep-phrase" style={{ '--token-delay': '0.2s' }}>
          爱
          <span className="color-sweep-word" data-word="读书" style={{ '--sweep-delay': '0.9s' }}>
            读书
          </span>
        </span>
        <span className="color-sweep-punctuation" style={{ '--token-delay': '0.32s' }}>，</span>
        <span className="color-sweep-phrase" style={{ '--token-delay': '0.4s' }}>
          读
          <span className="color-sweep-word" data-word="好书" style={{ '--sweep-delay': '1.8s' }}>
            好书
          </span>
        </span>
      </div>
    </div>
  )
}

function PixelGrid({ animation = 'wave-lr', color = 'cyan', cellSize = 16, cellGap = 4, borderRadius = 3 }) {
  const config = useMemo(() => pixelAnimations[animation] || pixelAnimations['wave-lr'], [animation])
  const [cellStates, setCellStates] = useState(() => Array(9).fill(false))
  const timersRef = useRef([])
  const cycleTimerRef = useRef(null)
  const runningRef = useRef(false)

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current = []
      if (cycleTimerRef.current) {
        window.clearTimeout(cycleTimerRef.current)
        cycleTimerRef.current = null
      }
    }

    const maxDelay = Math.max(...config.delays)
    const fadeTo = (nextValue, callback) => {
      config.delays.forEach((delay, index) => {
        const timer = window.setTimeout(() => {
          setCellStates((prev) => {
            const next = [...prev]
            next[index] = nextValue
            return next
          })
        }, delay)
        timersRef.current.push(timer)
      })

      cycleTimerRef.current = window.setTimeout(callback, maxDelay + config.duration + 80)
    }

    const cycle = () => {
      if (!runningRef.current) return
      setCellStates(Array(9).fill(false))
      fadeTo(true, () => {
        if (!runningRef.current) return
        fadeTo(false, cycle)
      })
    }

    runningRef.current = true
    cycle()

    return () => {
      runningRef.current = false
      clearTimers()
    }
  }, [config])

  return (
    <div
      className="pixel-grid"
      style={{
        '--pixel-size': `${cellSize}px`,
        '--pixel-gap': `${cellGap}px`,
        '--pixel-radius': `${borderRadius}px`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: 9 }).map((_, index) => {
        const baseColor = pixelColors[color] || pixelColors.cyan
        const isOn = cellStates[index]

        return (
          <span
            className="pixel-grid-cell"
            style={{
              '--pixel-bg': baseColor.on,
              '--pixel-opacity': isOn ? 1 : 0.24,
            }}
            key={index}
          />
        )
      })}
    </div>
  )
}

function PixelGridDemo() {
  return (
    <div className="pixel-grid-demo" aria-label="Three pixel grid animated indicator demo">
      <div className="pixel-grid-orbit" aria-hidden="true">
        <PixelGrid animation="wave-lr" color="cyan" cellSize={12} cellGap={3} borderRadius={2} />
        <PixelGrid animation="center-out" color="cyan" cellSize={12} cellGap={3} borderRadius={2} />
        <PixelGrid animation="spiral-cw" color="cyan" cellSize={12} cellGap={3} borderRadius={2} />
      </div>
      <div className="pixel-grid-main">
        <PixelGrid animation="center-out" color="cyan" cellSize={34} cellGap={8} borderRadius={7} />
      </div>
    </div>
  )
}

function LiquidLogoDemo() {
  return (
    <div className="liquid-logo-demo" aria-label="Mikeywa top logo liquid distortion demo">
      <svg className="liquid-logo-filter-defs" aria-hidden="true" focusable="false">
        <filter id="liquid-logo-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.018" numOctaves="2" seed="12" result="noise">
            <animate
              attributeName="baseFrequency"
              dur="7s"
              repeatCount="indefinite"
              values="0.008 0.018; 0.014 0.014; 0.01 0.022; 0.012 0.018; 0.008 0.018"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G">
            <animate attributeName="scale" dur="4.8s" repeatCount="indefinite" values="3; 8; 5; 6; 3" />
          </feDisplacementMap>
        </filter>
      </svg>
      <div className="liquid-logo-field" aria-hidden="true">
        <span className="liquid-logo-wake liquid-logo-wake-one" />
        <span className="liquid-logo-wake liquid-logo-wake-two" />
        <span className="liquid-logo-wake liquid-logo-wake-three" />
        <div className="liquid-logo-stack">
          <img className="liquid-logo-chroma liquid-logo-chroma-red" src="/assets/mark.svg" alt="" />
          <img className="liquid-logo-chroma liquid-logo-chroma-blue" src="/assets/mark.svg" alt="" />
          <img className="liquid-logo-mark" src="/assets/mark.svg" alt="" />
        </div>
        <img className="liquid-logo-title" src="/assets/title.svg" alt="" />
      </div>
    </div>
  )
}

function SwissMenuDemo() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="swiss-menu-demo" aria-label="Swiss menu translated into Chinese demo">
      <div className={`swiss-menu ${isOpen ? 'swiss-menu-open' : 'swiss-menu-closed'}`}>
        <button className="swiss-menu-button" type="button" onClick={() => setIsOpen((current) => !current)}>
          <span className="swiss-menu-button-icon" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>{isOpen ? '关闭' : '菜单'}</span>
        </button>
        <nav className="swiss-menu-links" aria-label="中文菜单">
          {swissMenuItems.map((item) => (
            <a className="swiss-menu-link" href="#collection" key={item.number}>
              <span className="swiss-menu-copy">
                <span>
                  <span className="swiss-menu-tagline">{item.tagline}</span>
                  <span className="swiss-menu-title">{item.title}</span>
                </span>
              </span>
              <span className="swiss-menu-arrow" aria-hidden="true">
                <span>→</span>
                <span>→</span>
              </span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}

function BubblepitDemo() {
  const sceneRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [bubbleCount, setBubbleCount] = useState(0)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return undefined

    const updateDimensions = () => {
      const nextDimensions = {
        width: Math.round(scene.clientWidth),
        height: Math.round(scene.clientHeight),
      }

      setDimensions((currentDimensions) => {
        if (currentDimensions.width === nextDimensions.width && currentDimensions.height === nextDimensions.height) {
          return currentDimensions
        }

        return nextDimensions
      })
    }

    updateDimensions()
    const observer = new ResizeObserver(updateDimensions)
    observer.observe(scene)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || dimensions.width === 0 || dimensions.height === 0) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timers = []
    let disposed = false

    setBubbleCount(0)
    scene.querySelector('canvas')?.remove()

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: reducedMotion ? 0.55 : 0.95 },
    })
    const render = Matter.Render.create({
      element: scene,
      engine,
      options: {
        width: dimensions.width,
        height: dimensions.height,
        background: 'transparent',
        wireframes: false,
        pixelRatio: Math.min(2, window.devicePixelRatio || 1),
      },
    })
    const runner = Matter.Runner.create()
    const floor = Matter.Bodies.rectangle(dimensions.width / 2, dimensions.height + 48, dimensions.width + 120, 96, {
      isStatic: true,
      render: { visible: false },
    })
    const leftWall = Matter.Bodies.rectangle(-48, dimensions.height / 2, 96, dimensions.height + 180, {
      isStatic: true,
      render: { visible: false },
    })
    const rightWall = Matter.Bodies.rectangle(dimensions.width + 48, dimensions.height / 2, 96, dimensions.height + 180, {
      isStatic: true,
      render: { visible: false },
    })

    Matter.Composite.add(engine.world, [floor, leftWall, rightWall])
    Matter.Render.run(render)
    Matter.Runner.run(runner, engine)

    Object.assign(render.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      cursor: 'crosshair',
    })

    const addBubble = (src, x, y, radius, velocityY = 0) => {
      createBubbleTexture(src, Math.round(radius * 2)).then((texture) => {
        if (disposed) return
        const bubble = Matter.Bodies.circle(x, y, radius, {
          restitution: 0.84,
          friction: 0.04,
          frictionAir: 0.008,
          render: {
            sprite: {
              texture,
              xScale: 1,
              yScale: 1,
            },
          },
        })

        Matter.Body.setVelocity(bubble, {
          x: (Math.random() - 0.5) * 10,
          y: velocityY,
        })
        Matter.Body.setAngularVelocity(bubble, (Math.random() - 0.5) * 0.08)
        Matter.Composite.add(engine.world, bubble)
        setBubbleCount((count) => count + 1)
      })
    }

    const spawnBubble = (x = Math.random() * dimensions.width, y = -80, upward = false) => {
      const isCompact = dimensions.width < 620
      const minRadius = isCompact ? 6 : 8
      const maxRadius = isCompact ? 11 : 15
      const radius = minRadius + Math.random() * (maxRadius - minRadius)
      const src = calendarStickerImages[Math.floor(Math.random() * calendarStickerImages.length)]
      addBubble(src, x, y, radius, upward ? -(9 + Math.random() * 9) : 0)
    }

    const initialCount = reducedMotion ? 24 : dimensions.width < 620 ? 48 : 72
    const spawnDuration = reducedMotion ? 900 : 3600
    for (let index = 0; index < initialCount; index += 1) {
      const timer = window.setTimeout(() => spawnBubble(), (spawnDuration / initialCount) * index)
      timers.push(timer)
    }

    const handlePointerDown = (event) => {
      if (reducedMotion) return
      const rect = render.canvas.getBoundingClientRect()
      for (let index = 0; index < 6; index += 1) {
        spawnBubble(event.clientX - rect.left + (Math.random() - 0.5) * 18, event.clientY - rect.top + (Math.random() - 0.5) * 18, true)
      }
    }

    const handlePointerMove = (event) => {
      if (reducedMotion) return
      const rect = render.canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top
      const bodies = Matter.Composite.allBodies(engine.world).filter((body) => !body.isStatic)

      bodies.forEach((body) => {
        const dx = body.position.x - mouseX
        const dy = body.position.y - mouseY
        const distance = Math.hypot(dx, dy)
        const bodyRadius = Math.sqrt(body.area / Math.PI)
        const influence = bodyRadius * 2.8

        if (distance > 1 && distance < influence) {
          const proximity = 1 - distance / influence
          const strength = proximity * proximity * 0.013 * body.mass
          Matter.Body.applyForce(body, body.position, {
            x: (dx / distance) * strength,
            y: (dy / distance) * strength,
          })
        }
      })
    }

    render.canvas.addEventListener('pointerdown', handlePointerDown)
    render.canvas.addEventListener('pointermove', handlePointerMove)

    return () => {
      disposed = true
      timers.forEach((timer) => window.clearTimeout(timer))
      render.canvas.removeEventListener('pointerdown', handlePointerDown)
      render.canvas.removeEventListener('pointermove', handlePointerMove)
      Matter.Runner.stop(runner)
      Matter.Render.stop(render)
      Matter.Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [dimensions.width, dimensions.height])

  return (
    <div
      className="bubblepit-demo"
      ref={sceneRef}
      data-bubble-count={bubbleCount}
      aria-label="Bubblepit with Mikeywa calendar stickers demo"
    >
      <div className="bubblepit-vignette" aria-hidden="true" />
      <div className="bubblepit-hint" aria-hidden="true">
        <span>点击补泡泡</span>
        <span>鼠标会推开贴纸球</span>
      </div>
    </div>
  )
}

function ShinyTextDemo() {
  return (
    <div className="shiny-text-demo" aria-label={`${shinyText} shiny text demo`}>
      <span className="shiny-text-wrap">
        <span className="shiny-text-base">{shinyText}</span>
      </span>
    </div>
  )
}

function CopySourceButton({ value }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  const fallbackCopy = () => {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus({ preventScroll: true })
    textarea.select()
    textarea.setSelectionRange(0, value.length)
    const didCopy = document.execCommand('copy')
    document.body.removeChild(textarea)
    return didCopy
  }

  const copyValue = async () => {
    try {
      let didCopy = false

      if (navigator.clipboard?.writeText && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(value)
          didCopy = true
        } catch {
          didCopy = false
        }
      }

      if (!didCopy) didCopy = fallbackCopy()
      if (!didCopy) throw new Error('Copy failed')

      setCopied(true)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      className={`collection-copy-button ${copied ? 'collection-copy-button-copied' : ''}`}
      type="button"
      onClick={copyValue}
      aria-label={copied ? '已复制来源链接' : '复制来源链接'}
      title={copied ? '已复制' : '复制链接'}
    >
      <span className="collection-copy-icon" aria-hidden="true" />
    </button>
  )
}

function EffectBlock({ title, sourceUrl, stageClassName = '', children }) {
  return (
    <article className="collection-effect-block">
      <div className="collection-effect-meta">
        <div className="collection-effect-title-row">
          <h2>{title}</h2>
          <CopySourceButton value={sourceUrl} />
        </div>
      </div>
      <div className={`collection-demo-stage ${stageClassName}`}>
        {children}
      </div>
    </article>
  )
}

function CollectionPage() {
  useEffect(() => {
    document.title = '羊石坨坨收藏夹'
  }, [])

  return (
    <main className="collection-page">
      <div className="collection-shell">
        <header className="collection-header">
          <div>
            <p className="collection-kicker">FANCY FRONTEND EFFECTS</p>
            <h1>羊石坨坨收藏夹</h1>
          </div>
        </header>
        <section className="collection-grid" id="collection" aria-label="Frontend effect collection">
          <EffectBlock
            title="文字圈圈"
            sourceUrl={circularSourceUrl}
          >
            <CircularTextDemo />
          </EffectBlock>
          <EffectBlock
            title="扫色高亮词"
            sourceUrl={colorSweepSourceUrl}
            stageClassName="color-sweep-stage"
          >
            <ColorSweepDemo />
          </EffectBlock>
          <EffectBlock
            title="像素网格"
            sourceUrl={pixelGridSourceUrl}
            stageClassName="pixel-grid-stage"
          >
            <PixelGridDemo />
          </EffectBlock>
          <EffectBlock
            title="液态 Logo"
            sourceUrl={liquidLogoSourceUrl}
            stageClassName="liquid-logo-stage"
          >
            <LiquidLogoDemo />
          </EffectBlock>
          <EffectBlock
            title="瑞士菜单"
            sourceUrl={swissMenuSourceUrl}
            stageClassName="swiss-menu-stage"
          >
            <SwissMenuDemo />
          </EffectBlock>
          <EffectBlock
            title="贴纸泡泡坑"
            sourceUrl={bubblepitSourceUrl}
            stageClassName="bubblepit-stage"
          >
            <BubblepitDemo />
          </EffectBlock>
          <EffectBlock
            title="闪光文字"
            sourceUrl={shinyTextSourceUrl}
            stageClassName="shiny-text-stage"
          >
            <ShinyTextDemo />
          </EffectBlock>
        </section>
      </div>
    </main>
  )
}

export default CollectionPage
