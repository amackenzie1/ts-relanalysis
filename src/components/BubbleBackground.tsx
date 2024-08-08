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
      gradient.addColorStop(0, `hsl(${(gradientShift + 260) % 360}, 70%, 60%)`) // More saturated purple
      gradient.addColorStop(
        0.5,
        `hsl(${(gradientShift + 320) % 360}, 80%, 50%)`
      ) // Vibrant pink
      gradient.addColorStop(1, `hsl(${(gradientShift + 200) % 360}, 70%, 50%)`) // Brighter blue

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      gradientShift += 0.2 // Adjust the speed of color transition
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
