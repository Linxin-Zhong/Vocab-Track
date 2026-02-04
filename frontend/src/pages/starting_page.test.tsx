import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StartingPage } from './starting_page'

describe('StartingPage', () => {
  it('renders the headline, subtitle, and calls onGetStarted', async () => {
    const user = userEvent.setup()
    const onGetStarted = vi.fn()
    render(<StartingPage onGetStarted={onGetStarted} />)

    expect(
      screen.getByRole('heading', { name: /vocab track/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/build your vocabulary through focused, daily practice/i)
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /get started/i }))

    expect(onGetStarted).toHaveBeenCalledTimes(1)
  })

})
