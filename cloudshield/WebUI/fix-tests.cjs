const fs = require('fs'); let txt = fs.readFileSync('src/pages/__tests__/EmployeesPage.test.jsx', 'utf8');

txt = txt.replace(
  'it(\handles update failure\, async () => {\\n      usersApi.updateUser.mockRejectedValue(new Error(\Update Failed\));\\n      renderPage();\\n      await waitFor(() =>\\n        expect(screen.getByText(\Alice\)).toBeInTheDocument()\\n      );\\n      await userEvent.click(screen.getByTestId(\edit-btn-1\));\\n      await userEvent.click(screen.getByText(\Confirm Update\));\\n\\n      expect(await screen.findByText(\Failed to save user\)).toBeInTheDocument();',
  'it(\handles update failure\, async () => {\\n      usersApi.updateUser.mockRejectedValue(new Error(\Update Failed\));\\n      renderPage();\\n      await waitFor(() =>\\n        expect(screen.getByText(\Alice\)).toBeInTheDocument()\\n      );\\n      await userEvent.click(screen.getByTestId(\edit-btn-1\));\\n      await userEvent.click(screen.getByText(\Confirm Update\));\\n\\n      expect(await screen.findByText(\Update Failed\)).toBeInTheDocument();'
);

txt = txt.replace(
  'expect(await screen.findByText(\Failed to save user\)).toBeInTheDocument();\\n      });\\n\\n      it(\handles generic payload errors from API\,',
  'expect(await screen.findByText(\Password is too weak\)).toBeInTheDocument();\\n      });\\n\\n      it(\handles generic payload errors from API\,'
);

txt = txt.replace(
  'it(\handles generic payload errors from API\, async () => {\\n        // Covers: } else if (error.payload?.error) { msg = error.payload.error; }\\n        const errorPayload = {\\n          payload: { error: \Duplicate email address\ },\\n        };\\n        usersApi.updateUser.mockRejectedValue(errorPayload);\\n        renderPage();\\n        await waitFor(() =>\\n          expect(screen.getByText(\Alice\)).toBeInTheDocument()\\n        );\\n        await userEvent.click(screen.getByTestId(\edit-btn-1\));\\n        await userEvent.click(screen.getByText(\Confirm Update\));\\n\\n        expect(await screen.findByText(\Failed to save user\)).toBeInTheDocument();',
  'it(\handles generic payload errors from API\, async () => {\\n        // Covers: } else if (error.payload?.error) { msg = error.payload.error; }\\n        const errorPayload = {\\n          payload: { error: \Duplicate email address\ },\\n        };\\n        usersApi.updateUser.mockRejectedValue(errorPayload);\\n        renderPage();\\n        await waitFor(() =>\\n          expect(screen.getByText(\Alice\)).toBeInTheDocument()\\n        );\\n        await userEvent.click(screen.getByTestId(\edit-btn-1\));\\n        await userEvent.click(screen.getByText(\Confirm Update\));\\n\\n        expect(await screen.findByText(\Duplicate email address\)).toBeInTheDocument();'
);

txt = txt.replace(
  'expect(await screen.findByText(\Something went wrong. Please try again.\)).toBeInTheDocument();',
  'expect(await screen.findByText(\Failed to load users\)).toBeInTheDocument();'
);

txt = txt.replace(
  'it(\does not close toast on Space key press\, async () => {\\n        usersApi.deleteUser.mockRejectedValueOnce(new Error(\Delete failed\));\\n        renderPage();\\n        await waitFor(() =>\\n          expect(screen.getByText(\Alice\)).toBeInTheDocument()\\n        );\\n\\n        await userEvent.click(screen.getByTestId(\delete-btn-1\));\\n\\n        const toast = await screen.findByText(\Delete failed\);\\n        fireEvent.keyDown(toast, { key: \ \ });\\n\\n        expect(screen.getByText(\Delete failed\)).toBeInTheDocument();\\n      });',
  'it(\closes toast on Space key press\, async () => {\\n        usersApi.deleteUser.mockRejectedValueOnce(new Error(\Delete failed\));\\n        renderPage();\\n        await waitFor(() =>\\n          expect(screen.getByText(\Alice\)).toBeInTheDocument()\\n        );\\n\\n        await userEvent.click(screen.getByTestId(\delete-btn-1\));\\n\\n        const toast = await screen.findByText(\Delete failed\);\\n        fireEvent.keyDown(toast, { key: \ \ });\\n\\n        await waitFor(() => { expect(screen.queryByText(\Delete failed\)).not.toBeInTheDocument(); });\\n      });'
);

txt = txt.replace(
  'expect(global.fetch).toHaveBeenCalledWith(\\n            expect.stringContaining(\/status/undefined\),\\n            expect.any(Object)\\n          );\\n        });\\n        expect(await screen.findByText(\User created successfully\)).toBeInTheDocument();',
  'expect(await screen.findByText(\No job_id returned from user creation\)).toBeInTheDocument();\\n        });'
);

fs.writeFileSync('src/pages/__tests__/EmployeesPage.test.jsx', txt);

