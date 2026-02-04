import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignupPage } from './signup_page'

describe('SignupPage', () => {
  it('renders signup messaging and fields', () => {
    render(<SignupPage />)

    expect(screen.getByText(/create your account/i)).toBeInTheDocument()
    expect(screen.getByText(/sign up to start learning/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('shows validation error when required fields are empty', () => {
    render(<SignupPage />)

    const submitButton = screen.getByRole('button', { name: /sign up/i })
    const form = submitButton.closest('form')
    expect(form).toBeTruthy()
    fireEvent.submit(form!)

    expect(
      screen.getByText(/all fields are required/i)
    ).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/username/i), 'reader')
    await user.type(screen.getByLabelText(/email/i), 'reader@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.type(screen.getByLabelText(/confirm password/i), 'secret124')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(
      screen.getByText(/passwords do not match/i)
    ).toBeInTheDocument()
  })
})
