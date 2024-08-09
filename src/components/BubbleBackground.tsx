import React, { useEffect, useRef } from 'react'

const BubbleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let gradientShift = 0
    const animate = () => {
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
      )

      // Reduced saturation in color stops for a softer pink and purple theme
      gradient.addColorStop(
        0,
        `hsl(300, 60%, ${70 + Math.sin(gradientShift) * 5}%)`
      ) // Soft light pink
      gradient.addColorStop(
        0.5,
        `hsl(320, 50%, ${60 + Math.sin(gradientShift + 1) * 5}%)`
      ) // Soft dark pink
      gradient.addColorStop(
        1,
        `hsl(280, 40%, ${50 + Math.sin(gradientShift + 2) * 5}%)`
      ) // Soft purple

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      gradientShift += 0.02 // Keeping the slow, subtle animation
      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1,
      }}
    />
  )
}

export default BubbleBackground
