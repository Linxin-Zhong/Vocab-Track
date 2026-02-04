import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignupPage } from './signup_page'

describe('SignupPage', () => {
  it('shows validation error when required fields are empty', async () => {
    render(<SignupPage />)

    const submitButton = screen.getByRole('button', { name: /log in/i })
    const form = submitButton.closest('form')
    expect(form).toBeTruthy()
    fireEvent.submit(form!)

    expect(
      screen.getByText(/email and password are required/i)
    ).toBeInTheDocument()
  })

  it('clears validation error when fields are filled and submitted', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/email/i), 'reader@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(
      screen.queryByText(/email and password are required/i)
    ).not.toBeInTheDocument()
  })
})
