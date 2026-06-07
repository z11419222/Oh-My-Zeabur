import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ErrorBoundary } from './index'

afterEach(() => {
  cleanup()
})

function Boom(): never {
  throw new Error('boom from child')
}

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <span>healthy child</span>
      </ErrorBoundary>,
    )
    expect(screen.getByText('healthy child')).toBeTruthy()
  })

  // P1: a render-time throw is caught and replaced with the fallback UI instead
  // of unmounting the whole tree (the blank screen).
  it('renders the fallback when a child throws during render', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/页面出现异常|Something went wrong/)).toBeTruthy()
    expect(screen.getByText('boom from child')).toBeTruthy()
    consoleError.mockRestore()
  })
})
