import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('starts on the landing screen and navigates to login', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: /vocab track/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /get started/i }))

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
  })
})
