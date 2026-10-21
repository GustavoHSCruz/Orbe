import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SourceInputMark, SourceRecognition } from './SourceRecognition'

afterEach(cleanup)

describe('source recognition', () => {
  it('shows the available source families before a link is entered', () => {
    render(<SourceRecognition url="" />)
    expect(screen.getByLabelText('Fontes para analisar')).toHaveTextContent(
      'YouTube',
    )
    expect(screen.getByLabelText('Fontes para analisar')).toHaveTextContent(
      'X / Twitter',
    )
    expect(screen.getByLabelText('Fontes para analisar')).toHaveTextContent(
      'Outras fontes',
    )
  })

  it.each([
    ['https://x.com/example/status/1234567890/video/1', 'X / Twitter'],
    ['https://www.instagram.com/reel/example/', 'Instagram'],
    ['https://www.facebook.com/watch?v=123', 'Facebook'],
    ['https://soundcloud.com/artist/track', 'SoundCloud'],
  ])('identifies %s without promising a download', (url, name) => {
    render(<SourceRecognition url={url} compact />)
    expect(screen.getByRole('status')).toHaveTextContent(name)
    expect(screen.getByText('Ainda não analisado')).toBeTruthy()
    expect(screen.getByText(/disponibilidade do vídeo/)).toBeTruthy()
  })

  it('treats an unfamiliar HTTPS host as a source to check', () => {
    render(<SourceRecognition url="https://example.com/video" />)
    expect(screen.getByRole('status')).toHaveTextContent('Outras fontes')
    expect(screen.getByText(/tentará identificar a mídia/)).toBeTruthy()
  })

  it('does not identify links with credentials or an insecure protocol', () => {
    const { rerender } = render(
      <SourceRecognition url="https://user:pass@x.com/status/1234567890" />,
    )
    expect(screen.queryByRole('status')).toBeNull()
    rerender(<SourceRecognition url="http://x.com/status/1234567890" />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows the source mark inside the link field as soon as the host is valid', () => {
    const { container, rerender } = render(<SourceInputMark url="" />)
    expect(container.querySelector('.source-input-mark')).toHaveAttribute(
      'data-active',
      'false',
    )
    rerender(<SourceInputMark url="https://x.com/example/status/1234567890" />)
    expect(container.querySelector('.source-input-mark')).toHaveAttribute(
      'data-active',
      'true',
    )
  })
})
