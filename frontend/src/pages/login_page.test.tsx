import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './login_page'

describe('LoginPage', () => {
  it('switches to Sign Up and validates mismatched passwords', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(
      within(screen.getByRole('tablist')).getByRole('button', { name: /sign up/i })
    )

    await user.type(screen.getByLabelText(/email/i), 'reader@gmail.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret123')
    await user.type(screen.getByLabelText(/confirm password/i), 'secret456')

    const signUpButtons = screen.getAllByRole('button', { name: /^sign up$/i })
    await user.click(signUpButtons[1])

    expect(
      screen.getByText(/passwords do not match/i)
    ).toBeInTheDocument()
  })
})
