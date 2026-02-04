import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './login_page'

describe('LoginPage', () => {
  it('renders login fields and submits successfully', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<LoginPage onLogin={onLogin} />)

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/email/i), 'reader@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(onLogin).toHaveBeenCalledTimes(1)
  })

  it('switches to Sign Up and validates mismatched passwords', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(
      within(screen.getByRole('tablist')).getByRole('button', { name: /sign up/i })
    )

    await user.type(screen.getByLabelText(/username/i), 'reader')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.type(screen.getByLabelText(/confirm password/i), 'secret456')

    const signUpButtons = screen.getAllByRole('button', { name: /^sign up$/i })
    const signUpSubmit = signUpButtons.find(
      (button) => button.getAttribute('type') === 'submit'
    )

    expect(signUpSubmit).toBeTruthy()
    await user.click(signUpSubmit!)

    expect(
      screen.getByText(/passwords do not match/i)
    ).toBeInTheDocument()
  })

  it('submits sign up when passwords match', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<LoginPage onLogin={onLogin} />)

    await user.click(
      within(screen.getByRole('tablist')).getByRole('button', { name: /sign up/i })
    )

    await user.type(screen.getByLabelText(/username/i), 'reader')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.type(screen.getByLabelText(/confirm password/i), 'secret123')

    const signUpButtons = screen.getAllByRole('button', { name: /^sign up$/i })
    const signUpSubmit = signUpButtons.find(
      (button) => button.getAttribute('type') === 'submit'
    )

    expect(signUpSubmit).toBeTruthy()
    await user.click(signUpSubmit!)

    expect(onLogin).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument()
  })
})
